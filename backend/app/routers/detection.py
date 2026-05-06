from fastapi import APIRouter, Depends, Query
from sqlalchemy import String, cast, func, or_
from sqlalchemy.orm import Session

from app.dependencies.db import get_db
from app.models.detection import DetectionAlert
from app.schemas.detection import DetectionAlertRead, DetectionAlertsPage

router = APIRouter()


@router.get("", response_model=DetectionAlertsPage)
def list_detection_alerts(
    db: Session = Depends(get_db),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    query: str = Query(default=""),
    severity: str | None = Query(default=None),
    use_case: str | None = Query(default=None),
) -> DetectionAlertsPage:
    base_query = db.query(DetectionAlert)

    if severity and severity != "all":
        base_query = base_query.filter(func.lower(DetectionAlert.severity) == severity.lower())

    if use_case and use_case != "all":
        base_query = base_query.filter(DetectionAlert.use_case == use_case)

    if query.strip():
        token = f"%{query.strip()}%"
        base_query = base_query.filter(
            or_(
                DetectionAlert.title.ilike(token),
                DetectionAlert.description.ilike(token),
                DetectionAlert.use_case.ilike(token),
                DetectionAlert.severity.ilike(token),
                DetectionAlert.source_ip.ilike(token),
                cast(DetectionAlert.details, String).ilike(token),
            )
        )

    total = base_query.count()
    severity_counts = {
        severity_name or "unknown": count
        for severity_name, count in base_query.with_entities(
            DetectionAlert.severity,
            func.count(DetectionAlert.id),
        )
        .group_by(DetectionAlert.severity)
        .all()
    }
    use_case_counts = {
        case_name: count
        for case_name, count in base_query.with_entities(
            DetectionAlert.use_case,
            func.count(DetectionAlert.id),
        )
        .group_by(DetectionAlert.use_case)
        .all()
    }

    items = (
        base_query.order_by(DetectionAlert.timestamp.desc(), DetectionAlert.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return DetectionAlertsPage(
        items=[DetectionAlertRead.model_validate(item) for item in items],
        page=page,
        page_size=page_size,
        total=total,
        severity_counts=severity_counts,
        use_case_counts=use_case_counts,
    )
