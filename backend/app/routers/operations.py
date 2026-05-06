from datetime import timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.dependencies.auth import current_actor
from app.dependencies.db import get_db
from app.models.operations import AppLog, AuditEvent, ErrorEvent, JobRun, WorkerJob
from app.schemas.operations import (
    AppLogRead,
    AuditEventRead,
    ClientErrorCreate,
    ErrorEventRead,
    JobRunRead,
    OperationsSummary,
    WorkerJobRead,
)
from app.services.background_jobs import run_maintenance_job
from app.services.observability import record_app_log, record_error_event, utc_now

router = APIRouter()


@router.get("/summary", response_model=OperationsSummary)
def operations_summary(
    db: Session = Depends(get_db),
    _: str = Depends(current_actor),
) -> OperationsSummary:
    since = utc_now() - timedelta(hours=24)
    level_counts = {
        level or "UNKNOWN": count
        for level, count in db.query(AppLog.level, func.count(AppLog.id))
        .filter(AppLog.created_at >= since)
        .group_by(AppLog.level)
        .all()
    }
    latest_job = db.query(JobRun).order_by(JobRun.started_at.desc(), JobRun.id.desc()).first()
    return OperationsSummary(
        auth_enabled=settings.auth_enabled,
        logs_24h=db.query(AppLog).filter(AppLog.created_at >= since).count(),
        audit_events_24h=db.query(AuditEvent).filter(AuditEvent.created_at >= since).count(),
        unresolved_errors=db.query(ErrorEvent).filter(ErrorEvent.resolved.is_(False)).count(),
        failed_jobs_24h=db.query(JobRun).filter(JobRun.created_at >= since, JobRun.status == "failed").count(),
        latest_job=JobRunRead.model_validate(latest_job) if latest_job else None,
        level_counts=level_counts,
    )


@router.get("/logs", response_model=list[AppLogRead])
def list_app_logs(
    db: Session = Depends(get_db),
    _: str = Depends(current_actor),
    limit: int = Query(default=200, ge=1, le=500),
    level: str | None = Query(default=None),
    source: str | None = Query(default=None),
    query: str = Query(default=""),
) -> list[AppLogRead]:
    base_query = db.query(AppLog)
    if level and level != "ALL":
        base_query = base_query.filter(func.upper(AppLog.level) == level.upper())
    if source and source != "ALL":
        base_query = base_query.filter(AppLog.source == source)
    if query.strip():
        token = f"%{query.strip()}%"
        base_query = base_query.filter(AppLog.message.ilike(token))

    items = base_query.order_by(AppLog.created_at.desc(), AppLog.id.desc()).limit(limit).all()
    return [AppLogRead.model_validate(item) for item in items]


@router.get("/audit", response_model=list[AuditEventRead])
def list_audit_events(
    db: Session = Depends(get_db),
    _: str = Depends(current_actor),
    limit: int = Query(default=100, ge=1, le=500),
) -> list[AuditEventRead]:
    items = db.query(AuditEvent).order_by(AuditEvent.created_at.desc(), AuditEvent.id.desc()).limit(limit).all()
    return [AuditEventRead.model_validate(item) for item in items]


@router.get("/errors", response_model=list[ErrorEventRead])
def list_error_events(
    db: Session = Depends(get_db),
    _: str = Depends(current_actor),
    limit: int = Query(default=100, ge=1, le=500),
    unresolved_only: bool = Query(default=False),
) -> list[ErrorEventRead]:
    base_query = db.query(ErrorEvent)
    if unresolved_only:
        base_query = base_query.filter(ErrorEvent.resolved.is_(False))
    items = base_query.order_by(ErrorEvent.created_at.desc(), ErrorEvent.id.desc()).limit(limit).all()
    return [ErrorEventRead.model_validate(item) for item in items]


@router.get("/jobs", response_model=list[JobRunRead])
def list_job_runs(
    db: Session = Depends(get_db),
    _: str = Depends(current_actor),
    limit: int = Query(default=50, ge=1, le=200),
) -> list[JobRunRead]:
    items = db.query(JobRun).order_by(JobRun.started_at.desc(), JobRun.id.desc()).limit(limit).all()
    return [JobRunRead.model_validate(item) for item in items]


@router.get("/worker-jobs", response_model=list[WorkerJobRead])
def list_worker_jobs(
    db: Session = Depends(get_db),
    _: str = Depends(current_actor),
    limit: int = Query(default=100, ge=1, le=500),
    status: str | None = Query(default=None),
) -> list[WorkerJobRead]:
    base_query = db.query(WorkerJob)
    if status and status != "all":
        base_query = base_query.filter(WorkerJob.status == status)
    items = base_query.order_by(WorkerJob.created_at.desc(), WorkerJob.id.desc()).limit(limit).all()
    return [WorkerJobRead.model_validate(item) for item in items]


@router.post("/jobs/maintenance/run", status_code=202)
def enqueue_maintenance_job(
    background_tasks: BackgroundTasks,
    actor: str = Depends(current_actor),
) -> dict[str, str]:
    background_tasks.add_task(run_maintenance_job, f"manual:{actor}")
    return {"status": "queued"}


@router.post("/errors/client", response_model=ErrorEventRead, status_code=201)
def capture_client_error(
    payload: ClientErrorCreate,
    request: Request,
    db: Session = Depends(get_db),
    _: str = Depends(current_actor),
) -> ErrorEventRead:
    item = record_error_event(
        db,
        error_type="ClientError",
        message=payload.message,
        method=request.method,
        path=payload.path,
        request_id=getattr(request.state, "request_id", None),
        stack=payload.stack,
        details={"source": payload.source, **(payload.details or {})},
    )
    record_app_log(
        db,
        level="ERROR",
        source="Errors",
        message=f"Client error captured: {payload.message}",
        request_id=getattr(request.state, "request_id", None),
        path=payload.path,
    )
    return ErrorEventRead.model_validate(item)
