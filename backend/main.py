import asyncio
import logging
import time
import uuid
from contextlib import asynccontextmanager
from time import perf_counter

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import configure_logging
from app.core.runtime import caller_identity, runtime_identity
from app.db.elasticsearch.client import es_client
from app.db.elasticsearch.indices import ensure_feature_index, ensure_wazuh_index
from app.db.postgres.base import Base
from app.db.postgres.session import SessionLocal, engine
from app.dependencies.auth import is_authenticated
from app.routers import feature, search, ingest, config, detection, operations
from app.services.background_jobs import ingest_worker_loop, operations_job_loop
from app.services.demo_service import seed_demo_wazuh_alerts_if_empty
from app.services.feature_service import seed_features
from app.services.health_service import build_health_report
from app.services.index_service import reindex_features, reindex_wazuh_alerts
from app.services.observability import record_app_log, record_audit_event, record_error_event


configure_logging(settings.log_level)
logger = logging.getLogger("middleware.api")


AUTH_EXEMPT_PATHS = ("/api/health",)


def _requires_auth(path: str) -> bool:
    return path.startswith("/api") and not any(path == exempt for exempt in AUTH_EXEMPT_PATHS)


def _action_for_method(method: str) -> str:
    return {
        "GET": "read",
        "POST": "create",
        "PUT": "update",
        "PATCH": "update",
        "DELETE": "delete",
    }.get(method.upper(), "request")


def _client_ip(scope_client: tuple[str, int] | None) -> str | None:
    if not scope_client:
        return None
    return scope_client[0]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Log registered tables for debugging
    tables = list(Base.metadata.tables.keys())
    logger.info("registered database tables", extra={"tables": tables})
    
    # Retry logic for database connection (essential for server deployments)
    max_retries = 5
    retry_delay = 5
    db_ready = False
    
    for i in range(max_retries):
        try:
            Base.metadata.create_all(bind=engine)
            logger.info("database connection successful; tables ensured")
            db_ready = True
            break
        except Exception as e:
            logger.warning("database connection attempt failed", extra={"attempt": i + 1, "error": str(e)})
            if i < max_retries - 1:
                logger.info("retrying database connection", extra={"retry_delay_sec": retry_delay})
                time.sleep(retry_delay)
            else:
                logger.exception("max database retries reached")
                raise

    stop_event: asyncio.Event | None = None
    job_task: asyncio.Task[None] | None = None
    ingest_worker_task: asyncio.Task[None] | None = None

    if db_ready:
        db = SessionLocal()
        try:
            seed_features(db)
            if settings.demo_mode and settings.demo_seed_on_startup:
                try:
                    result = seed_demo_wazuh_alerts_if_empty(db)
                    logger.info("demo wazuh seed completed", extra=result)
                except Exception:
                    logger.exception("demo wazuh seed failed")

            try:
                ensure_feature_index(es_client)
                reindex_features(db, es_client)
                
                ensure_wazuh_index(es_client)
                reindex_wazuh_alerts(db, es_client)
            except Exception:
                # Keep the API available even if Elasticsearch is still booting.
                logger.exception("elasticsearch startup sync failed")

            stop_event = asyncio.Event()
            app.state.operations_job_stop_event = stop_event
            job_task = asyncio.create_task(operations_job_loop(stop_event))
            app.state.operations_job_task = job_task
            ingest_worker_task = asyncio.create_task(ingest_worker_loop(stop_event))
            app.state.ingest_worker_task = ingest_worker_task
            yield
        finally:
            if stop_event is not None:
                stop_event.set()
            if job_task is not None:
                try:
                    await asyncio.wait_for(job_task, timeout=5)
                except asyncio.TimeoutError:
                    job_task.cancel()
            if ingest_worker_task is not None:
                try:
                    await asyncio.wait_for(ingest_worker_task, timeout=5)
                except asyncio.TimeoutError:
                    ingest_worker_task.cancel()
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
app.include_router(operations.router, prefix="/api/ops", tags=["operations"])


