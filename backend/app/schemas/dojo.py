from datetime import datetime

from pydantic import BaseModel


class DojoFindingUpsert(BaseModel):
    dojo_id: int
    title: str
    severity: str
    status: str
    cwe: int | None = None
    date: str | None = None
    active: bool = True
    verified: bool = False
    description: str | None = None
    dojo_url: str | None = None


class DojoFindingResponse(BaseModel):
    id: int
    dojo_id: int
    title: str
    severity: str
    status: str
    cwe: int | None
    date: str | None
    active: bool
    verified: bool
    description: str | None
    dojo_url: str | None
    synced_at: datetime

    model_config = {"from_attributes": True}


class BulkUpsertRequest(BaseModel):
    findings: list[DojoFindingUpsert]
