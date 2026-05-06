from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, Integer, JSON, String, Text, false, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.postgres.session import Base


class AppLog(Base):
    __tablename__ = "app_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    level: Mapped[str] = mapped_column(String(24), index=True, nullable=False)
    source: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    message: Mapped[str] = mapped_column(String(1000), nullable=False)
    request_id: Mapped[str | None] = mapped_column(String(80), index=True, nullable=True)
    path: Mapped[str | None] = mapped_column(String(500), index=True, nullable=True)
    status_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    details: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True, nullable=False)


class WorkerJob(Base):
    __tablename__ = "worker_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    job_type: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(40), index=True, nullable=False, default="queued")
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_attempts: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    last_error: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    run_after: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True, nullable=False)
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    actor: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    action: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    resource: Mapped[str] = mapped_column(String(240), index=True, nullable=False)
    method: Mapped[str | None] = mapped_column(String(12), nullable=True)
    path: Mapped[str | None] = mapped_column(String(500), index=True, nullable=True)
    status_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(80), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    request_id: Mapped[str | None] = mapped_column(String(80), index=True, nullable=True)
    details: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True, nullable=False)


class ErrorEvent(Base):
    __tablename__ = "error_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    error_type: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    message: Mapped[str] = mapped_column(String(1000), nullable=False)
    method: Mapped[str | None] = mapped_column(String(12), nullable=True)
    path: Mapped[str | None] = mapped_column(String(500), index=True, nullable=True)
    request_id: Mapped[str | None] = mapped_column(String(80), index=True, nullable=True)
    stack: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false(), index=True, nullable=False)
    details: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True, nullable=False)


class JobRun(Base):
    __tablename__ = "job_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(40), index=True, nullable=False)
    message: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    details: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True, nullable=False)
