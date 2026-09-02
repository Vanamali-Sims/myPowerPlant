"""
FastAPI application entry for local uvicorn and AWS Lambda (Mangum).

CORS origins come from CORS_ORIGINS so the same code can allow Vite locally
and the Amplify origin in production.
"""
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

from app.db import engine
from app.routes import health, methodology

load_dotenv()

CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174",
    ).split(",")
    if origin.strip()
]


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

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    # Vite hops to 5174+ when 5173 is busy; the browser Origin must still match.
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(methodology.router, prefix="/api")

# Lambda entrypoint (API Gateway). Locally unused — run with:
#   uvicorn app.main:app --reload
handler = Mangum(app)
