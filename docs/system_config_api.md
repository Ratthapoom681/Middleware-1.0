# Redmine Integration Service

The Redmine integration is now a standalone global service. Any part of the application can utilize it to create issues.

## Configuration API

The Redmine settings are managed through a dedicated endpoint.

- **GET /api/config/redmine**: Fetch the current global Redmine configuration.
- **PUT /api/config/redmine**: Update the Redmine configuration.

### JSON Schema

```json
{
  "enabled": true,
  "url": "https://redmine.example.com",
  "api_key": "your_api_key",
  "project_id": "project-id",
  "tracker_id": 1
}
```

## Developer Usage

To use the Redmine service in a new Python module:

```python
from app.db.postgres.session import SessionLocal
from app.models.config import RedmineConfig
from app.services.redmine_service import create_redmine_issue

db = SessionLocal()
config = db.query(RedmineConfig).first()

if config and config.enabled:
    create_redmine_issue({
        "redmine_url": config.url,
        "redmine_api_key": config.api_key,
        "redmine_project_id": config.project_id,
        "redmine_tracker_id": config.tracker_id
    }, {
        "title": "My Alert",
        "description": "Details...",
        "use_case": "My Service",
        "severity": "high"
    })
```
