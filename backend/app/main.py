import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.db import engine
from app.rate_limit import limiter
from app.routes import health, profile
from app.security import SecurityHeadersMiddleware

load_dotenv()

CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]


@asynccontextmanager
async def lifespan(_app: FastAPI):
    yield
    await engine.dispose()


app = FastAPI(
    title="MyPowerPlant API",
    lifespan=lifespan,
    # Keep the response surface uniform. With slash redirects on, a
    # URL-encoded traversal in an identifier returns 307 instead of 404,
    # which is a different response for the same "no such record" case.
    redirect_slashes=False,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    # No cookies or Authorization headers are used - there are no accounts.
    # Leaving credentials enabled would widen the origin check for no benefit.
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["Content-Type"],
)

app.include_router(health.router, prefix="/api")
app.include_router(profile.router, prefix="/api")

# Lambda entrypoint (API Gateway). Locally unused - run with:
#   uvicorn app.main:app --reload
handler = Mangum(app)
