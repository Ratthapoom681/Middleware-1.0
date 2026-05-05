# Stack Documentation

This app is a full-stack search-enabled React and FastAPI application. Docker Compose runs the browser frontend, API backend, Postgres database, and Elasticsearch index together for local development.

## Services

| Service | Technology | Port | Purpose |
| --- | --- | --- | --- |
| `frontend` | React 19, Vite 6, TypeScript | `5173` | Browser UI and client-side routing |
| `backend` | FastAPI, Uvicorn, Python 3.12 | `8000` | REST API, CORS, application startup, search/index orchestration |
| `db` | Postgres 16 Alpine | `5432` | Primary relational data store |
| `elasticsearch` | Elasticsearch 8.17 | `9200` | Search index for feature records |

## Frontend

Path: `frontend/`

Main libraries:

- `react` and `react-dom` for UI rendering.
- `react-router-dom` for client-side routes.
- `zustand` for shared UI and search state.
- `axios` for HTTP services.
- `vite` and `typescript` for local development and builds.

Important files:

- `frontend/src/main.tsx` mounts the React app.
- `frontend/src/App.tsx` defines the main layout and routes.
- `frontend/src/styles.css` contains global app styling.
- `frontend/src/services/api.ts` creates the shared Axios client.
- `frontend/src/services/feature.service.ts` calls feature endpoints.
- `frontend/src/services/search.service.ts` calls search endpoints.
- `frontend/src/hooks/useFetch.ts` provides generic fetch state.
- `frontend/src/hooks/useSearch.ts` coordinates search requests.
- `frontend/src/store/` holds shared UI and search state.

Routes:

- `/` dashboard overview.
- `/feature-a` feature table and feature-related UI.
- `/feature-b` backend health/status view.
- `/search` search page backed by Elasticsearch.
- `*` not found fallback.

## Backend

Path: `backend/`

Main libraries:

- `fastapi` for API routes.
- `uvicorn` for the ASGI development server.
- `pydantic-settings` for environment-based settings.
- `SQLAlchemy` and `psycopg` for Postgres access.
- `elasticsearch` Python client for index and search operations.

Important files:

- `backend/main.py` creates the FastAPI app, registers routers, sets CORS, creates database tables, seeds data, and attempts Elasticsearch reindexing during startup.
- `backend/app/core/config.py` reads `.env` settings.
- `backend/app/db/postgres/session.py` creates the SQLAlchemy engine and session factory.
- `backend/app/db/postgres/base.py` imports models for metadata/table creation.
- `backend/app/db/elasticsearch/client.py` creates the Elasticsearch client.
- `backend/app/db/elasticsearch/indices.py` defines and ensures the feature index.
- `backend/app/routers/feature.py` exposes feature CRUD/read endpoints.
- `backend/app/routers/search.py` exposes search endpoints.
- `backend/app/services/feature_service.py` contains feature data logic.
- `backend/app/services/index_service.py` indexes Postgres records into Elasticsearch.
- `backend/app/services/search_service.py` contains search query logic.

API prefixes:

- `/api/health`
- `/api/feature`
- `/api/search`

## Data Stores

Postgres is the source of truth for feature records. SQLAlchemy models live under `backend/app/models/`.

Elasticsearch is the search index. The app creates or verifies the feature index on startup, then reindexes feature records from Postgres when Elasticsearch is available.

Local persistent data directories:

- `data/postgres/`
- `data/elasticsearch/`
- `data/redis/`

Only `.gitkeep` files are tracked in these directories. Runtime data is ignored by Git.

## Environment

The root `.env` file is used by Docker Compose and backend settings. It is ignored by Git.

Expected variables:

```env
DB_URL=postgresql+psycopg://app:app@db:5432/app
API_URL=http://localhost:8000
VITE_API_URL=/api
FRONTEND_URL=http://localhost:5173
ES_URL=http://elasticsearch:9200
POSTGRES_DB=app
POSTGRES_USER=app
POSTGRES_PASSWORD=app
```

For local backend execution outside Docker, use local service hostnames instead:

```env
DB_URL=postgresql+psycopg://app:app@localhost:5432/app
ES_URL=http://localhost:9200
```

## Local Development

Start the full stack:

```powershell
docker compose up
```

Then open:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:8000/api/health`
- Elasticsearch: `http://localhost:9200`

Run frontend scripts from `frontend/`:

```powershell
npm run dev
npm run build
npm run lint
```

Run the backend manually from `backend/` after installing dependencies:

```powershell
uvicorn main:app --reload
```

## Startup Flow

1. Docker Compose starts Postgres and Elasticsearch.
2. Backend installs Python dependencies and starts Uvicorn.
3. FastAPI lifespan creates Postgres tables through SQLAlchemy metadata.
4. Seed feature data is inserted if needed.
5. Elasticsearch index setup runs.
6. Feature records are reindexed for search.
7. Frontend starts Vite and proxies `/api` requests to the backend.

## Git Notes

Tracked:

- Source code.
- Docker Compose config.
- Documentation.
- `.gitkeep` placeholders for data folders.

Ignored:

- `.env`
- `node_modules/`
- build output
- Python bytecode and cache folders
- runtime database/index files under `data/`
