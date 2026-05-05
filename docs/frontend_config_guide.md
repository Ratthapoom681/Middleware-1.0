# Frontend Configuration UI Development Guide

This guide details how to implement the UI for managing both the **Detection Rules** and the **Redmine Integration**.

---

## 1. Detection Rules (Dynamic Configuration)

The detection rules use a **Dynamic JSON** store. This allows you to add new configuration keys from the UI without any backend changes.

### API Endpoints
- **Fetch Rules**: `GET /api/config/detection`
- **Update Rules**: `PUT /api/config/detection`

### UI Implementation Tips
- **Dynamic Form**: Since the keys are arbitrary, the UI should be able to render a list of key-value pairs.
- **Add New Rule**: Provide a way to add a "New Rule Key" (e.g., a text input for the key name and another for the value).
- **Data Types**: The backend accepts nested JSON, but for rule thresholds, it's typically `number`, `string`, or `array of numbers`.

**Example JSON Response:**
```json
{
  "brute_force_threshold": 5,
  "brute_force_timeframe_sec": 60,
  "abnormal_ports": [4444, 1337]
}
```

---

## 2. Redmine Integration (Static Configuration)

The Redmine integration uses a **Static Schema**. It has specific fields that must be provided.

### API Endpoints
- **Fetch Settings**: `GET /api/config/redmine`
- **Update Settings**: `PUT /api/config/redmine`

### UI Implementation Tips
- **Toggle Switch**: Use a toggle for the `enabled` field.
- **Password/API Key Masking**: Use a password-type input for `api_key`.
- **Validation**:
    - `url` must be a valid URL.
    - `project_id` is required if enabled.

**JSON Payload Structure:**
```json
{
  "enabled": true,
  "url": "https://redmine.example.com",
  "api_key": "your_api_key",
  "project_id": "project-name",
  "tracker_id": 1
}
```

---

## 3. Recommended Dashboard Layout

We recommend a **"Settings"** page with two tabs or sections:

### Section A: Security Detection Rules
- List all existing keys with editable values.
- "Add New Parameter" button to define a new threshold key.
- "Save" button to PUT the entire object back to the server.

### Section B: Redmine Integration
- A standard form with the 5 specific fields mentioned above.
- "Save" button to PUT the configuration.

---

## 4. API Client Examples (Axios)

### Updating Detection Rules
```javascript
const saveDetectionRules = async (settings) => {
  const response = await axios.put('/api/config/detection', settings);
  return response.data;
};
```

### Updating Redmine Settings
```javascript
const saveRedmineSettings = async (config) => {
  const response = await axios.put('/api/config/redmine', config);
  return response.data;
};
```
