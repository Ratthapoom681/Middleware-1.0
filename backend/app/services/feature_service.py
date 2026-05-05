from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.feature import Feature
from app.schemas.feature import FeatureCreate


def list_features(db: Session) -> list[Feature]:
    return db.query(Feature).order_by(Feature.id.desc()).all()


def create_feature(db: Session, payload: FeatureCreate) -> Feature:
    feature = Feature(**payload.model_dump())
    db.add(feature)
    db.commit()
    db.refresh(feature)
    return feature


def seed_features(db: Session) -> None:
    feature_count = db.query(func.count(Feature.id)).scalar() or 0

    if feature_count:
        return

    db.add_all(
        [
            Feature(
                name="Middleware Search Index",
                description="Tracks indexed records and exposes search analytics.",
                status="ready",
            ),
            Feature(
                name="Approval Workflow",
                description="Handles review states before publishing middleware changes.",
                status="draft",
            ),
            Feature(
                name="Operations Dashboard",
                description="Summarises service health, usage trends, and alerts.",
                status="ready",
            ),
        ]
    )
    db.commit()
