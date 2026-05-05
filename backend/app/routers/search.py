from elasticsearch import Elasticsearch
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies.db import get_db
from app.dependencies.es import get_es
from app.schemas.search import SearchMeta, SearchQuery, SearchResultsPage
from app.schemas.wazuh import WazuhSearchResultsPage
from app.services.index_service import reindex_features, reindex_wazuh_alerts
from app.services.search_service import get_search_meta, search_features, search_wazuh_alerts

router = APIRouter()


@router.post("", response_model=SearchResultsPage)
def post_search(
    payload: SearchQuery,
    db: Session = Depends(get_db),
    es: Elasticsearch = Depends(get_es),
) -> SearchResultsPage:
    return search_features(db, es, payload)


@router.get("/meta", response_model=SearchMeta)
def search_meta(
    db: Session = Depends(get_db),
    es: Elasticsearch = Depends(get_es),
) -> SearchMeta:
    return get_search_meta(db, es)


@router.post("/reindex", response_model=dict[str, int])
def search_reindex(
    db: Session = Depends(get_db),
    es: Elasticsearch = Depends(get_es),
) -> dict[str, int]:
    return {"indexed": reindex_features(db, es)}


@router.post("/wazuh", response_model=WazuhSearchResultsPage)
def post_search_wazuh(
    payload: SearchQuery,
    es: Elasticsearch = Depends(get_es),
) -> WazuhSearchResultsPage:
    return search_wazuh_alerts(es, payload)


@router.post("/wazuh/reindex", response_model=dict[str, int])
def search_wazuh_reindex(
    db: Session = Depends(get_db),
    es: Elasticsearch = Depends(get_es),
) -> dict[str, int]:
    return {"indexed": reindex_wazuh_alerts(db, es)}
