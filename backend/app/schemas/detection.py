from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class DetectionAlertRead(BaseModel):
    id: int
    title: str
    description: str | None = None
    use_case: str
    severity: str
    source_ip: str | None = None
    details: dict[str, Any] | None = None
    timestamp: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class DetectionAlertsPage(BaseModel):
    items: list[DetectionAlertRead]
    page: int
    page_size: int
    total: int
    severity_counts: dict[str, int] = Field(default_factory=dict)
    use_case_counts: dict[str, int] = Field(default_factory=dict)
