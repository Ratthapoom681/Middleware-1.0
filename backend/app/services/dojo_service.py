from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.dojo import DojoFinding
from app.schemas.dojo import DojoFindingUpsert


def upsert_findings(db: Session, items: list[DojoFindingUpsert]) -> list[DojoFinding]:
    """Insert or update DefectDojo findings in Postgres. Returns upserted rows."""
    results: list[DojoFinding] = []

    for item in items:
        existing = db.query(DojoFinding).filter(DojoFinding.dojo_id == item.dojo_id).first()
        if existing:
            existing.title = item.title
            existing.severity = item.severity
            existing.status = item.status
            existing.cwe = item.cwe
            existing.date = item.date
            existing.active = item.active
            existing.verified = item.verified
            existing.description = item.description
            existing.dojo_url = item.dojo_url
            existing.synced_at = datetime.now(timezone.utc)
            results.append(existing)
        else:
            new_row = DojoFinding(
                dojo_id=item.dojo_id,
                title=item.title,
                severity=item.severity,
                status=item.status,
                cwe=item.cwe,
                date=item.date,
                active=item.active,
                verified=item.verified,
                description=item.description,
                dojo_url=item.dojo_url,
                synced_at=datetime.now(timezone.utc),
            )
            db.add(new_row)
            results.append(new_row)

    db.commit()
    for r in results:
        db.refresh(r)

    return results


def list_findings(db: Session) -> list[DojoFinding]:
    return db.query(DojoFinding).order_by(DojoFinding.synced_at.desc()).all()
