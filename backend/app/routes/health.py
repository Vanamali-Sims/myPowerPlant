"""
Liveness route used by local checks and later by a load balancer.
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health() -> dict[str, str]:
    """
    health

    Returns:
        dict[str, str]: {"status": "ok"} when the process is up.

    Does not open the database. A 200 here only means the app imported.
    Use it for a cheap process check, not for schema or data health.
    """
    return {"status": "ok"}
