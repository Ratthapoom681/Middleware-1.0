from datetime import datetime, timedelta, timezone
import logging
from typing import Any

from sqlalchemy import or_
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.models.wazuh import WazuhAlert
from app.models.config import DetectionConfig
from app.models.detection import DetectionAlert
from app.services.issue_service import create_detection_issue


def _nested_get(payload: dict[str, Any], *paths: str) -> Any:
    for path in paths:
        value: Any = payload
        for part in path.split("."):
            if not isinstance(value, dict) or part not in value:
                value = None
                break
            value = value[part]

        if value not in (None, ""):
            return value

    return None


def _normalise_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip().strip('"').lower()


def _normalise_port(value: Any) -> int | None:
    if value is None:
        return None

    try:
        return int(str(value).strip().strip('"'))
    except (TypeError, ValueError):
        return None


def _setting_int(settings: dict[str, Any], key: str, default: int) -> int:
    try:
        return int(settings.get(key, default))
    except (TypeError, ValueError):
        return default


def _setting_ports(settings: dict[str, Any], key: str, default: list[int]) -> set[int]:
    value = settings.get(key, default)
    if not isinstance(value, list):
        value = default

    return {port for port in (_normalise_port(item) for item in value) if port is not None}


def _json_text(*path: str):
    expression = WazuhAlert.full_payload
    for part in path:
        expression = expression[part]
    return expression.as_string()


def _srcip_filter(srcip: str):
    return or_(
        _json_text("data", "srcip") == srcip,
        _json_text("data", "ip") == srcip,
        _json_text("srcip") == srcip,
    )


def _user_filter(user: str):
    return or_(
        _json_text("data", "user") == user,
        _json_text("data", "dstuser") == user,
        _json_text("data", "srcuser") == user,
        _json_text("user") == user,
    )


def _extract_srcip(payload: dict[str, Any]) -> str | None:
    value = _nested_get(payload, "data.srcip", "data.ip", "srcip")
    return str(value).strip() if value else None


def _extract_dstip(payload: dict[str, Any]) -> str | None:
    value = _nested_get(payload, "data.dstip", "dstip")
    return str(value).strip() if value else None


def _extract_devname(payload: dict[str, Any]) -> str | None:
    value = _nested_get(payload, "data.devname", "agent.name", "manager.name", "devname")
    return str(value).strip() if value else None


def _extract_devid(payload: dict[str, Any]) -> str | None:
    value = _nested_get(payload, "data.devid", "agent.id", "devid")
    return str(value).strip() if value else None


def _extract_user(payload: dict[str, Any]) -> str | None:
    value = _nested_get(payload, "data.user", "data.dstuser", "data.srcuser", "user")
    return str(value).strip() if value else None


def _extract_country(payload: dict[str, Any]) -> str | None:
    value = _nested_get(
        payload,
        "GeoLocation.country_name",
        "GeoLocation.country",
        "data.geoip.country_name",
        "data.geoip.country",
        "geoip.country_name",
        "geoip.country",
    )
    return str(value).strip() if value else None


def _extract_dstport(payload: dict[str, Any]) -> int | None:
    return _normalise_port(_nested_get(payload, "data.dstport", "data.destination_port", "dstport"))


def _extract_protocol(payload: dict[str, Any]) -> str | None:
    value = _nested_get(payload, "data.protocol", "data.proto", "protocol")
    return str(value).strip().strip('"') if value else None


def _is_failed_login(payload: dict[str, Any]) -> bool:
    data = payload.get("data", {})
    rule = payload.get("rule") or {}

    status = _normalise_text(_nested_get(payload, "data.status", "status"))
    action = _normalise_text(_nested_get(payload, "data.action", "action"))
    searchable_text = " ".join(
        [
            status,
            action,
            _normalise_text(_nested_get(payload, "data.event_type", "event_type")),
            _normalise_text(_nested_get(payload, "data.logdesc")),
            _normalise_text(_nested_get(payload, "data.reason")),
            _normalise_text(_nested_get(payload, "data.msg")),
            _normalise_text(payload.get("full_log")),
            _normalise_text(rule.get("description")),
            " ".join(_normalise_text(group) for group in (rule.get("groups") or [])),
        ]
    )

    has_login_context = action == "login" or "login" in searchable_text or "auth" in searchable_text
    has_failure_context = status in {"failed", "failure", "fail", "denied", "invalid"} or any(
        token in searchable_text for token in ("failed", "failure", "invalid", "denied", "authentication_failed")
    )
    return has_login_context and has_failure_context and isinstance(data, dict)


