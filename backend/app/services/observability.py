import logging
import traceback
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.orm import Session

from app.models.operations import AppLog, AuditEvent, ErrorEvent

logger = logging.getLogger(__name__)


def _safe_details(details: dict[str, Any] | None) -> dict[str, Any] | None:
    if not details:
        return None
    return {str(key): value for key, value in details.items()}


def record_app_log(
    db: Session,
    *,
    level: str,
    source: str,
    message: str,
    request_id: str | None = None,
    path: str | None = None,
    status_code: int | None = None,
    details: dict[str, Any] | None = None,
) -> AppLog | None:
    try:
        item = AppLog(
            level=level.upper(),
            source=source,
            message=message[:1000],
            request_id=request_id,
            path=path,
            status_code=status_code,
            details=_safe_details(details),
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        return item
    except Exception:
        db.rollback()
        logger.exception("failed to persist app log")
        return None


def record_audit_event(
    db: Session,
    *,
    actor: str,
    action: str,
    resource: str,
    method: str | None = None,
    path: str | None = None,
    status_code: int | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    request_id: str | None = None,
    details: dict[str, Any] | None = None,
) -> AuditEvent | None:
    try:
        item = AuditEvent(
            actor=actor,
            action=action,
            resource=resource,
            method=method,
            path=path,
            status_code=status_code,
            ip_address=ip_address,
            user_agent=user_agent,
            request_id=request_id,
            details=_safe_details(details),
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        return item
    except Exception:
        db.rollback()
        logger.exception("failed to persist audit event")
        return None


def record_error_event(
    db: Session,
    *,
    error: BaseException | None = None,
    error_type: str | None = None,
    message: str | None = None,
    method: str | None = None,
    path: str | None = None,
    request_id: str | None = None,
    stack: str | None = None,
    details: dict[str, Any] | None = None,
) -> ErrorEvent | None:
    if error is not None:
        error_type = type(error).__name__
        message = str(error)
        stack = "".join(traceback.format_exception(type(error), error, error.__traceback__))

    try:
        item = ErrorEvent(
            error_type=(error_type or "Error")[:200],
            message=(message or "Unknown error")[:1000],
            method=method,
            path=path,
            request_id=request_id,
            stack=stack,
            details=_safe_details(details),
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        return item
    except Exception:
        db.rollback()
        logger.exception("failed to persist error event")
        return None


def utc_now() -> datetime:
    return datetime.now(UTC)
