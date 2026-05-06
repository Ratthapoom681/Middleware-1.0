from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session

from app.db.postgres.session import SessionLocal
from app.core.config import settings
from app.services.demo_service import load_sample_wazuh_payloads, seed_demo_wazuh_alerts
from app.services import wazuh_service


router = APIRouter()


# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/wazuh", status_code=status.HTTP_201_CREATED)
async def ingest_wazuh_alert(
    payload: dict[str, Any] = Body(...), 
    db: Session = Depends(get_db)
):
    """
    Endpoint to receive alerts from Wazuh via webhooks.
    Stores the full JSON payload and extracts key fields for querying.
    """
    try:
        alert = wazuh_service.create_wazuh_alert(db, payload)
        return {"status": "success", "id": alert.id, "queued": ["index_wazuh_alert", "create_external_issue"]}
    except Exception as e:
        # In a real app, we'd log this error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to ingest alert: {str(e)}"
        )


@router.get("/wazuh/samples")
def list_wazuh_samples() -> dict[str, Any]:
    return {"items": load_sample_wazuh_payloads()}


@router.post("/wazuh/demo-seed", status_code=status.HTTP_201_CREATED)
def seed_wazuh_demo_alerts(db: Session = Depends(get_db)) -> dict[str, Any]:
    if not settings.demo_mode:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Demo mode is disabled. Set DEMO_MODE=true to enable sample seeding.",
        )

    result = seed_demo_wazuh_alerts(db)
    return {"status": "success", **result}
