from datetime import datetime

from pydantic import BaseModel, ConfigDict


class FeatureBase(BaseModel):
    name: str
    description: str | None = None
    status: str = "draft"


class FeatureCreate(FeatureBase):
    pass


class FeatureUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class FeatureResponse(FeatureBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
