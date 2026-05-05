from elasticsearch import Elasticsearch

FEATURE_INDEX = "features"

FEATURE_INDEX_SETTINGS = {
    "number_of_replicas": 0,
    "number_of_shards": 1,
}

FEATURE_INDEX_MAPPINGS = {
    "properties": {
        "created_at": {"type": "date"},
        "description": {"type": "text"},
        "name": {"type": "text", "fields": {"keyword": {"type": "keyword"}}},
        "status": {"type": "keyword"},
    }
}


def ensure_feature_index(es: Elasticsearch) -> None:
    if es.indices.exists(index=FEATURE_INDEX):
        return

    es.indices.create(
        index=FEATURE_INDEX,
        mappings=FEATURE_INDEX_MAPPINGS,
        settings=FEATURE_INDEX_SETTINGS,
    )
