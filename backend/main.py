import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.db.elasticsearch.client import es_client
from app.db.elasticsearch.indices import ensure_feature_index, ensure_wazuh_index
from app.db.postgres.base import Base
from app.db.postgres.session import SessionLocal, engine
from app.routers import feature, search, ingest, config, dojo
from app.services.feature_service import seed_features
from app.services.index_service import reindex_features, reindex_wazuh_alerts
from app.services.scheduler_service import start_scheduler

logger = logging.getLogger(__name__)


def run_migrations():
    """Add missing columns to existing tables (safe to re-run)."""
    migrations = [
        ("dojo_findings", "cve", "VARCHAR(120)"),
        ("dojo_findings", "ip", "VARCHAR(64)"),
        ("dojo_findings", "port", "INTEGER"),
        ("dojo_findings", "cvss", "DOUBLE PRECISION"),
        ("redmine_configs", "enable_automation", "BOOLEAN DEFAULT false"),
        ("redmine_configs", "default_assignee_id", "INTEGER"),
        ("redmine_configs", "auto_close_resolved_ticket", "BOOLEAN DEFAULT false"),
    ]
    with engine.connect() as conn:
        for table, column, col_type in migrations:
            try:
                result = conn.execute(text(
                    f"SELECT column_name FROM information_schema.columns "
                    f"WHERE table_name='{table}' AND column_name='{column}'"
                ))
                if result.fetchone() is None:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))
                    logger.info(f"Added column {column} to {table}")
            except Exception as e:
                logger.warning(f"Migration skip {table}.{column}: {e}")
        conn.commit()


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    run_migrations()
    db = SessionLocal()

    try:
        seed_features(db)

        try:
            ensure_feature_index(es_client)
            reindex_features(db, es_client)
            
            ensure_wazuh_index(es_client)
            reindex_wazuh_alerts(db, es_client)
        except Exception:
            # Keep the API available even if Elasticsearch is still booting.
            pass

        start_scheduler()

        yield
    finally:
        db.close()
        es_client.close()


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(feature.router, prefix="/api/feature", tags=["feature"])
app.include_router(search.router, prefix="/api/search", tags=["search"])
app.include_router(ingest.router, prefix="/api/ingest", tags=["ingest"])
app.include_router(config.router, prefix="/api/config", tags=["config"])
app.include_router(dojo.router, prefix="/api/dojo", tags=["dojo"])


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
