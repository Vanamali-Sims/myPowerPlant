"""Household profile endpoints.

Access control model (Security Plan S6). There is no authentication, so the
external identifier IS the capability: a server-generated UUIDv4 with 122 bits
of entropy. Consequences that follow, and are deliberate:

* The client cannot choose its own identifier - POST issues one.
* Unknown OR malformed identifiers return 404, never 403 or 422, so the
  endpoint does not confirm whether a record exists.
* Anyone holding an identifier can read and overwrite that one record. That is
  inherent to a capability URL and is accepted; the mitigation is that the
  identifier is unguessable, not that the holder is authenticated.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models import (
    HouseholdProfile,
    HouseholdProfileCreated,
    HouseholdProfileRead,
    HouseholdProfileWrite,
)
from app.rate_limit import limiter

router = APIRouter()

NOT_FOUND = "Profile not found"


def _valid_identifier(household_id: str) -> bool:
    """A well-formed UUIDv4 and nothing else."""
    try:
        parsed = uuid.UUID(household_id)
    except ValueError:
        return False
    return parsed.version == 4 and str(parsed) == household_id.lower()


async def _load(session: AsyncSession, household_id: str) -> HouseholdProfile:
    if not _valid_identifier(household_id):
        # Same response as a genuine miss: a malformed identifier must not be
        # distinguishable from an unknown one.
        raise HTTPException(status_code=404, detail=NOT_FOUND)
    try:
        row = await session.scalar(
            select(HouseholdProfile).where(HouseholdProfile.household_id == household_id)
        )
    except OperationalError as exc:
        raise HTTPException(status_code=503, detail="Database unavailable") from exc
    if not row:
        raise HTTPException(status_code=404, detail=NOT_FOUND)
    return row


@router.post("/profile", response_model=HouseholdProfileCreated, status_code=201)
@limiter.limit("10/hour")
async def create_profile(
    request: Request,
    payload: HouseholdProfileWrite,
    session: AsyncSession = Depends(get_session),
) -> HouseholdProfileCreated:
    """Create a profile and issue its identifier.

    The identifier is generated here with uuid4() and is the only way the
    record can ever be addressed (Security Plan S6.1).
    """
    household_id = str(uuid.uuid4())
    row = HouseholdProfile(household_id=household_id, **payload.model_dump())
    session.add(row)
    try:
        await session.commit()
    except OperationalError as exc:
        await session.rollback()
        raise HTTPException(status_code=503, detail="Database unavailable") from exc
    return HouseholdProfileCreated(household_id=household_id)


@router.put("/profile/{household_id}", response_model=HouseholdProfileRead)
@limiter.limit("60/hour")
async def update_profile(
    request: Request,
    household_id: str,
    payload: HouseholdProfileWrite,
    session: AsyncSession = Depends(get_session),
) -> HouseholdProfile:
    """Replace an existing profile. Will not create one - use POST for that.

    PUT is a full replacement, and HouseholdProfileWrite requires every field
    that matters, so a partial body is rejected rather than silently blanking
    stored values.
    """
    row = await _load(session, household_id)
    for key, value in payload.model_dump().items():
        setattr(row, key, value)
    row.updated_at = datetime.now(timezone.utc)
    try:
        await session.commit()
        await session.refresh(row)
    except OperationalError as exc:
        await session.rollback()
        raise HTTPException(status_code=503, detail="Database unavailable") from exc
    return row


@router.get("/profile/{household_id}", response_model=HouseholdProfileRead)
@limiter.limit("60/hour")
async def get_profile(
    request: Request,
    household_id: str,
    session: AsyncSession = Depends(get_session),
) -> HouseholdProfile:
    return await _load(session, household_id)
