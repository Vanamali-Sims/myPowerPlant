"""
Contact-form POST used by the starter submit client.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models import Submission, SubmissionCreate, SubmissionRead

router = APIRouter()


@router.post("/submit", response_model=SubmissionRead, status_code=201)
async def submit(
    payload: SubmissionCreate,
    session: AsyncSession = Depends(get_session),
) -> Submission:
    """
    submit

    Args:
        payload: Name, email, and message from the contact form.
        session: Request-scoped SQLAlchemy session.

    Returns:
        Submission: The stored row including id and created_at.

    Inserts one submissions row. A down database becomes HTTP 503 so the
    client can keep using local storage without treating it as bad input.
    """
    row = Submission.model_validate(payload)
    session.add(row)
    try:
        await session.commit()
        await session.refresh(row)
    except OperationalError as exc:
        await session.rollback()
        raise HTTPException(status_code=503, detail="Database unavailable") from exc
    return row
