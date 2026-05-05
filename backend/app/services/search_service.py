from elasticsearch import Elasticsearch
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.db.elasticsearch.indices import FEATURE_INDEX, ensure_feature_index
from app.models.feature import Feature
from app.schemas.search import SearchMeta, SearchQuery, SearchResult, SearchResultsPage


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
