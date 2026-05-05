from elasticsearch import Elasticsearch
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies.db import get_db
from app.dependencies.es import get_es
from app.schemas.feature import FeatureCreate, FeatureResponse
from app.services.feature_service import create_feature, list_features
from app.services.index_service import sync_feature

router = APIRouter()


@router.get("", response_model=list[FeatureResponse])
def get_features(db: Session = Depends(get_db)) -> list[FeatureResponse]:
    return list_features(db)


@router.post("", response_model=FeatureResponse, status_code=201)
def post_feature(
    payload: FeatureCreate,
    db: Session = Depends(get_db),
    es: Elasticsearch = Depends(get_es),
) -> FeatureResponse:
    feature = create_feature(db, payload)

    try:
        sync_feature(es, feature)
    except Exception:
        pass

    return feature