@app.middleware("http")
async def production_middleware(request, call_next):
    started = perf_counter()
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    request.state.actor = "anonymous"

    if request.method != "OPTIONS" and _requires_auth(request.url.path) and not is_authenticated(request):
        caller = caller_identity(request)
        runtime = runtime_identity()
        db = SessionLocal()
        try:
            record_audit_event(
                db,
                actor="unknown",
                action="auth_failed",
                resource=request.url.path,
                method=request.method,
                path=request.url.path,
                status_code=401,
                ip_address=_client_ip(request.client),
                user_agent=request.headers.get("user-agent"),
                request_id=request_id,
                details={**caller, "api_container": runtime["container"], "api_service": runtime["service"]},
            )
            record_app_log(
                db,
                level="WARN",
                source="Auth",
                message=f"Unauthorized request rejected: {request.method} {request.url.path}",
                request_id=request_id,
                path=request.url.path,
                status_code=401,
                details={**caller, "api_container": runtime["container"], "api_service": runtime["service"]},
            )
        finally:
            db.close()

        logger.warning(
            "unauthorized request rejected",
            extra={"request_id": request_id, "method": request.method, "path": request.url.path, "status_code": 401},
        )
        return JSONResponse(
            status_code=401,
            content={"detail": "Valid API key required", "request_id": request_id},
            headers={"X-Request-ID": request_id},
        )

    response = None
    try:
        response = await call_next(request)
    except Exception as exc:
        duration_ms = int((perf_counter() - started) * 1000)
        caller = caller_identity(request)
        runtime = runtime_identity()
        db = SessionLocal()
        try:
            record_error_event(
                db,
                error=exc,
                method=request.method,
                path=request.url.path,
                request_id=request_id,
                details={**caller, "api_container": runtime["container"], "api_service": runtime["service"], "duration_ms": duration_ms},
            )
            record_app_log(
                db,
                level="ERROR",
                source="Errors",
                message=f"Unhandled exception: {type(exc).__name__}",
                request_id=request_id,
                path=request.url.path,
                status_code=500,
                details={**caller, "api_container": runtime["container"], "api_service": runtime["service"], "duration_ms": duration_ms},
            )
        finally:
            db.close()

        logger.exception(
            "unhandled request exception",
            extra={"request_id": request_id, "method": request.method, "path": request.url.path, "status_code": 500, "duration_ms": duration_ms},
        )
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error", "request_id": request_id},
            headers={"X-Request-ID": request_id},
        )

    duration_ms = int((perf_counter() - started) * 1000)
    response.headers["X-Request-ID"] = request_id

    if request.url.path.startswith("/api") and request.url.path not in AUTH_EXEMPT_PATHS:
        status_code = response.status_code
        level = "ERROR" if status_code >= 500 else "WARN" if status_code >= 400 else "INFO"
        actor = getattr(request.state, "actor", "anonymous")
        caller = caller_identity(request)
        runtime = runtime_identity()
        identity_details = {
            **caller,
            "api_container": runtime["container"],
            "api_service": runtime["service"],
            "duration_ms": duration_ms,
        }
        db = SessionLocal()
        try:
            record_app_log(
                db,
                level=level,
                source="API",
                message=f"{request.method} {request.url.path} completed with {status_code}",
                request_id=request_id,
                path=request.url.path,
                status_code=status_code,
                details=identity_details,
            )
            record_audit_event(
                db,
                actor=actor,
                action=_action_for_method(request.method),
                resource=request.url.path,
                method=request.method,
                path=request.url.path,
                status_code=status_code,
                ip_address=_client_ip(request.client),
                user_agent=request.headers.get("user-agent"),
                request_id=request_id,
                details=identity_details,
            )
        finally:
            db.close()

        logger.info(
            "request completed",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": status_code,
                "actor": actor,
                "duration_ms": duration_ms,
            },
        )

    return response


@app.get("/api/health")
def health_check() -> dict:
    db = SessionLocal()
    try:
        return build_health_report(db, es_client)
    finally:
        db.close()
