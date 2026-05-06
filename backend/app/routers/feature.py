from elasticsearch import Elasticsearch
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.dependencies.db import get_db
from app.dependencies.es import get_es
from app.schemas.feature import FeatureCreate, FeatureResponse
from app.services.feature_service import create_feature, list_features
from app.services.index_service import sync_feature
from app.routers import automation
from app.models.config import RedmineConfig
from app.services.redmine_service import get_redmine_projects, get_redmine_trackers, test_redmine_connection, create_redmine_issue, get_redmine_priorities
from app.models.dojo import DojoFinding
from app.models.automation import DojoRedmineMap, AutomationRule
from datetime import datetime

router = APIRouter()

router.include_router(automation.router)

@router.get("", response_model=list[FeatureResponse])
def get_features(db: Session = Depends(get_db)) -> list[FeatureResponse]:
    return list_features(db)


@router.post("", response_model=FeatureResponse, status_code=201)
def post_feature(
    payload: FeatureCreate,
    db: Session = Depends(get_db),
    es: Elasticsearch = Depends(get_es),
) -> FeatureResponse:
    feature = create_feature(db, payload)

    try:
        sync_feature(es, feature)
    except Exception:
        pass

    return feature

# --- Redmine Config Endpoints ---

class RedmineConfigPayload(BaseModel):
    enabled: bool = False
    enable_automation: bool = False
    url: str = ""
    api_key: str = ""
    project_id: str = ""
    tracker_id: int | None = None
    default_assignee_id: int | None = None
    auto_close_resolved_ticket: bool = False

@router.get("/redmine/config")
def get_redmine_config(db: Session = Depends(get_db)):
    config = db.query(RedmineConfig).first()
    if not config:
        return RedmineConfigPayload()
    
    # Return masked API key if exists
    api_key = config.api_key
    if api_key:
        api_key = "*" * 8

    return {
        "enabled": config.enabled,
        "enable_automation": config.enable_automation,
        "url": config.url,
        "api_key": api_key,
        "project_id": config.project_id,
        "tracker_id": config.tracker_id,
        "default_assignee_id": config.default_assignee_id,
        "auto_close_resolved_ticket": config.auto_close_resolved_ticket
    }

@router.post("/redmine/save-config")
def save_redmine_config(payload: RedmineConfigPayload, db: Session = Depends(get_db)):
    config = db.query(RedmineConfig).first()
    
    if not config:
        config = RedmineConfig()
        db.add(config)
        
    config.enabled = payload.enabled
    config.enable_automation = payload.enable_automation
    config.url = payload.url
    
    # Only update API key if it's not masked
    if payload.api_key and payload.api_key != "********":
        config.api_key = payload.api_key
        
    config.project_id = str(payload.project_id) if payload.project_id else ""
    config.tracker_id = payload.tracker_id
    config.default_assignee_id = payload.default_assignee_id
    config.auto_close_resolved_ticket = payload.auto_close_resolved_ticket
    
    db.commit()
    return {"status": "success", "message": "Redmine configuration saved successfully"}

@router.get("/redmine/projects")
def load_redmine_projects(url: str = None, api_key: str = None, db: Session = Depends(get_db)):
    config = db.query(RedmineConfig).first()
    final_url = url if url else (config.url if config else None)
    final_api_key = api_key if api_key and api_key != "********" else (config.api_key if config else None)
    
    if not final_url or not final_api_key:
        raise HTTPException(status_code=400, detail="Missing Redmine credentials")
        
    projects = get_redmine_projects(final_url, final_api_key)
    return projects

@router.get("/redmine/trackers")
def load_redmine_trackers(url: str = None, api_key: str = None, db: Session = Depends(get_db)):
    config = db.query(RedmineConfig).first()
    final_url = url if url else (config.url if config else None)
    final_api_key = api_key if api_key and api_key != "********" else (config.api_key if config else None)
    
    if not final_url or not final_api_key:
        raise HTTPException(status_code=400, detail="Missing Redmine credentials")
        
    trackers = get_redmine_trackers(final_url, final_api_key)
    return trackers

@router.post("/redmine/test")
def api_test_redmine(payload: dict, db: Session = Depends(get_db)):
    url = payload.get("url")
    api_key = payload.get("api_key")
    
    config = db.query(RedmineConfig).first()
    final_url = url if url else (config.url if config else None)
    final_api_key = api_key if api_key and api_key != "********" else (config.api_key if config else None)
    
    if not final_url or not final_api_key:
        raise HTTPException(status_code=400, detail="Missing Redmine credentials")
        
    result = test_redmine_connection(final_url, final_api_key)
    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@router.post("/redmine/run")
