from sqlalchemy import Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.db.postgres.session import Base

class DetectionConfig(Base):
    """
    Stores configuration thresholds for detection rules dynamically.
    The frontend can save arbitrary key-value pairs in the 'settings' JSON column.
    """
    __tablename__ = "detection_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    
    # Store all configurations in a single dynamic JSON column
    settings: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
