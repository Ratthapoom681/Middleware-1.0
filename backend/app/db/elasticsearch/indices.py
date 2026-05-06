from datetime import UTC, date, datetime, timedelta

from elasticsearch import Elasticsearch

from app.core.config import settings

FEATURE_INDEX = "features"

FEATURE_INDEX_SETTINGS = {
    "number_of_replicas": settings.es_index_replicas,
    "number_of_shards": settings.es_index_shards,
}

FEATURE_INDEX_MAPPINGS = {
    "properties": {
        "created_at": {"type": "date"},
        "description": {"type": "text"},
        "name": {"type": "text", "fields": {"keyword": {"type": "keyword"}}},
        "status": {"type": "keyword"},
    }
}

WAZUH_LEGACY_INDEX = "wazuh_alerts"
WAZUH_INDEX_PREFIX = settings.wazuh_index_prefix
WAZUH_INDEX_PATTERN = f"{WAZUH_INDEX_PREFIX}-*"
WAZUH_INDEX_TEMPLATE = f"{WAZUH_INDEX_PREFIX}-template"
WAZUH_LIFECYCLE_POLICY = f"{WAZUH_INDEX_PREFIX}-retention"
WAZUH_INDEX = WAZUH_INDEX_PATTERN
_wazuh_template_ensured = False

WAZUH_INDEX_SETTINGS = {
    "number_of_replicas": settings.es_index_replicas,
    "number_of_shards": settings.es_index_shards,
    "refresh_interval": "5s",
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


def wazuh_index_name(timestamp: datetime | None = None) -> str:
    index_date = (timestamp or datetime.now(UTC)).date()
    return f"{WAZUH_INDEX_PREFIX}-{index_date:%Y.%m.%d}"


def _parse_wazuh_index_date(index_name: str) -> date | None:
    if not index_name.startswith(f"{WAZUH_INDEX_PREFIX}-"):
        return None

    raw_date = index_name.removeprefix(f"{WAZUH_INDEX_PREFIX}-")
    try:
        return datetime.strptime(raw_date, "%Y.%m.%d").date()
    except ValueError:
        return None


def ensure_feature_index(es: Elasticsearch) -> None:
    if es.indices.exists(index=FEATURE_INDEX):
        return

    es.indices.create(
        index=FEATURE_INDEX,
        mappings=FEATURE_INDEX_MAPPINGS,
        settings=FEATURE_INDEX_SETTINGS,
    )


def ensure_wazuh_index_template(es: Elasticsearch) -> None:
    global _wazuh_template_ensured

    if _wazuh_template_ensured:
        return

    lifecycle_settings = {}
    if settings.wazuh_retention_days > 0:
        try:
            es.ilm.put_lifecycle(
                name=WAZUH_LIFECYCLE_POLICY,
                policy={
                    "phases": {
                        "delete": {
                            "min_age": f"{settings.wazuh_retention_days}d",
                            "actions": {"delete": {}},
                        }
                    }
                },
            )
            lifecycle_settings["index.lifecycle.name"] = WAZUH_LIFECYCLE_POLICY
        except Exception:
            lifecycle_settings = {}

    es.indices.put_index_template(
        name=WAZUH_INDEX_TEMPLATE,
        index_patterns=[WAZUH_INDEX_PATTERN],
        priority=100,
        template={
            "settings": {**WAZUH_INDEX_SETTINGS, **lifecycle_settings},
            "mappings": WAZUH_INDEX_MAPPINGS,
        },
    )
    _wazuh_template_ensured = True


def ensure_wazuh_index(es: Elasticsearch, timestamp: datetime | None = None) -> str:
    ensure_wazuh_index_template(es)

    index_name = wazuh_index_name(timestamp)
    if not es.indices.exists(index=index_name):
        es.indices.create(index=index_name)

    return index_name


def cleanup_wazuh_indices(es: Elasticsearch) -> list[str]:
    if settings.wazuh_retention_days <= 0:
        return []

    cutoff = datetime.now(UTC).date() - timedelta(days=settings.wazuh_retention_days)
    response = es.indices.get(index=WAZUH_INDEX_PATTERN, ignore_unavailable=True)
    deleted = []

    for index_name in response:
        index_date = _parse_wazuh_index_date(index_name)
        if index_date is None or index_date >= cutoff:
            continue

        es.indices.delete(index=index_name, ignore_unavailable=True)
        deleted.append(index_name)

    return deleted


def delete_wazuh_indices(es: Elasticsearch) -> list[str]:
    response = es.indices.get(index=WAZUH_INDEX_PATTERN, ignore_unavailable=True)
    deleted = []

    for index_name in response:
        es.indices.delete(index=index_name, ignore_unavailable=True)
        deleted.append(index_name)

    if es.indices.exists(index=WAZUH_LEGACY_INDEX):
        es.indices.delete(index=WAZUH_LEGACY_INDEX)
        deleted.append(WAZUH_LEGACY_INDEX)

    return deleted