def run_redmine_sync(db: Session = Depends(get_db)):
    config = db.query(RedmineConfig).first()
    if not config or not config.url or not config.api_key:
        raise HTTPException(status_code=400, detail="Missing Redmine credentials")
        
    rule = db.query(AutomationRule).first()
    if not rule:
        rule_actions = {"Critical": "Send Immediately", "High": "Send Immediately", "Medium": "Ignore", "Low": "Ignore", "Info": "Ignore"}
    else:
        rule_actions = rule.severity_rules
        
    findings = db.query(DojoFinding).filter(DojoFinding.active == True).all()
    
    # Fetch priorities from Redmine to map exact names
    redmine_priorities = get_redmine_priorities(config.url, config.api_key)
    priority_name_to_id = {p["name"].lower(): p["id"] for p in redmine_priorities}
    
    created = 0
    updated = 0
    failed = 0
    logs = [{"time": datetime.now().strftime("%H:%M:%S"), "msg": "Started automation run"}]
    results = []
    
    logs.append({"time": datetime.now().strftime("%H:%M:%S"), "msg": f"{len(findings)} findings found in local database"})
    
    for finding in findings:
        action = rule_actions.get(finding.severity, "Ignore") if isinstance(rule_actions, dict) else "Ignore"
        if action != "Send Immediately":
            continue
            
        cve_or_title = finding.cve or finding.title or f"FINDING-{finding.id}"
        ip = finding.ip or "NO-IP"
        port = str(finding.port) if finding.port else "NO-PORT"
        
        # Use finding.id as the strict unique identifier to ensure 1 Finding = 1 Ticket
        composite_key = f"FINDING_{finding.id}"
        
        existing_map = db.query(DojoRedmineMap).filter_by(composite_key=composite_key).first()
        
        if existing_map:
            updated += 1
            logs.append({"time": datetime.now().strftime("%H:%M:%S"), "msg": f"Updated ticket #{existing_map.redmine_issue_id}"})
            results.append({
                "id": str(finding.id),
                "cve": cve_or_title,
                "ip": ip,
                "port": port,
                "action": "Updated",
                "ticket": f"#{existing_map.redmine_issue_id}",
                "status": "Success"
            })
        else:
            redmine_config_dict = {
                "redmine_url": config.url,
                "redmine_api_key": config.api_key,
                "redmine_project_id": config.project_id,
                "redmine_tracker_id": config.tracker_id
            }
            
            # Map EXACT name between DefectDojo Severity and Redmine Priority
            target_priority_id = priority_name_to_id.get(finding.severity.lower())
            
            alert_data = {
                "title": f"[{finding.severity.upper()}] {cve_or_title} on {ip}:{port}",
                "use_case": "DefectDojo Vulnerability",
                "severity": finding.severity,
                "source_ip": ip,
                "description": finding.description or "No description",
                "details": f"Finding Title: {finding.title}\nCVE: {cve_or_title}\nCVSS: {finding.cvss}\nPort: {port}\nStatus: {finding.status}\nSource: DefectDojo",
                "priority_id": target_priority_id
            }
            
            try:
                res = create_redmine_issue(redmine_config_dict, alert_data)
                if res and "issue" in res:
                    issue_id = res["issue"]["id"]
                    
                    new_map = DojoRedmineMap(
                        finding_id=finding.id,
                        redmine_issue_id=issue_id,
                        composite_key=composite_key
                    )
                    db.add(new_map)
                    db.commit()
                    
                    created += 1
                    logs.append({"time": datetime.now().strftime("%H:%M:%S"), "msg": f"Created ticket #{issue_id}"})
                    results.append({
                        "id": str(finding.id),
                        "cve": cve_or_title,
                        "ip": ip,
                        "port": port,
                        "action": "Created",
                        "ticket": f"#{issue_id}",
                        "status": "Success"
                    })
                else:
                    failed += 1
                    logs.append({"time": datetime.now().strftime("%H:%M:%S"), "msg": f"Failed to create ticket for {cve_or_title}"})
                    results.append({
                        "id": str(finding.id),
                        "cve": cve_or_title,
                        "ip": ip,
                        "port": port,
                        "action": "Failed",
                        "ticket": "-",
                        "status": "Error"
                    })
            except Exception as e:
                failed += 1
                logs.append({"time": datetime.now().strftime("%H:%M:%S"), "msg": f"Error: {str(e)}"})
                results.append({
                    "id": str(finding.id),
                    "cve": cve_or_title,
                    "ip": ip,
                    "port": port,
                    "action": "Failed",
                    "ticket": "-",
                    "status": "Error"
                })

    logs.append({"time": datetime.now().strftime("%H:%M:%S"), "msg": "Completed successfully"})
    
    return {
        "success": True,
        "total": created + updated + failed,
        "created": created,
        "updated": updated,
        "failed": failed,
        "logs": logs,
        "results": results
    }
