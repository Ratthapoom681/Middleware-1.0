# Deployment Guide

This guide covers the production-readiness controls in the Middleware stack: API-key auth, audit logs, structured logging, background maintenance jobs, and error visibility.

## Required Environment

Copy `.env.example` to `.env` and replace all placeholder secrets before deployment.

```env
AUTH_ENABLED=true
API_KEY=<long-random-server-secret>
VITE_API_KEY=<same-key-if-the-browser-app-calls-the-api-directly>
POSTGRES_PASSWORD=<strong-password>
DB_URL=postgresql+psycopg://app:<strong-password>@db:5432/app
FRONTEND_URL=https://middleware.example.com
VITE_API_URL=/api
LOG_LEVEL=INFO
SERVICE_NAME=backend
AUDIT_RETENTION_DAYS=180
APP_LOG_RETENTION_DAYS=30
ERROR_RETENTION_DAYS=90
BACKGROUND_JOB_INTERVAL_SEC=300
INGEST_WORKER_INTERVAL_SEC=5
INGEST_WORKER_BATCH_SIZE=25
DEMO_MODE=false
DEMO_SEED_ON_STARTUP=false
```

For a public deployment, prefer serving the frontend and backend behind a reverse proxy that injects `X-API-Key` server-side. If the browser must send the key, treat `VITE_API_KEY` as public and limit network access accordingly.

## Start And Verify

```powershell
docker compose up -d
docker compose logs -f backend
```

Verify:

```powershell
curl http://localhost:8000/api/health
curl -H "X-API-Key: <API_KEY>" http://localhost:8000/api/ops/summary
```

Open the frontend at `http://localhost:5173/logs`. The Logs page should show API request logs, audit events, unresolved errors, and the latest background job status.

## Operational Controls

- Auth: when `AUTH_ENABLED=true`, every `/api/*` endpoint except `/api/health` requires `X-API-Key` or `Authorization: Bearer <key>`.
- Audit logs: request actor, action, resource, status, IP, user agent, and request ID are persisted in Postgres.
- Structured logs: backend stdout is JSON formatted with request IDs, paths, status codes, actors, and durations.
- Container identity: API logs include the backend service/container. Callers can identify themselves with `X-Caller-Service` and `X-Caller-Container`; reverse proxies may inject these headers.
- Error visibility: unhandled backend exceptions and reported frontend errors are persisted and exposed under `/api/ops/errors`.
- Background jobs: the operations maintenance loop runs every `BACKGROUND_JOB_INTERVAL_SEC` seconds and enforces retention windows. The ingest worker runs every `INGEST_WORKER_INTERVAL_SEC` seconds and processes queued Elasticsearch indexing plus Redmine issue creation.

## Production Checklist

- Set `AUTH_ENABLED=true` and rotate `API_KEY` before sharing the environment.
- Set `FRONTEND_URL` to the deployed origin so CORS is scoped to the frontend.
- Use managed Postgres and Elasticsearch snapshots, or back up Docker volumes regularly.
- Run `npm run build` in `frontend/` before publishing static assets.
- Run `python -m compileall backend` or your backend test suite before shipping.
- Monitor backend JSON logs and the `/logs` UI for failed jobs or unresolved errors after deploy.
