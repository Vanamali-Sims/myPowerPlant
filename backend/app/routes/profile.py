"""
Household-profile read and upsert keyed by the client-generated household id.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models import HouseholdProfile, HouseholdProfileCreate, HouseholdProfileRead

router = APIRouter()


@router.put("/profile/{household_id}", response_model=HouseholdProfileRead)
async def upsert_profile(
    household_id: str,
    payload: HouseholdProfileCreate,
    session: AsyncSession = Depends(get_session),
) -> HouseholdProfile:
    """
    upsert_profile

    Args:
        household_id: Client-generated household id from the URL.
        payload: Profile fields from the frontend.
        session: Request-scoped SQLAlchemy session.

    Returns:
        HouseholdProfile: The stored row after commit.

    Inserts a new household profile or replaces the existing one.
    Used by the setup wizard and later profile edits.
    """
    # Body and path must agree so a client cannot overwrite another household.
    if payload.household_id != household_id:
        raise HTTPException(status_code=400, detail="household_id mismatch")

    data = payload.model_dump(exclude={"household_id"})
    try:
        existing = await session.scalar(
            select(HouseholdProfile).where(HouseholdProfile.household_id == household_id)
        )
        if existing:
            for key, value in data.items():
                setattr(existing, key, value)
            existing.updated_at = datetime.now(timezone.utc)
            row = existing
        else:
            row = HouseholdProfile(household_id=household_id, **data)
            session.add(row)
        await session.commit()
        await session.refresh(row)
    except OperationalError as exc:
        await session.rollback()
        raise HTTPException(status_code=503, detail="Database unavailable") from exc
    return row


@router.get("/profile/{household_id}", response_model=HouseholdProfileRead)
async def get_profile(
    household_id: str,
    session: AsyncSession = Depends(get_session),
) -> HouseholdProfile:
    """
    get_profile

    Args:
        household_id: Client-generated household id from the URL.
        session: Request-scoped SQLAlchemy session.

    Returns:
        HouseholdProfile: The stored row for that household.

    Returns 404 when this browser has never synced a profile.
    Database outages are 503 so the frontend can keep using localStorage.
    """
    try:
        row = await session.scalar(
            select(HouseholdProfile).where(HouseholdProfile.household_id == household_id)
        )
    except OperationalError as exc:
        raise HTTPException(status_code=503, detail="Database unavailable") from exc
    if not row:
        raise HTTPException(status_code=404, detail="Profile not found")
    return row
