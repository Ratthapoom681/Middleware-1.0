from typing import Dict, Any
from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session

from app.db.postgres.session import SessionLocal
from app.models.config import DetectionConfig

router = APIRouter()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

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
    Accepts an arbitrary JSON object to add or update configuration keys.
    """
    config = db.query(DetectionConfig).first()
    if not config:
        config = DetectionConfig(settings={})
        db.add(config)
        
    # We update the settings dictionary with the new payload.
    # If the user wants to merge instead of replace, we do:
    current_settings = dict(config.settings)
    current_settings.update(payload)
    config.settings = current_settings
    
    db.commit()
    db.refresh(config)
    return config.settings
