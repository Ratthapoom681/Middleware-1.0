from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class AppLogRead(BaseModel):
    id: int
    level: str
    source: str
    message: str
    request_id: str | None = None
    path: str | None = None
    status_code: int | None = None
    details: dict[str, Any] | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class AuditEventRead(BaseModel):
    id: int
    actor: str
    action: str
    resource: str
    method: str | None = None
    path: str | None = None
    status_code: int | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    request_id: str | None = None
    details: dict[str, Any] | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class ErrorEventRead(BaseModel):
    id: int
    error_type: str
    message: str
    method: str | None = None
    path: str | None = None
    request_id: str | None = None
    stack: str | None = None
    resolved: bool
    details: dict[str, Any] | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class JobRunRead(BaseModel):
    id: int
    name: str
    status: str
    message: str | None = None
    started_at: datetime
    finished_at: datetime | None = None
    duration_ms: int | None = None
    details: dict[str, Any] | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class WorkerJobRead(BaseModel):
    id: int
    job_type: str
    status: str
    attempts: int
    max_attempts: int
    payload: dict[str, Any]
    last_error: str | None = None
    run_after: datetime
    locked_at: datetime | None = None
    finished_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OperationsSummary(BaseModel):
    auth_enabled: bool
    logs_24h: int
    audit_events_24h: int
    unresolved_errors: int
    failed_jobs_24h: int
    latest_job: JobRunRead | None = None
    level_counts: dict[str, int] = Field(default_factory=dict)


class ClientErrorCreate(BaseModel):
    message: str
    source: str = "frontend"
    path: str | None = None
    stack: str | None = None
    details: dict[str, Any] | None = None


class HealthComponent(BaseModel):
    status: str
    message: str | None = None
    details: dict[str, Any] = Field(default_factory=dict)


class HealthRead(BaseModel):
    status: str
    generated_at: datetime
    components: dict[str, HealthComponent]
