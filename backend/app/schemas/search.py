from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class SearchFilter(BaseModel):
    field: Literal["status"]
    values: list[str] = Field(default_factory=list)


class SearchQuery(BaseModel):
    filters: list[SearchFilter] = Field(default_factory=list)
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=10, ge=1, le=100)
    query: str = ""


class SearchResult(BaseModel):
    id: int
    name: str
    description: str | None = None
    status: str
    created_at: datetime
    score: float | None = None


class SearchResultsPage(BaseModel):
    items: list[SearchResult]
    page: int
    page_size: int
    total: int
    took_ms: int


class SearchMeta(BaseModel):
    total_features: int
    indexed_features: int
    available_statuses: list[str]
