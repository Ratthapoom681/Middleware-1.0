import copy
import json
from datetime import timedelta
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.models.wazuh import WazuhAlert
from app.services.observability import utc_now
from app.services.wazuh_service import create_wazuh_alert

SAMPLE_DIR = Path(__file__).resolve().parents[1] / "samples" / "wazuh"
DEMO_ALERTS_FILE = SAMPLE_DIR / "demo_alerts.json"


def load_sample_wazuh_payloads() -> list[dict[str, Any]]:
    with DEMO_ALERTS_FILE.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _with_demo_timestamp(payload: dict[str, Any], index: int) -> dict[str, Any]:
    item = copy.deepcopy(payload)
    item["timestamp"] = (utc_now() - timedelta(seconds=(12 - index) * 8)).isoformat()
    return item


def seed_demo_wazuh_alerts(db: Session) -> dict[str, Any]:
    payloads = load_sample_wazuh_payloads()
    created_ids: list[int] = []

    for index, payload in enumerate(payloads):
        alert = create_wazuh_alert(db, _with_demo_timestamp(payload, index))
        created_ids.append(alert.id)

    return {"created": len(created_ids), "ids": created_ids}


def seed_demo_wazuh_alerts_if_empty(db: Session) -> dict[str, Any]:
    if db.query(WazuhAlert).count() > 0:
        return {"created": 0, "ids": [], "skipped": "wazuh_alerts table is not empty"}
    return seed_demo_wazuh_alerts(db)
