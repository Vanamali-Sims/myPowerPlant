from datetime import datetime, timezone

from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel


class SubmissionBase(SQLModel):
    name: str = Field(min_length=1, max_length=200)
    email: str = Field(
        min_length=3,
        max_length=255,
        pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
    )
    message: str = Field(min_length=1, max_length=2000)


class Submission(SubmissionBase, table=True):
    __tablename__ = "submissions"

    id: int | None = Field(default=None, primary_key=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_type=DateTime(timezone=True),
    )


class SubmissionCreate(SubmissionBase):
    pass


class SubmissionRead(SubmissionBase):
    id: int
    created_at: datetime
