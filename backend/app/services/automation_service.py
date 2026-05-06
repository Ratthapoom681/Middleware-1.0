import logging
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import httpx

from app.models.config import RedmineConfig
from app.models.dojo import DojoFinding
from app.models.automation import DojoRedmineMap, AutomationRule, SchedulerJob, TicketAuditLog, SyncHistory
from app.services.redmine_service import create_redmine_issue

logger = logging.getLogger(__name__)

def run_automation(db: Session):
    config = db.query(RedmineConfig).first()
    if not config or not config.enable_automation:
        logger.info("Automation is disabled or not configured.")
        return

    rule = db.query(AutomationRule).first()
    if not rule:
        logger.info("No automation rules found. Skipping.")
        return

    job = db.query(SchedulerJob).filter_by(name="dojo_redmine_sync").first()
    if job:
        job.status = "running"
        job.last_run = datetime.now(timezone.utc)
        db.commit()

    try:
        # Fetch findings
        findings = db.query(DojoFinding).filter(DojoFinding.active == True).all()
        
        total_fetched = len(findings)
        matched_rules = 0
        tickets_created = 0
        tickets_updated = 0
        errors = 0

        for finding in findings:
            action = rule.severity_rules.get(finding.severity, "Ignore")
            if action != "Send Immediately":
                continue
            
            matched_rules += 1

            # Composite Key: CVE + IP + Port
            cve = finding.cve or "NO-CVE"
            ip = finding.ip or "NO-IP"
            port = str(finding.port) if finding.port else "NO-PORT"
            composite_key = f"{cve}_{ip}_{port}"

            existing_map = db.query(DojoRedmineMap).filter_by(composite_key=composite_key).first()

            if existing_map:
                # Update logic (Not fully implemented here, would just add a comment or update issue)
                tickets_updated += 1
            else:
                redmine_config_dict = {
                    "redmine_url": config.url,
                    "redmine_api_key": config.api_key,
                    "redmine_project_id": config.project_id,
                    "redmine_tracker_id": config.tracker_id
                }
                alert_data = {
                    "title": f"[{finding.severity.upper()}] {cve} on {ip}:{port}",
                    "use_case": "DefectDojo Vulnerability",
                    "severity": finding.severity,
                    "source_ip": ip,
                    "description": finding.description or "No description",
                    "details": f"Finding Title: {finding.title}\nCVE: {cve}\nCVSS: {finding.cvss}\nPort: {port}\nStatus: {finding.status}\nSource: DefectDojo"
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

                        audit_log = TicketAuditLog(
                            redmine_issue_id=issue_id,
                            finding_id=finding.id,
                            status="Matched",
                            details="Ticket created successfully"
                        )
                        db.add(audit_log)

                        tickets_created += 1
                        db.commit()
                except Exception as e:
                    logger.error(f"Failed to sync finding {finding.id}: {e}")
                    errors += 1

        history = SyncHistory(
            total_fetched=total_fetched,
            matched_rules=matched_rules,
            tickets_created=tickets_created,
            tickets_updated=tickets_updated,
            errors=errors,
            log_text="Sync completed successfully"
        )
        db.add(history)
        db.commit()

        if job:
            job.status = "idle"
            db.commit()

    except Exception as e:
        logger.error(f"Automation engine error: {e}")
        if job:
            job.status = "error"
            db.commit()