def _is_successful_login(payload: dict[str, Any]) -> bool:
    rule = payload.get("rule") or {}
    status = _normalise_text(_nested_get(payload, "data.status", "status"))
    action = _normalise_text(_nested_get(payload, "data.action", "action"))
    searchable_text = " ".join(
        [
            status,
            action,
            _normalise_text(_nested_get(payload, "data.event_type", "event_type")),
            _normalise_text(_nested_get(payload, "data.logdesc")),
            _normalise_text(_nested_get(payload, "data.msg")),
            _normalise_text(payload.get("full_log")),
            _normalise_text(rule.get("description")),
            " ".join(_normalise_text(group) for group in (rule.get("groups") or [])),
        ]
    )

    has_login_context = action == "login" or "login" in searchable_text or "auth" in searchable_text
    has_success_context = status in {"success", "successful", "succeeded", "accepted"} or any(
        token in searchable_text for token in ("success", "successful", "logged in", "login succeeded", "accepted")
    )
    return has_login_context and has_success_context


def evaluate_detections(
    db: Session,
    current_alert: WazuhAlert,
    create_external_issue: bool = True,
) -> int:
    """
    Evaluates the incoming WazuhAlert against the 4 configured detection use cases.
    If a use case triggers, a DetectionAlert is created.
    """
    alerts_triggered = 0
    
    # Get detection config
    config_row = db.query(DetectionConfig).first()
    settings = config_row.settings if config_row else {}
    settings = settings or {}
    
    # Extract detection-specific settings with defaults.
    # brute_force_threshold follows the use case wording: failed logins > threshold.
    brute_force_timeframe_sec = _setting_int(settings, "brute_force_timeframe_sec", 60)
    brute_force_threshold = _setting_int(settings, "brute_force_threshold", 5)
    abnormal_ports = _setting_ports(settings, "abnormal_ports", [4444, 1337])
    impossible_travel_timeframe_sec = _setting_int(settings, "impossible_travel_timeframe_sec", 3600)
    port_scan_timeframe_sec = _setting_int(settings, "port_scan_timeframe_sec", 60)
    port_scan_threshold = _setting_int(settings, "port_scan_threshold", 10)
        
    payload = current_alert.full_payload
    
    srcip = _extract_srcip(payload)
    dstip = _extract_dstip(payload)
    devname = _extract_devname(payload)
    devid = _extract_devid(payload)
    dstport_int = _extract_dstport(payload)
    user = _extract_user(payload)
    country_name = _extract_country(payload)
    protocol = _extract_protocol(payload)

    current_time = current_alert.timestamp or datetime.now(timezone.utc)
    
    # --- 1. Brute Force / Excessive Login Failures ---
    # Trigger condition: More than threshold failed attempts within timeframe from same srcip.
    if srcip and _is_failed_login(payload):
        time_limit = current_time - timedelta(seconds=brute_force_timeframe_sec)

        candidate_alerts = db.query(WazuhAlert).filter(
            WazuhAlert.id != current_alert.id,
            WazuhAlert.timestamp >= time_limit,
            WazuhAlert.timestamp <= current_time,
            _srcip_filter(srcip),
        ).all()
        failed_count = sum(1 for alert in candidate_alerts if _is_failed_login(alert.full_payload)) + 1

        if failed_count > brute_force_threshold:
            if _create_alert(
                db, 
                title="Brute Force Login Detected",
                description=f"Detected {failed_count} failed logins from {srcip} within {brute_force_timeframe_sec} seconds.",
                use_case="Brute Force",
                severity="high",
                source_ip=srcip,
                details={
                    "srcip": srcip,
                    "dstip": dstip,
                    "devname": devname,
                    "devid": devid,
                    "user": user,
                    "failed_count": failed_count,
                    "threshold": brute_force_threshold,
                    "timeframe_sec": brute_force_timeframe_sec,
                    "trigger": "failed_count > threshold",
                    "source_alert_id": current_alert.id,
                },
                create_external_issue=create_external_issue,
            ):
                alerts_triggered += 1

    # --- 2. Abnormal Network Connection ---
    # Trigger condition: dstport in abnormal_ports list
    if dstport_int is not None and dstport_int in abnormal_ports:
        if _create_alert(
            db,
            title="Abnormal Network Connection",
            description=f"Connection detected to unusual port {dstport_int}.",
            use_case="Abnormal Network Connection",
            severity="critical",
            source_ip=srcip,
            details={
                "srcip": srcip,
                "dstip": dstip,
                "devname": devname,
                "devid": devid,
                "dstport": dstport_int,
                "protocol": protocol,
                "source_alert_id": current_alert.id,
            },
            create_external_issue=create_external_issue,
        ):
            alerts_triggered += 1

    # --- 3. Impossible Travel ---
    # Trigger condition: Same user logs in from two different countries within timeframe
    if user and country_name and _is_successful_login(payload):
        time_limit = current_time - timedelta(seconds=impossible_travel_timeframe_sec)

        previous_logins = db.query(WazuhAlert).filter(
            WazuhAlert.id != current_alert.id,
            WazuhAlert.timestamp >= time_limit,
            WazuhAlert.timestamp <= current_time,
            _user_filter(user),
        ).all()

        previous_login = next(
            (
                alert
                for alert in previous_logins
                if _is_successful_login(alert.full_payload)
                and _extract_country(alert.full_payload)
                and _normalise_text(_extract_country(alert.full_payload)) != _normalise_text(country_name)
            ),
            None,
        )

        if previous_login:
            prev_country = _extract_country(previous_login.full_payload)
            if _create_alert(
                db,
                title="Impossible Travel Detected",
                description=f"User '{user}' logged in from {country_name} and previously from {prev_country} within {impossible_travel_timeframe_sec} seconds.",
                use_case="Impossible Travel",
                severity="high",
                source_ip=srcip,
                details={
                    "user": user,
                    "srcip": srcip,
                    "dstip": dstip,
                    "devname": devname,
                    "devid": devid,
                    "current_country": country_name,
                    "current_timestamp": current_time.isoformat(),
                    "previous_country": prev_country,
                    "previous_srcip": _extract_srcip(previous_login.full_payload),
                    "previous_timestamp": previous_login.timestamp.isoformat() if previous_login.timestamp else None,
                    "timeframe_sec": impossible_travel_timeframe_sec,
                    "source_alert_id": current_alert.id,
                    "previous_source_alert_id": previous_login.id,
                },
                create_external_issue=create_external_issue,
            ):
                alerts_triggered += 1

    # --- 4. Port Scan Detection ---
    # Trigger condition: Connections to multiple ports from same srcip within short timeframe
    if srcip and dstport_int is not None:
        time_limit = current_time - timedelta(seconds=port_scan_timeframe_sec)

        candidate_alerts = db.query(WazuhAlert).filter(
            WazuhAlert.timestamp >= time_limit,
            WazuhAlert.timestamp <= current_time,
            _srcip_filter(srcip),
        ).all()
        distinct_ports = {
            port
            for port in (_extract_dstport(alert.full_payload) for alert in candidate_alerts)
            if port is not None
        }
        distinct_ports.add(dstport_int)

        if len(distinct_ports) >= port_scan_threshold:
            if _create_alert(
                db,
                title="Port Scan Detected",
                description=f"Source IP {srcip} connected to {len(distinct_ports)} distinct ports within {port_scan_timeframe_sec} seconds.",
                use_case="Port Scan",
                severity="high",
                source_ip=srcip,
                details={
                    "srcip": srcip,
                    "dstip": dstip,
                    "devname": devname,
                    "devid": devid,
                    "distinct_port_count": len(distinct_ports),
                    "sample_ports": sorted(distinct_ports)[:20],
                    "threshold": port_scan_threshold,
                    "timeframe_sec": port_scan_timeframe_sec,
                    "source_alert_id": current_alert.id,
                },
                create_external_issue=create_external_issue,
            ):
                alerts_triggered += 1

    if alerts_triggered == 0:
        logger.info(f"Evaluated Wazuh alert {current_alert.id} against detection rules: No suspicious activity found.")
    else:
        logger.warning(f"Evaluated Wazuh alert {current_alert.id}: Triggered {alerts_triggered} detection(s)!")

    return alerts_triggered


