# Wazuh API Reference for Frontend

This document outlines the API endpoints available for the Wazuh Alert integration. The primary focus for frontend development is the Search endpoint, which is used to populate the dashboard and data tables.

---

## 1. Search Wazuh Alerts
This endpoint is used to query, search, and paginate through Wazuh alerts stored in Elasticsearch.

**Endpoint:** `POST /api/search/wazuh`

### Request Body
The request expects a JSON object matching the `SearchQuery` schema.

```json
{
  "query": "firewall",  // Optional: Text to search across devname, devid, rule_id, and full_log
  "page": 1,            // Optional: Page number (1-indexed, default: 1)
  "page_size": 10       // Optional: Number of items per page (default: 10, max: 100)
}
```

*Note: The standard `filters` array is currently ignored for Wazuh alerts, but the `query` string supports fuzzy matching and relevance scoring.*

### Response Body
Returns a `WazuhSearchResultsPage` object containing the pagination metadata and the actual alert items.

```json
{
  "items": [
    {
      "id": 1,
      "timestamp": "2023-10-27T10:00:00Z",
      "level": 3,
      "rule_id": "500",
      "devname": "firewall-01",
      "devid": "FW-12345",
      "full_log": "Detected a potential security breach on firewall-01",
      "score": 4.567  // Relevance score from Elasticsearch (null if query is empty)
    }
  ],
  "page": 1,
  "page_size": 10,
  "total": 42,
  "took_ms": 15
}
```

### Frontend Implementation Tips:
* **State Management:** Use your existing Zustand store or React hooks (like `useSearch`) to manage the `page`, `page_size`, and `query` states.
* **Typing:** Ensure your TypeScript interfaces match the `WazuhSearchResult` and `WazuhSearchResultsPage` structure above. `level`, `rule_id`, `devname`, and `devid` can potentially be `null` depending on the raw data sent by Wazuh, so use optional chaining in your UI components.

---

## 2. Ingest Wazuh Alert (Webhook)
This endpoint is primarily used by the Wazuh Manager to send data to our backend. Frontend developers generally will not interact with this, but it is documented here to understand the data flow.

**Endpoint:** `POST /api/ingest/wazuh`

### Request Body
Accepts a raw JSON payload directly from the Wazuh integration. The backend stores the entire payload exactly as received to preserve audit logs, but extracts key fields (`timestamp`, `rule.level`, `rule.id`, `data.devname`, `data.devid`) for the search index.

### Response
```json
{
  "status": "success",
  "id": 123
}
```

---

## 3. Manual Reindex
If the Elasticsearch index ever falls out of sync with the PostgreSQL source-of-truth, this endpoint can be triggered to wipe and rebuild the Wazuh search index.

**Endpoint:** `POST /api/search/wazuh/reindex`

### Request Body
None

### Response
```json
{
  "indexed": 42  // Number of alerts successfully re-indexed
}
```
