"""Test fixtures.

Tests run against a throwaway SQLite database rather than Postgres. The
controls under test - identifier issuance, validation, headers, rate limiting -
are database-independent. Anything Postgres-specific (row-level behaviour,
driver handling) is out of scope for this suite and is covered by the
iteration vulnerability assessment instead.
"""

import itertools
import os
import tempfile

import pytest

os.environ.setdefault(
    "DATABASE_URL",
    f"sqlite+aiosqlite:///{os.path.join(tempfile.mkdtemp(), 'test.db')}",
)
os.environ.setdefault("CORS_ORIGINS", "http://localhost:5173")

import httpx  # noqa: E402
from sqlmodel import SQLModel  # noqa: E402

from app.db import engine  # noqa: E402
from app.main import app  # noqa: E402

VALID_PROFILE = {
    "postcode": "3101", "people": "3", "rooms": "6", "gas": "yes",
    "refrigerators": "2", "dryer": "yes", "dryer_week": "2",
    "dryer_weekend": "1", "heating": "gas", "cooling": "air_conditioning",
    "hot_water": "yes", "monthly_bill": "180", "monthly_kwh": "540",
    "peak_period": "evening", "usage_level": "moderate", "wfh": "yes",
    "has_solar": "yes", "solar_direction": "S", "panel_count": "12",
    "panel_watts": "400", "battery_units": 1, "reserve_percent": "20",
    "battery_age": "2", "battery_model": "Tesla Powerwall 2",
    "provider": "AGL Energy", "field_sources": {},
}

_ip_counter = itertools.count(1)


@pytest.fixture
def profile():
    """A valid profile body. Mutate freely - each test gets its own copy."""
    return dict(VALID_PROFILE)


@pytest.fixture
async def client():
    """HTTP client with a unique source IP, so per-IP rate limiting in one
    test cannot throttle another."""
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    octet = next(_ip_counter)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://testserver",
        headers={"X-Forwarded-For": f"198.51.100.{octet % 254 + 1}"},
    ) as c:
        yield c
