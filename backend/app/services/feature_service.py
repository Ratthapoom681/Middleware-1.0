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

