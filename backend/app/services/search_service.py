from elasticsearch import Elasticsearch
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.db.elasticsearch.indices import FEATURE_INDEX, WAZUH_INDEX, ensure_feature_index, ensure_wazuh_index
from app.models.feature import Feature
from app.models.wazuh import WazuhAlert
from app.schemas.search import SearchMeta, SearchQuery, SearchResult, SearchResultsPage
from app.schemas.wazuh import WazuhSearchResult, WazuhSearchResultsPage


def _status_filters(payload: SearchQuery) -> list[str]:
    for search_filter in payload.filters:
        if search_filter.field == "status":
            return search_filter.values

    return []


def _database_search(db: Session, payload: SearchQuery) -> SearchResultsPage:
    query = db.query(Feature)
    status_filters = _status_filters(payload)

    if payload.query.strip():
        token = f"%{payload.query.strip()}%"
        query = query.filter(
            or_(
                Feature.name.ilike(token),
                Feature.description.ilike(token),
                Feature.status.ilike(token),
            )
        )

    if status_filters:
        query = query.filter(Feature.status.in_(status_filters))

    total = query.count()
    items = (
        query.order_by(Feature.created_at.desc())
        .offset((payload.page - 1) * payload.page_size)
        .limit(payload.page_size)
        .all()
    )

    return SearchResultsPage(
        items=[
            SearchResult(
                id=item.id,
                name=item.name,
                description=item.description,
                status=item.status,
                created_at=item.created_at,
                score=None,
            )
            for item in items
        ],
        page=payload.page,
        page_size=payload.page_size,
        total=total,
        took_ms=0,
    )


def search_features(db: Session, es: Elasticsearch, payload: SearchQuery) -> SearchResultsPage:
    try:
        ensure_feature_index(es)
        query_text = payload.query.strip()
        filter_clauses = []
        status_filters = _status_filters(payload)

        if status_filters:
            filter_clauses.append({"terms": {"status": status_filters}})

        response = es.search(
            index=FEATURE_INDEX,
            from_=(payload.page - 1) * payload.page_size,
            query={
                "bool": {
                    "filter": filter_clauses,
                    "must": (
                        [
                            {
                                "multi_match": {
                                    "fields": ["name^3", "description", "status"],
                                    "fuzziness": "AUTO",
                                    "query": query_text,
                                }
                            }
                        ]
                        if query_text
                        else [{"match_all": {}}]
                    ),
                }
            },
            size=payload.page_size,
            sort=[{"_score": {"order": "desc"}}, {"created_at": {"order": "desc"}}]
            if query_text
            else [{"created_at": {"order": "desc"}}],
        )

        hits = response["hits"]["hits"]
        total = response["hits"]["total"]["value"]

        return SearchResultsPage(
            items=[
                SearchResult(
                    id=int(hit["_id"]),
                    name=hit["_source"]["name"],
                    description=hit["_source"].get("description"),
                    status=hit["_source"]["status"],
                    created_at=hit["_source"]["created_at"],
                    score=hit.get("_score"),
                )
                for hit in hits
            ],
            page=payload.page,
            page_size=payload.page_size,
            total=total,
            took_ms=response.get("took", 0),
        )
    except Exception:
        return _database_search(db, payload)


def get_search_meta(db: Session, es: Elasticsearch) -> SearchMeta:
    total_features = db.query(func.count(Feature.id)).scalar() or 0
    available_statuses = [row[0] for row in db.query(Feature.status).distinct().order_by(Feature.status.asc()).all()]

    try:
        ensure_feature_index(es)
        indexed_features = es.count(index=FEATURE_INDEX)["count"]
    except Exception:
        indexed_features = 0

    return SearchMeta(
        total_features=total_features,
        indexed_features=indexed_features,
        available_statuses=available_statuses,
    )


def search_wazuh_alerts(es: Elasticsearch, payload: SearchQuery) -> WazuhSearchResultsPage:
    try:
        ensure_wazuh_index(es)
        query_text = payload.query.strip()
        
        response = es.search(
            index=WAZUH_INDEX,
            from_=(payload.page - 1) * payload.page_size,
            query={
                "bool": {
                    "must": (
                        [
                            {
                                "multi_match": {
                                    "fields": ["devname^3", "devid^2", "rule_id", "full_log"],
                                    "fuzziness": "AUTO",
                                    "query": query_text,
                                }
                            }
                        ]
                        if query_text
                        else [{"match_all": {}}]
                    ),
                }
            },
            size=payload.page_size,
            sort=[{"_score": {"order": "desc"}}, {"timestamp": {"order": "desc"}}]
            if query_text
            else [{"timestamp": {"order": "desc"}}],
        )

        hits = response["hits"]["hits"]
        total = response["hits"]["total"]["value"]

        return WazuhSearchResultsPage(
            items=[
                WazuhSearchResult(
                    id=int(hit["_id"]),
                    timestamp=hit["_source"].get("timestamp"),
                    level=hit["_source"].get("level"),
                    rule_id=hit["_source"].get("rule_id"),
                    devname=hit["_source"].get("devname"),
                    devid=hit["_source"].get("devid"),
                    full_log=hit["_source"].get("full_log", ""),
                    score=hit.get("_score"),
                )
                for hit in hits
            ],
            page=payload.page,
            page_size=payload.page_size,
            total=total,
            took_ms=response.get("took", 0),
        )
    except Exception as e:
        # Fallback or empty result if ES is down
        return WazuhSearchResultsPage(
            items=[],
            page=payload.page,
            page_size=payload.page_size,
            total=0,
            took_ms=0,
        )
