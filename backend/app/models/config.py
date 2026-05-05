from sqlalchemy import Integer, JSON, String, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.db.postgres.session import Base

class DetectionConfig(Base):
    """
    Stores configuration thresholds for detection rules dynamically.
    """
    __tablename__ = "detection_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    
    # Store all detection-related configurations in a JSON column
    settings: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

class RedmineConfig(Base):
    """
    Global configuration for Redmine integration.
    Can be used by any service to create issues.
    """
    __tablename__ = "redmine_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    url: Mapped[str] = mapped_column(String(255), default="")
    api_key: Mapped[str] = mapped_column(String(255), default="")
    project_id: Mapped[str] = mapped_column(String(100), default="")
    tracker_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
