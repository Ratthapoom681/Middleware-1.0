from datetime import UTC, datetime
from typing import Any

from elasticsearch import Elasticsearch
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.elasticsearch.indices import WAZUH_INDEX, wazuh_index_name
from app.models.config import RedmineConfig
from app.models.operations import WorkerJob
from app.models.wazuh import WazuhAlert
from app.services.observability import utc_now


def _component(status: str, message: str | None = None, **details: Any) -> dict[str, Any]:
    return {"status": status, "message": message, "details": details}


def _age_seconds(value: datetime | None) -> int | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return int((utc_now() - value).total_seconds())


def build_health_report(db: Session, es: Elasticsearch) -> dict[str, Any]:
    components: dict[str, dict[str, Any]] = {}

    db_ok = False
    try:
        db.execute(text("SELECT 1"))
        components["db"] = _component("ok", "Database connection is healthy")
        db_ok = True
    except Exception as exc:
        components["db"] = _component("down", str(exc))

    try:
        es_ok = bool(es.ping())
        components["elasticsearch"] = _component(
            "ok" if es_ok else "down",
            "Elasticsearch is reachable" if es_ok else "Elasticsearch ping failed",
            url=str(es.transport.hosts[0]) if getattr(es.transport, "hosts", None) else None,
        )
    except Exception as exc:
        components["elasticsearch"] = _component("down", str(exc))

    if not db_ok:
        components["wazuh_ingest"] = _component("unknown", "Database is unavailable")
        components["redmine"] = _component("unknown", "Database is unavailable")
        components["index_freshness"] = _component("unknown", "Database is unavailable")
        return {"status": "down", "generated_at": utc_now(), "components": components}

    latest_alert = db.query(WazuhAlert).order_by(WazuhAlert.created_at.desc(), WazuhAlert.id.desc()).first()
    alert_count = db.query(WazuhAlert).count()
    queued_jobs = db.query(WorkerJob).filter(WorkerJob.status == "queued").count()
    failed_jobs = db.query(WorkerJob).filter(WorkerJob.status == "failed").count()
    components["wazuh_ingest"] = _component(
        "ok" if latest_alert else "empty",
        "Wazuh ingest has received alerts" if latest_alert else "No Wazuh alerts ingested yet",
        total_alerts=alert_count,
        latest_alert_id=latest_alert.id if latest_alert else None,
        latest_alert_at=latest_alert.created_at.isoformat() if latest_alert else None,
        latest_alert_age_sec=_age_seconds(latest_alert.created_at if latest_alert else None),
        queued_worker_jobs=queued_jobs,
        failed_worker_jobs=failed_jobs,
    )

    redmine = db.query(RedmineConfig).first()
    redmine_ready = bool(redmine and redmine.enabled and redmine.url and redmine.api_key and redmine.project_id)
    redmine_configured = bool(redmine and redmine.url and redmine.project_id)
    components["redmine"] = _component(
        "ok" if redmine_ready else "disabled" if not redmine or not redmine.enabled else "misconfigured",
        "Redmine issue creation is enabled" if redmine_ready else "Redmine issue creation is not active",
        enabled=bool(redmine.enabled) if redmine else False,
        configured=redmine_configured,
        url=redmine.url if redmine and redmine.url else None,
        project_id=redmine.project_id if redmine and redmine.project_id else None,
        tracker_id=redmine.tracker_id if redmine else None,
        has_api_key=bool(redmine.api_key) if redmine else False,
    )

    try:
        es_count = es.count(index=WAZUH_INDEX, ignore_unavailable=True).get("count", 0)
        latest_indexed = False
        latest_index = None
        if latest_alert:
            latest_index = wazuh_index_name(latest_alert.timestamp)
            latest_indexed = bool(es.exists(index=latest_index, id=latest_alert.id))

        lag = max(alert_count - int(es_count), 0)
        status = "ok" if latest_indexed or alert_count == 0 else "stale"
        if lag > 0:
            status = "stale"
        components["index_freshness"] = _component(
            status,
            "Wazuh index is current" if status == "ok" else "Wazuh index has pending or missing alerts",
            db_alert_count=alert_count,
            es_alert_count=int(es_count),
            lag_count=lag,
            latest_alert_id=latest_alert.id if latest_alert else None,
            latest_index=latest_index,
            latest_alert_indexed=latest_indexed,
        )
    except Exception as exc:
        components["index_freshness"] = _component("unknown", str(exc), db_alert_count=alert_count)

    overall = "ok"
    if any(item["status"] == "down" for item in components.values()):
        overall = "down"
    elif any(item["status"] in {"stale", "misconfigured", "unknown"} for item in components.values()):
        overall = "degraded"

    return {"status": overall, "generated_at": utc_now(), "components": components}
