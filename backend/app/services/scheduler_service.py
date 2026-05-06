import asyncio
import logging
from sqlalchemy.orm import Session
from app.db.postgres.session import SessionLocal
from app.services.automation_service import run_automation
from app.models.automation import SchedulerJob

logger = logging.getLogger(__name__)

async def automation_scheduler_loop():
    logger.info("Starting automation scheduler loop...")
    while True:
        try:
            db: Session = SessionLocal()
            try:
                job = db.query(SchedulerJob).filter_by(name="dojo_redmine_sync").first()
                if job and job.is_enabled:
                    logger.info("Executing scheduled automation task...")
                    run_automation(db)
                    interval = job.interval_minutes * 60
                else:
                    # If not enabled, check every minute
                    interval = 60
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Scheduler loop error: {e}")
            interval = 60
            
        await asyncio.sleep(interval)

def start_scheduler():
    asyncio.create_task(automation_scheduler_loop())
