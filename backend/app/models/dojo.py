from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.postgres.session import Base


class DojoFinding(Base):
    __tablename__ = "dojo_findings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    dojo_id: Mapped[int] = mapped_column(Integer, unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    severity: Mapped[str] = mapped_column(String(32), index=True, nullable=False, server_default="Info")
    status: Mapped[str] = mapped_column(String(32), index=True, nullable=False, server_default="Open")
    cwe: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cve: Mapped[str | None] = mapped_column(String(120), nullable=True)
    ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    port: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cvss: Mapped[float | None] = mapped_column(Integer, nullable=True)
    date: Mapped[str | None] = mapped_column(String(32), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    verified: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    dojo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    synced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
