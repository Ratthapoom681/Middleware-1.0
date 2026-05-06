from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.elasticsearch.client import es_client
from app.db.elasticsearch.indices import ensure_feature_index, ensure_wazuh_index
from app.db.postgres.base import Base
from app.db.postgres.session import SessionLocal, engine
from app.routers import feature, search, ingest, config, detection
from app.services.feature_service import seed_features
from app.services.index_service import reindex_features, reindex_wazuh_alerts


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Log registered tables for debugging
    tables = list(Base.metadata.tables.keys())
    print(f"Registered tables in metadata: {tables}")
    
    # Retry logic for database connection (essential for server deployments)
    import time
    max_retries = 5
    retry_delay = 5
    db_ready = False
    
    for i in range(max_retries):
        try:
            Base.metadata.create_all(bind=engine)
            print("Database connection successful. Tables ensured.")
            db_ready = True
            break
        except Exception as e:
            print(f"Database connection attempt {i+1} failed: {e}")
            if i < max_retries - 1:
                print(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
            else:
                print("Max retries reached. Could not connect to the database.")
                raise

    if db_ready:
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
    else:
        # If we got here without raising, but db_ready is False (shouldn't happen), yield anyway
        yield
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
app.include_router(detection.router, prefix="/api/detections", tags=["detections"])


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
