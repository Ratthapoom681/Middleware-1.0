from datetime import datetime
from typing import Any, Optional

from elasticsearch import Elasticsearch
from sqlalchemy.orm import Session

from app.models.wazuh import WazuhAlert
from app.services.index_service import sync_wazuh_alert
from app.services.detection_service import evaluate_detections


def create_wazuh_alert(db: Session, alert_payload: dict[str, Any], es: Optional[Elasticsearch] = None) -> WazuhAlert:
    """
    Creates a new WazuhAlert record in the database.
    Extracts key fields for indexing while preserving the full original payload.
    Synchronizes with Elasticsearch if a client is provided.
    Evaluates detections against the new alert.
    """
    # Extract timestamp
    timestamp_str = alert_payload.get("timestamp")
    timestamp = None
    if timestamp_str:
        try:
            # Handle Wazuh's +0000 and ensure it's compatible with fromisoformat
            timestamp = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            timestamp = None

    # Extract rule info
    rule = alert_payload.get("rule", {})
    level = rule.get("level")
    rule_id = rule.get("id")

    # Extract data fields (devname, devid)
    data_fields = alert_payload.get("data", {})
    devname = data_fields.get("devname")
    devid = data_fields.get("devid")

    # Create model instance
    db_alert = WazuhAlert(
        timestamp=timestamp,
        level=level,
        rule_id=rule_id,
        devname=devname,
        devid=devid,
        full_payload=alert_payload  # Exactly as received
    )

    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    
    # Sync to Elasticsearch
    if es:
        try:
            sync_wazuh_alert(es, db_alert)
        except Exception:
            # We don't want to fail the whole ingestion if ES indexing fails
            pass
            
    # Run detections
    try:
        evaluate_detections(db, db_alert)
    except Exception as e:
        # Avoid failing the ingestion if detection evaluation fails
        print(f"Detection evaluation failed: {e}")
            
    return db_alert
