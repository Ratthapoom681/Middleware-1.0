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

WAZUH_INDEX = "wazuh_alerts"

WAZUH_INDEX_SETTINGS = {
    "number_of_replicas": 0,
    "number_of_shards": 1,
}

WAZUH_INDEX_MAPPINGS = {
    "properties": {
        "timestamp": {"type": "date"},
        "level": {"type": "integer"},
        "rule_id": {"type": "keyword"},
        "devname": {"type": "text", "fields": {"keyword": {"type": "keyword"}}},
        "devid": {"type": "keyword"},
        "full_log": {"type": "text"},
        "full_payload": {"type": "object", "enabled": False},  # Store but don't index full blob for performance
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


def ensure_wazuh_index(es: Elasticsearch) -> None:
    if es.indices.exists(index=WAZUH_INDEX):
        return

    es.indices.create(
        index=WAZUH_INDEX,
        mappings=WAZUH_INDEX_MAPPINGS,
        settings=WAZUH_INDEX_SETTINGS,
    )
