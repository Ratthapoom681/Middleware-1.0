from datetime import datetime, timezone
from sqlalchemy import Boolean, DateTime, Integer, String, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.postgres.session import Base

class DojoRedmineMap(Base):
    __tablename__ = "dojo_redmine_map"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    finding_id: Mapped[int] = mapped_column(Integer, ForeignKey("dojo_findings.id"), nullable=False)
    redmine_issue_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    composite_key: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))


class AutomationRule(Base):
    __tablename__ = "automation_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    severity_rules: Mapped[dict] = mapped_column(
        JSON, 
        nullable=False, 
        default={"Critical": "Send Immediately", "High": "Send Immediately", "Medium": "Manual Review", "Low": "Ignore", "Info": "Ignore"}
    )
    priority_mapping: Mapped[dict] = mapped_column(
        JSON, 
        nullable=False, 
        default={"Critical": "Urgent", "High": "High", "Medium": "Normal", "Low": "Low", "Info": "Trivial"}
    )
    status_mapping: Mapped[dict] = mapped_column(
        JSON, 
        nullable=False, 
        default={"Open": "New", "Accepted Risk": "Closed", "False Positive": "Rejected"}
    )


class SchedulerJob(Base):
    __tablename__ = "scheduler_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False, index=True, default="dojo_redmine_sync")
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    interval_minutes: Mapped[int] = mapped_column(Integer, default=10)
    last_run: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="idle")


class TicketAuditLog(Base):
    __tablename__ = "ticket_audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    redmine_issue_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    finding_id: Mapped[int] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(64), nullable=False) # Matched, Severity mismatch, Missing Ticket
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.now(timezone.utc))


class SyncHistory(Base):
    __tablename__ = "sync_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    total_fetched: Mapped[int] = mapped_column(Integer, default=0)
    matched_rules: Mapped[int] = mapped_column(Integer, default=0)
    tickets_created: Mapped[int] = mapped_column(Integer, default=0)
    tickets_updated: Mapped[int] = mapped_column(Integer, default=0)
    errors: Mapped[int] = mapped_column(Integer, default=0)
    log_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.now(timezone.utc))
