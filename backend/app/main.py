"""
FastAPI application entry for local uvicorn and AWS Lambda (Mangum).

CORS origins come from CORS_ORIGINS so the same code can allow Vite locally
and the Amplify origin in production. ENVIRONMENT switches between the two:
anything other than "production" gets the permissive local/dev behaviour
(localhost defaults plus a port-hopping regex); "production" requires
CORS_ORIGINS to be set explicitly and allows no regex or wildcard matching.
"""
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

from app.db import engine
from app.rate_limit import RateLimitMiddleware
from app.routes import advice, health, methodology
from app.security_headers import SecurityHeadersMiddleware

load_dotenv()

ENVIRONMENT = os.getenv("ENVIRONMENT", "local")

if ENVIRONMENT == "production":
    _origins_raw = os.getenv("CORS_ORIGINS")
    if not _origins_raw:
        raise RuntimeError(
            "CORS_ORIGINS must be set to the deployed frontend origin(s) when "
            "ENVIRONMENT=production. No wildcard or regex matching is used here."
        )
    CORS_ORIGINS = [origin.strip() for origin in _origins_raw.split(",") if origin.strip()]
    CORS_ORIGIN_REGEX = None
else:
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174",
        ).split(",")
        if origin.strip()
    ]
    # Vite hops to 5174+ when 5173 is busy; the browser Origin must still match.
    CORS_ORIGIN_REGEX = r"https?://(localhost|127\.0\.0\.1):\d+"


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """
    lifespan

    Args:
        _app: FastAPI instance supplied by the framework.

    Yields:
        None while the process is serving requests.

    Startup is empty because the engine is created at import time.
    Shutdown disposes the SQLAlchemy pool so Lambda freezes a clean process.
    """
    yield
    await engine.dispose()


app = FastAPI(title="Form API", lifespan=lifespan)

# Innermost first. Last add_middleware call is outermost on the request.
# Rate limit stays inside CORS so OPTIONS preflight is not counted and 429
# still gets Access-Control-Allow-Origin. Security headers wrap everything.
app.add_middleware(RateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=CORS_ORIGIN_REGEX,
    # No cookies, sessions, or Authorization header — do not advertise credentials.
    allow_credentials=False,
    allow_methods=["GET", "HEAD", "POST", "OPTIONS"],
    allow_headers=["Accept", "Content-Type"],
)
app.add_middleware(SecurityHeadersMiddleware)

app.include_router(health.router, prefix="/api")
app.include_router(methodology.router, prefix="/api")
app.include_router(advice.router, prefix="/api")

# Lambda entrypoint (API Gateway). Locally unused — run with:
#   uvicorn app.main:app --reload
handler = Mangum(app)
