from typing import Any

from sqlalchemy.orm import Session

from app.models.config import RedmineConfig
from app.services.redmine_service import create_redmine_issue


def create_detection_issue(
    db: Session,
    detection: dict[str, Any],
    create_external_issue: bool = True,
) -> dict[str, Any] | None:
    """
    Create an external issue from Detection Engine JSON.

    Expected detection JSON shape:
    {
      "title": str,
      "description": str,
      "use_case": str,
      "severity": str,
      "source_ip": str | None,
      "target": str | None,
      "details": dict
    }
    """
    issue = build_detection_issue(detection)
    return _send_issue(db, issue, create_external_issue=create_external_issue)


def build_detection_issue(detection: dict[str, Any]) -> dict[str, Any]:
    return {
        "source_type": "detection",
        "subject": f"[Detection] {detection.get('use_case')}: {detection.get('title')}",
        "severity": detection.get("severity"),
        "description": _format_detection_description(detection),
        "raw": detection,
    }


def create_defectdojo_issue(
    db: Session,
    finding: dict[str, Any],
    create_external_issue: bool = True,
) -> dict[str, Any] | None:
    """
    Create an external issue from DefectDojo finding JSON.

    This format is intentionally separate from Detection Engine JSON because
    DefectDojo findings usually describe vulnerabilities, products, endpoints,
    CWE/CVE metadata, and remediation guidance rather than event correlations.
    """
    issue = build_defectdojo_issue(finding)
    return _send_issue(db, issue, create_external_issue=create_external_issue)


def build_defectdojo_issue(finding: dict[str, Any]) -> dict[str, Any]:
    title = finding.get("title") or finding.get("name") or "DefectDojo Finding"
    return {
        "source_type": "defectdojo",
        "subject": f"[DefectDojo] {title}",
        "severity": finding.get("severity"),
        "description": _format_defectdojo_description(finding),
        "raw": finding,
    }


def send_normalized_issue(db: Session, issue: dict[str, Any]) -> dict[str, Any] | None:
    return _send_issue(db, issue, create_external_issue=True)


def _send_issue(
    db: Session,
    issue: dict[str, Any],
    create_external_issue: bool,
) -> dict[str, Any] | None:
    if not create_external_issue:
        return None

    redmine_config = db.query(RedmineConfig).first()
    if not redmine_config or not redmine_config.enabled:
        return None

    config_dict = {
        "redmine_url": redmine_config.url,
        "redmine_api_key": redmine_config.api_key,
        "redmine_project_id": redmine_config.project_id,
        "redmine_tracker_id": redmine_config.tracker_id,
    }
    return create_redmine_issue(config_dict, issue)


def _format_detection_description(detection: dict[str, Any]) -> str:
    return "\n".join(
        [
            "**Source Type:** Detection Engine",
            f"**Use Case:** {detection.get('use_case')}",
            f"**Severity:** {detection.get('severity')}",
            f"**Source IP:** {detection.get('source_ip')}",
            f"**Target:** {detection.get('target')}",
            "",
            "**Description:**",
            str(detection.get("description") or "-"),
            "",
            "**Detection Details:**",
            str(detection.get("details") or {}),
        ]
    )


def _format_defectdojo_description(finding: dict[str, Any]) -> str:
    return "\n".join(
        [
            "**Source Type:** DefectDojo",
            f"**Severity:** {finding.get('severity')}",
            f"**Product:** {finding.get('product_name') or finding.get('product')}",
            f"**Engagement:** {finding.get('engagement_name') or finding.get('engagement')}",
            f"**Endpoint:** {finding.get('endpoint') or finding.get('endpoints')}",
            f"**CWE:** {finding.get('cwe')}",
            f"**CVE:** {finding.get('cve') or finding.get('vuln_id_from_tool')}",
            "",
            "**Description:**",
            str(finding.get("description") or "-"),
            "",
            "**Mitigation:**",
            str(finding.get("mitigation") or "-"),
            "",
            "**References:**",
            str(finding.get("references") or "-"),
        ]
    )
