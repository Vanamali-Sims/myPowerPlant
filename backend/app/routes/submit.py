from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models import Submission, SubmissionCreate, SubmissionRead

router = APIRouter()


@router.post("/submit", response_model=SubmissionRead, status_code=201)
async def submit(
    payload: SubmissionCreate,
    session: AsyncSession = Depends(get_session),
) -> Submission:
    row = Submission.model_validate(payload)
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return row
