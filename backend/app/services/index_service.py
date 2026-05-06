from elasticsearch import Elasticsearch
from sqlalchemy.orm import Session

from app.db.elasticsearch.indices import (
    FEATURE_INDEX,
    WAZUH_INDEX,
    cleanup_wazuh_indices,
    delete_wazuh_indices,
    ensure_feature_index,
    ensure_wazuh_index,
)
from app.models.feature import Feature
from app.models.wazuh import WazuhAlert


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


def _serialise_wazuh_alert(alert: WazuhAlert) -> dict:
    return {
        "timestamp": alert.timestamp.isoformat() if alert.timestamp else None,
        "level": alert.level,
        "rule_id": alert.rule_id,
        "devname": alert.devname,
        "devid": alert.devid,
        "full_log": alert.full_payload.get("full_log", ""),
        "full_payload": alert.full_payload,
        "id": alert.id,
    }


def sync_wazuh_alert(es: Elasticsearch, alert: WazuhAlert) -> None:
    index_name = ensure_wazuh_index(es, alert.timestamp)
    es.index(index=index_name, id=alert.id, document=_serialise_wazuh_alert(alert), refresh=True)


def reindex_wazuh_alerts(db: Session, es: Elasticsearch) -> int:
    alerts = db.query(WazuhAlert).order_by(WazuhAlert.id.asc()).all()

    delete_wazuh_indices(es)

    for alert in alerts:
        index_name = ensure_wazuh_index(es, alert.timestamp)
        es.index(index=index_name, id=alert.id, document=_serialise_wazuh_alert(alert))

    if alerts:
        es.indices.refresh(index=WAZUH_INDEX)
    else:
        ensure_wazuh_index(es)

    cleanup_wazuh_indices(es)

    return len(alerts)
