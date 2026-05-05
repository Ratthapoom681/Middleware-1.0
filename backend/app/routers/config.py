from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, Body
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.postgres.session import SessionLocal
from app.models.config import DetectionConfig, RedmineConfig

router = APIRouter()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Detection Config Endpoints ---

@router.get("/detection", response_model=Dict[str, Any])
def get_detection_config(db: Session = Depends(get_db)):
    """
    Get the current dynamic detection configuration.
    """
    config = db.query(DetectionConfig).first()
    if not config:
        config = DetectionConfig(settings={
            "brute_force_threshold": 5,
            "brute_force_timeframe_sec": 60,
            "abnormal_ports": [4444, 1337],
            "impossible_travel_timeframe_sec": 3600,
            "port_scan_threshold": 10,
            "port_scan_timeframe_sec": 60
        })
        db.add(config)
        db.commit()
        db.refresh(config)
    return config.settings

@router.put("/detection", response_model=Dict[str, Any])
def update_detection_config(payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    """
    Update the dynamic detection configuration.
    """
    config = db.query(DetectionConfig).first()
    if not config:
        config = DetectionConfig(settings={})
        db.add(config)
        
    current_settings = dict(config.settings)
    current_settings.update(payload)
    config.settings = current_settings
    
    db.commit()
    db.refresh(config)
    return config.settings

# --- Redmine Config Endpoints ---

class RedmineConfigSchema(BaseModel):
    enabled: bool
    url: str
    api_key: str
    project_id: str
    tracker_id: Optional[int] = None

    class Config:
        from_attributes = True

@router.get("/redmine", response_model=RedmineConfigSchema)
def get_redmine_config(db: Session = Depends(get_db)):
    """
    Get the global Redmine integration configuration.
    """
    config = db.query(RedmineConfig).first()
    if not config:
        config = RedmineConfig()
        db.add(config)
        db.commit()
        db.refresh(config)
    return config

@router.put("/redmine", response_model=RedmineConfigSchema)
def update_redmine_config(payload: RedmineConfigSchema, db: Session = Depends(get_db)):
    """
    Update the global Redmine integration configuration.
    """
    config = db.query(RedmineConfig).first()
    if not config:
        config = RedmineConfig()
        db.add(config)
        
    config.enabled = payload.enabled
    config.url = payload.url
    config.api_key = payload.api_key
    config.project_id = payload.project_id
    config.tracker_id = payload.tracker_id
    
    db.commit()
    db.refresh(config)
    return config