def _has_detection_for_source_alert(
    db: Session,
    use_case: str,
    source_ip: str | None,
    source_alert_id: Any,
) -> bool:
    query = db.query(DetectionAlert).filter(DetectionAlert.use_case == use_case)
    if source_ip:
        query = query.filter(DetectionAlert.source_ip == source_ip)

    source_alert_id_text = str(source_alert_id)
    return any(
        str((alert.details or {}).get("source_alert_id")) == source_alert_id_text
        for alert in query.all()
    )


def _create_alert(
    db: Session,
    title: str,
    description: str,
    use_case: str,
    severity: str,
    source_ip: str | None,
    details: dict[str, Any],
    create_external_issue: bool = True,
) -> bool:
    source_alert_id = details.get("source_alert_id")
    if source_alert_id is not None and _has_detection_for_source_alert(db, use_case, source_ip, source_alert_id):
        logger.info(
            "Skipping duplicate detection alert for use_case=%s source_alert_id=%s",
            use_case,
            source_alert_id,
        )
        return False

    # Create the alert in our local database
    new_alert = DetectionAlert(
        title=title,
        description=description,
        use_case=use_case,
        severity=severity,
        source_ip=source_ip,
        details=details
    )
    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)

    create_detection_issue(
        db,
        {
            "title": title,
            "description": description,
            "use_case": use_case,
            "severity": severity,
            "source_ip": source_ip,
            "target": details.get("devname") or details.get("dstip"),
            "details": details,
        },
        create_external_issue=create_external_issue,
    )

    return True
