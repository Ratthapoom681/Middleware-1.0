from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies.db import get_db
from app.schemas.feature import FeatureCreate, FeatureResponse
from app.services.feature_service import create_feature, list_features

router = APIRouter()


@router.get("", response_model=list[FeatureResponse])
def get_features(db: Session = Depends(get_db)) -> list[FeatureResponse]:
    return list_features(db)


@router.post("", response_model=FeatureResponse, status_code=201)
def post_feature(payload: FeatureCreate, db: Session = Depends(get_db)) -> FeatureResponse:
    return create_feature(db, payload)

