from elasticsearch import Elasticsearch
from sqlalchemy.orm import Session

from app.db.elasticsearch.indices import FEATURE_INDEX, ensure_feature_index
from app.models.feature import Feature


def _serialise_feature(feature: Feature) -> dict[str, str | int | None]:
    return {
        "created_at": feature.created_at.isoformat(),
        "description": feature.description,
        "id": feature.id,
        "name": feature.name,
        "status": feature.status,
    }


def sync_feature(es: Elasticsearch, feature: Feature) -> None:
    ensure_feature_index(es)
    es.index(index=FEATURE_INDEX, id=feature.id, document=_serialise_feature(feature), refresh=True)


def reindex_features(db: Session, es: Elasticsearch) -> int:
    features = db.query(Feature).order_by(Feature.id.asc()).all()

    if es.indices.exists(index=FEATURE_INDEX):
        es.indices.delete(index=FEATURE_INDEX)

    ensure_feature_index(es)

    for feature in features:
        es.index(index=FEATURE_INDEX, id=feature.id, document=_serialise_feature(feature))

    if features:
        es.indices.refresh(index=FEATURE_INDEX)

    return len(features)
