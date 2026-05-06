import asyncio
import logging
from datetime import timedelta
from typing import Any

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.runtime import runtime_identity
from app.db.elasticsearch.client import es_client
from app.db.postgres.session import SessionLocal
from app.models.operations import AppLog, AuditEvent, ErrorEvent, JobRun, WorkerJob
from app.models.wazuh import WazuhAlert
from app.services.index_service import sync_wazuh_alert
from app.services.issue_service import send_normalized_issue
from app.services.observability import record_app_log, utc_now

logger = logging.getLogger(__name__)

JOB_INDEX_WAZUH_ALERT = "index_wazuh_alert"
JOB_CREATE_EXTERNAL_ISSUE = "create_external_issue"


def enqueue_worker_job(
    db: Session,
    job_type: str,
    payload: dict[str, Any],
    *,
    max_attempts: int = 3,
) -> WorkerJob:
    job = WorkerJob(
        job_type=job_type,
        status="queued",
        payload=payload,
        max_attempts=max_attempts,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


async def run_maintenance_job(reason: str = "scheduled") -> None:
    started = utc_now()
    runtime = runtime_identity()
    db = SessionLocal()
    run = JobRun(
        name="operations-maintenance",
        status="running",
        started_at=started,
        details={"reason": reason, "job_service": runtime["service"], "job_container": runtime["container"]},
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    try:
        now = utc_now()
        deleted_logs = db.execute(delete(AppLog).where(AppLog.created_at < now - timedelta(days=settings.app_log_retention_days))).rowcount or 0
        deleted_audit = db.execute(delete(AuditEvent).where(AuditEvent.created_at < now - timedelta(days=settings.audit_retention_days))).rowcount or 0
        deleted_errors = db.execute(delete(ErrorEvent).where(ErrorEvent.created_at < now - timedelta(days=settings.error_retention_days))).rowcount or 0

        finished = utc_now()
        run.status = "success"
        run.finished_at = finished
        run.duration_ms = int((finished - started).total_seconds() * 1000)
        run.message = "Retention cleanup completed"
        run.details = {
            "reason": reason,
            "job_service": runtime["service"],
            "job_container": runtime["container"],
            "deleted_logs": deleted_logs,
            "deleted_audit": deleted_audit,
            "deleted_errors": deleted_errors,
        }
        db.commit()

        record_app_log(
            db,
            level="INFO",
            source="Jobs",
            message="Operations maintenance completed",
            details=run.details,
        )
    except Exception as exc:
        db.rollback()
        finished = utc_now()
        run.status = "failed"
        run.finished_at = finished
        run.duration_ms = int((finished - started).total_seconds() * 1000)
        run.message = str(exc)[:1000]
        db.add(run)
        db.commit()
        logger.exception("operations maintenance failed")
        record_app_log(
            db,
            level="ERROR",
            source="Jobs",
            message="Operations maintenance failed",
            details={"error": str(exc), "job_service": runtime["service"], "job_container": runtime["container"]},
        )
    finally:
        db.close()


async def operations_job_loop(stop_event: asyncio.Event) -> None:
    while not stop_event.is_set():
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=settings.background_job_interval_sec)
        except asyncio.TimeoutError:
            await run_maintenance_job()


def _process_worker_job(db: Session, job: WorkerJob) -> str:
    if job.job_type == JOB_INDEX_WAZUH_ALERT:
        alert_id = job.payload.get("alert_id")
        alert = db.get(WazuhAlert, alert_id)
        if alert is None:
            raise ValueError(f"Wazuh alert {alert_id} was not found")
        sync_wazuh_alert(es_client, alert)
        return f"Indexed Wazuh alert {alert_id}"

    if job.job_type == JOB_CREATE_EXTERNAL_ISSUE:
        issue = job.payload.get("issue")
        if not isinstance(issue, dict):
            raise ValueError("External issue job missing issue payload")
        result = send_normalized_issue(db, issue)
        if result is None:
            return "External issue skipped because Redmine is disabled or incomplete"
        return f"External issue created for {issue.get('subject')}"

    raise ValueError(f"Unsupported worker job type: {job.job_type}")


async def run_ingest_worker_once(limit: int | None = None) -> int:
    db = SessionLocal()
    processed = 0
    batch_limit = limit or settings.ingest_worker_batch_size

    try:
        now = utc_now()
        jobs = (
            db.query(WorkerJob)
            .filter(
                WorkerJob.status == "queued",
                WorkerJob.attempts < WorkerJob.max_attempts,
                WorkerJob.run_after <= now,
            )
            .order_by(WorkerJob.created_at.asc(), WorkerJob.id.asc())
            .limit(batch_limit)
            .all()
        )

        for job in jobs:
            started = utc_now()
            job.status = "running"
            job.attempts += 1
            job.locked_at = started
            db.commit()

            try:
                message = _process_worker_job(db, job)
                job.status = "success"
                job.finished_at = utc_now()
                job.last_error = None
                db.commit()
                processed += 1
                record_app_log(
                    db,
                    level="INFO",
                    source="Worker",
                    message=message,
                    details={"job_id": job.id, "job_type": job.job_type},
                )
            except Exception as exc:
                db.rollback()
                job = db.get(WorkerJob, job.id)
                if job is None:
                    continue
                job.last_error = str(exc)[:1000]
                job.status = "failed" if job.attempts >= job.max_attempts else "queued"
                job.run_after = utc_now() + timedelta(seconds=min(300, 5 * (2 ** max(job.attempts - 1, 0))))
                db.commit()
                logger.exception("worker job failed", extra={"job_id": job.id, "job_type": job.job_type})
                record_app_log(
                    db,
                    level="ERROR",
                    source="Worker",
                    message=f"Worker job failed: {job.job_type}",
                    details={"job_id": job.id, "error": str(exc)},
                )
    finally:
        db.close()

    return processed


async def ingest_worker_loop(stop_event: asyncio.Event) -> None:
    while not stop_event.is_set():
        try:
            await run_ingest_worker_once()
        except Exception:
            logger.exception("ingest worker loop failed")

        try:
            await asyncio.wait_for(stop_event.wait(), timeout=settings.ingest_worker_interval_sec)
        except asyncio.TimeoutError:
            continue
