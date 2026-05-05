import httpx
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

def create_redmine_issue(redmine_config: Dict[str, Any], alert_data: Dict[str, Any]):
    """
    Creates an issue in Redmine based on the provided configuration and alert data.
    """
    url = redmine_config.get("redmine_url")
    api_key = redmine_config.get("redmine_api_key")
    project_id = redmine_config.get("redmine_project_id")
    tracker_id = redmine_config.get("redmine_tracker_id")

    if not all([url, api_key, project_id]):
        logger.warning("Redmine integration enabled but missing configuration (URL, API Key, or Project ID).")
        return

    # Ensure URL doesn't have trailing slash for consistency
    url = url.rstrip("/")
    endpoint = f"{url}/issues.json"

    # Construct the Redmine issue payload
    issue_payload = {
        "issue": {
            "project_id": project_id,
            "subject": f"[Security Alert] {alert_data.get('title')}",
            "description": (
                f"**Use Case:** {alert_data.get('use_case')}\n"
                f"**Severity:** {alert_data.get('severity')}\n"
                f"**Source IP:** {alert_data.get('source_ip')}\n\n"
                f"**Description:**\n{alert_data.get('description')}\n\n"
                f"**Details:**\n{alert_data.get('details')}"
            ),
            "priority_id": _map_severity_to_priority(alert_data.get("severity")),
        }
    }
    
    if tracker_id:
        issue_payload["issue"]["tracker_id"] = tracker_id

    headers = {
        "X-Redmine-API-Key": api_key,
        "Content-Type": "application/json"
    }

    try:
        response = httpx.post(endpoint, json=issue_payload, headers=headers, timeout=10.0)
        response.raise_for_status()
        logger.info(f"Successfully created Redmine issue for alert: {alert_data.get('title')}")
        return response.json()
    except Exception as e:
        logger.error(f"Failed to create Redmine issue: {str(e)}")
        return None

def _map_severity_to_priority(severity: str) -> int:
    """
    Maps our internal severity levels to Redmine priority IDs.
    Redmine defaults: 1: Low, 2: Normal, 3: High, 4: Urgent, 5: Immediate
    """
    severity = str(severity).lower()
    if severity == "critical":
        return 5
    if severity == "high":
        return 3
    if severity == "medium":
        return 2
    return 1
