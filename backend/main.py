from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.elasticsearch.client import es_client
from app.db.elasticsearch.indices import ensure_feature_index, ensure_wazuh_index
from app.db.postgres.base import Base
from app.db.postgres.session import SessionLocal, engine
from app.routers import feature, search, ingest, config
from app.services.feature_service import seed_features
from app.services.index_service import reindex_features, reindex_wazuh_alerts


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Log registered tables for debugging
    tables = list(Base.metadata.tables.keys())
    print(f"Registered tables in metadata: {tables}")
    
    Base.metadata.create_all(bind=engine)
    print("Database tables ensured.")
    
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


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
