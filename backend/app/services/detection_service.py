from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.wazuh import WazuhAlert
from app.models.config import DetectionConfig
from app.models.detection import DetectionAlert

def evaluate_detections(db: Session, current_alert: WazuhAlert):
    """
    Evaluates the incoming WazuhAlert against the 4 configured detection use cases.
    If a use case triggers, a DetectionAlert is created.
    """
    # Get config (fallback to defaults if not found)
    config_row = db.query(DetectionConfig).first()
    settings = config_row.settings if config_row else {}
    
    # Extract dynamic settings with defaults
    brute_force_timeframe_sec = settings.get("brute_force_timeframe_sec", 60)
    brute_force_threshold = settings.get("brute_force_threshold", 5)
    abnormal_ports = settings.get("abnormal_ports", [4444, 1337])
    impossible_travel_timeframe_sec = settings.get("impossible_travel_timeframe_sec", 3600)
    port_scan_timeframe_sec = settings.get("port_scan_timeframe_sec", 60)
    port_scan_threshold = settings.get("port_scan_threshold", 10)
        
    payload = current_alert.full_payload
    
    # Safely extract fields
    data = payload.get("data", {})
    rule = payload.get("rule", {})
    
    srcip = data.get("srcip")
    dstip = data.get("dstip")
    dstport = data.get("dstport")
    user = data.get("user")
    
    # Try to extract geoip country name
    geoip = data.get("geoip", {})
    country_name = geoip.get("country_name") if isinstance(geoip, dict) else None
    
    rule_desc = rule.get("description", "").lower()
    
    # Convert dstport to int if possible for comparison
    try:
        dstport_int = int(dstport) if dstport else None
    except ValueError:
        dstport_int = None
        
    current_time = current_alert.timestamp or datetime.now(timezone.utc)
    
    # --- 1. Brute Force / Excessive Login Failures ---
    # Trigger condition: More than threshold failed attempts within timeframe from same srcip
    is_failed_login = "fail" in rule_desc or "invalid" in rule_desc or data.get("status", "").lower() == "failed"
    if srcip and is_failed_login:
        time_limit = current_time - timedelta(seconds=brute_force_timeframe_sec)
        
        # Query count of previous failed logins from this IP within timeframe
        # Using JSON operators to filter
        count = db.query(WazuhAlert).filter(
            WazuhAlert.timestamp >= time_limit,
            WazuhAlert.timestamp < current_time,
            WazuhAlert.full_payload["data"]["srcip"].astext == srcip
        ).count()
        
        # We add 1 for the current alert
        if (count + 1) >= brute_force_threshold:
            _create_alert(
                db, 
                title="Brute Force Login Detected",
                description=f"Detected {count + 1} failed logins from {srcip} within {brute_force_timeframe_sec} seconds.",
                use_case="Brute Force",
                severity="high",
                source_ip=srcip,
                details={"srcip": srcip, "count": count + 1, "threshold": brute_force_threshold}
            )

    # --- 2. Abnormal Network Connection ---
    # Trigger condition: dstport in abnormal_ports list
    if dstport_int is not None and dstport_int in abnormal_ports:
        _create_alert(
            db,
            title="Abnormal Network Connection",
            description=f"Connection detected to unusual port {dstport_int}.",
            use_case="Abnormal Network Connection",
            severity="critical",
            source_ip=srcip,
            details={"srcip": srcip, "dstip": dstip, "dstport": dstport_int, "protocol": data.get("protocol")}
        )

    # --- 3. Impossible Travel ---
    # Trigger condition: Same user logs in from two different countries within timeframe
    is_successful_login = "success" in rule_desc or "logged in" in rule_desc or data.get("status", "").lower() == "success"
    if user and country_name and is_successful_login:
        time_limit = current_time - timedelta(seconds=impossible_travel_timeframe_sec)
        
        # Find previous successful logins for this user in a different country within timeframe
        # Exclude the current country
        previous_login = db.query(WazuhAlert).filter(
            WazuhAlert.timestamp >= time_limit,
            WazuhAlert.timestamp < current_time,
            WazuhAlert.full_payload["data"]["user"].astext == user,
            WazuhAlert.full_payload["data"]["geoip"]["country_name"].astext != country_name,
            WazuhAlert.full_payload["data"]["geoip"]["country_name"].astext.isnot(None)
        ).first()
        
        if previous_login:
            prev_country = previous_login.full_payload.get("data", {}).get("geoip", {}).get("country_name")
            _create_alert(
                db,
                title="Impossible Travel Detected",
                description=f"User '{user}' logged in from {country_name} and previously from {prev_country} within {impossible_travel_timeframe_sec} seconds.",
                use_case="Impossible Travel",
                severity="high",
                source_ip=srcip,
                details={"user": user, "current_country": country_name, "previous_country": prev_country, "srcip": srcip}
            )

    # --- 4. Port Scan Detection ---
    # Trigger condition: Connections to multiple ports from same srcip within short timeframe
    if srcip and dstport_int is not None:
        time_limit = current_time - timedelta(seconds=port_scan_timeframe_sec)
        
        # Count distinct destination ports for this source IP within the timeframe
        distinct_ports = db.query(func.count(func.distinct(WazuhAlert.full_payload["data"]["dstport"].astext))).filter(
            WazuhAlert.timestamp >= time_limit,
            WazuhAlert.timestamp <= current_time,
            WazuhAlert.full_payload["data"]["srcip"].astext == srcip,
            WazuhAlert.full_payload["data"]["dstport"].astext.isnot(None)
        ).scalar() or 0
        
        if distinct_ports >= port_scan_threshold:
            _create_alert(
                db,
                title="Port Scan Detected",
                description=f"Source IP {srcip} connected to {distinct_ports} distinct ports within {port_scan_timeframe_sec} seconds.",
                use_case="Port Scan",
                severity="high",
                source_ip=srcip,
                details={"srcip": srcip, "distinct_ports": distinct_ports, "threshold": port_scan_threshold}
            )


def _create_alert(db: Session, title: str, description: str, use_case: str, severity: str, source_ip: str, details: dict):
    # Optional: check if an identical alert was generated very recently to prevent spam
    # For now, we just insert.
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
