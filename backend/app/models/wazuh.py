from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Integer, String, JSON, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.postgres.session import Base


class WazuhAlert(Base):
    __tablename__ = "wazuh_alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    timestamp: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    level: Mapped[int | None] = mapped_column(Integer, index=True)
    rule_id: Mapped[str | None] = mapped_column(String(32), index=True)
    devname: Mapped[str | None] = mapped_column(String(120), index=True)
    devid: Mapped[str | None] = mapped_column(String(120), index=True)
    
    # Store the exact JSON received from Wazuh
    full_payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
