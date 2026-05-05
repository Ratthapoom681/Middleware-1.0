from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class WazuhAlertRule(BaseModel):
    level: Optional[int] = None
    id: Optional[str] = None
    description: Optional[str] = None


class WazuhAlertData(BaseModel):
    devname: Optional[str] = None
    devid: Optional[str] = None
    # Allow other fields in data
    model_config = {"extra": "allow"}


class WazuhAlertIn(BaseModel):
    timestamp: Optional[str] = None
    rule: Optional[WazuhAlertRule] = None
    data: Optional[WazuhAlertData] = None
    # Allow all other fields to capture full payload
    model_config = {"extra": "allow"}


class WazuhAlertSchema(BaseModel):
    id: int
    timestamp: Optional[datetime]
    level: Optional[int]
    rule_id: Optional[str]
    devname: Optional[str]
    devid: Optional[str]
    full_payload: dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True


class WazuhSearchResult(BaseModel):
    id: int
    timestamp: Optional[datetime]
    level: Optional[int]
    rule_id: Optional[str]
    devname: Optional[str]
    devid: Optional[str]
    full_log: str
    score: float | None = None


class WazuhSearchResultsPage(BaseModel):
    items: list[WazuhSearchResult]
    page: int
    page_size: int
    total: int
    took_ms: int
