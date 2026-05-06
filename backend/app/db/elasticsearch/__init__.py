from .client import es_client
from .indices import (
    FEATURE_INDEX,
    WAZUH_INDEX,
    cleanup_wazuh_indices,
    delete_wazuh_indices,
    ensure_feature_index,
    ensure_wazuh_index,
)

__all__ = [
    "FEATURE_INDEX",
    "WAZUH_INDEX",
    "cleanup_wazuh_indices",
    "delete_wazuh_indices",
    "ensure_feature_index",
    "ensure_wazuh_index",
    "es_client",
]
