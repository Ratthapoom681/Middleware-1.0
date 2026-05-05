# Frontend Detection Configuration API

This document provides details for frontend developers to build the dynamic configuration UI for the new detection rules engine.

## Dynamic Configuration Architecture

Unlike traditional APIs with rigid schemas, the detection configuration API stores settings as an arbitrary JSON object in the database. This allows the frontend to save, update, and add entirely new configuration keys without requiring any backend database migrations or schema changes.

### 1. Get Configuration

Fetch the current configuration settings.

- **Endpoint:** `GET /api/config/detection`
- **Response:** Returns the full JSON object containing all configuration keys.
  ```json
  {
    "brute_force_threshold": 5,
    "brute_force_timeframe_sec": 60,
    "abnormal_ports": [4444, 1337],
    "impossible_travel_timeframe_sec": 3600,
    "port_scan_threshold": 10,
    "port_scan_timeframe_sec": 60,
    "any_new_key": "any_value"
  }
  ```

### 2. Update Configuration

Update the configuration settings. The backend will take the payload and update the settings JSON object.

- **Endpoint:** `PUT /api/config/detection`
- **Request Payload:** Any valid JSON object. To add a new rule configuration, simply pass it in the payload.
  ```json
  {
    "brute_force_threshold": 10,
    "new_custom_rule_threshold": 50
  }
  ```
- **Response:** Returns the newly updated, full JSON object.

## UI/UX Recommendations

- **Dynamic Form Fields:** Since the backend accepts arbitrary JSON, you can build a UI that allows administrators to click "Add New Configuration", specify a key name, select a type (number, string, list), and save it.
- **Time Inputs:** While the API expects seconds (e.g., `3600`), consider providing a UI that allows users to select Minutes or Hours and converting to seconds before sending to the API.
- **Port Lists:** For arrays like `abnormal_ports`, use a tag-input component.
