# Frontend Detection Configuration API

This document provides details for frontend developers to build the configuration UI for the detection rules engine.

## API Endpoints

- **GET /api/config/detection**: Fetch the current rule thresholds.
- **PUT /api/config/detection**: Update the rule thresholds.

### JSON Schema

```json
{
  "brute_force_threshold": 5,
  "brute_force_timeframe_sec": 60,
  "abnormal_ports": [4444, 1337],
  "impossible_travel_timeframe_sec": 3600,
  "port_scan_threshold": 10,
  "port_scan_timeframe_sec": 60
}
```

## Global Services

If you need to configure global integrations like **Redmine**, please refer to:
[system_config_api.md](file:///C:/Users/ifilm/เดสก์ท็อป/Middleware%201.0/docs/system_config_api.md)
