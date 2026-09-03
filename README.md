# Full-stack starter (local → AWS)

Local development layout for a React frontend and a FastAPI backend that can move to **Lambda + API Gateway + Aurora PostgreSQL + Amplify Hosting** without rewriting application code.

The FastAPI `app` object lives in `backend/app/main.py` and is already wrapped with Mangum. Locally you run uvicorn against that same object. In AWS, Lambda invokes `handler`.

## Prerequisites

- Python 3.13 (3.12 works for local if 3.13 is not installed)
- Node.js 20.19+ or 22.12+ (Vite 8)
- Docker, for the local Postgres 16 container
- npm

## Run locally

Open three terminals and do not run the API before docker is up.

### 1. Postgres

```bash
cd backend
docker compose up -d
```

Copy the env file once:

```bash
copy .env.example .env
```

On macOS/Linux use `cp .env.example .env`.

### 2. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

On macOS/Linux activate with `source .venv/bin/activate`.

API:

- `GET http://localhost:8000/api/health`
- `POST http://localhost:8000/api/submit`
- Docs: `http://localhost:8000/docs`

CORS allows the Vite origin (`http://localhost:5173`) via `CORS_ORIGINS`.

### 3. Frontend

```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`. The form POSTs to `${VITE_API_BASE_URL}/api/submit`.


## Environment

| Variable | Where | Local value | Later |
| --- | --- | --- | --- |
| `DATABASE_URL` | `backend/.env` | `postgresql+asyncpg://app:app@localhost:5432/app` | Aurora / RDS connection string (same `postgresql+asyncpg://` scheme) |
| `CORS_ORIGINS` | `backend/.env` | `http://localhost:5173` | Add the Amplify origin, comma-separated |
| `VITE_API_BASE_URL` | `frontend/.env` | `http://localhost:8000` | API Gateway base URL (no trailing slash) |

Do not hardcode `localhost` in fetch calls. Changing `VITE_API_BASE_URL` is enough to point the same frontend at API Gateway.

## What changes when deploying to AWS

Application code stays as-is. You change packaging, env vars, and the process that serves `app`.

### Lambda + API Gateway

- Handler: `app.main.handler` (`handler = Mangum(app)` in `main.py`)
- Package `backend/` (or a Lambda container image) with the same `requirements.txt`
- Do **not** run uvicorn in Lambda
- Map API Gateway to the FastAPI routes (`/api/health`, `/api/submit`)
- Set `DATABASE_URL` and `CORS_ORIGINS` on the function
- For Aurora in a VPC, place the function in the same VPC (or use RDS Proxy)

### Aurora PostgreSQL

1. Replace `DATABASE_URL` in the Lambda environment with the Aurora writer URL
2. Run `alembic upgrade head` once against that database (CI job, bastion, or one-off task)
3. Stop using `docker compose` in production

The app already uses SQLAlchemy 2.x async + asyncpg, which is the intended driver for Aurora as well.

### Amplify Hosting

1. App root: `frontend/`
2. Build: `npm ci && npm run build`
3. Artifact: `dist`
4. At build time set `VITE_API_BASE_URL` to the API Gateway URL (Amplify environment variable)

No frontend code change is required.

## Migrations

```bash
cd backend
alembic upgrade head
alembic revision --autogenerate -m "describe the change"
```

Alembic uses the same async `DATABASE_URL` as the app.

## Not included yet

Auth, S3, and SNS are intentionally omitted. This starter is meant to stay runnable with `docker compose up`, `uvicorn`, and `npm run dev`.
