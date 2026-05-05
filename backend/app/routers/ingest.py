from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session

from app.db.elasticsearch.client import es_client
from app.db.postgres.session import SessionLocal
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
        alert = wazuh_service.create_wazuh_alert(db, payload, es=es_client)
        return {"status": "success", "id": alert.id}
    except Exception as e:
        # In a real app, we'd log this error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to ingest alert: {str(e)}"
        )
