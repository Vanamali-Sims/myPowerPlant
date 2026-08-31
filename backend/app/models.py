from datetime import datetime, timezone

from pydantic import EmailStr
from sqlalchemy import JSON, DateTime
from sqlmodel import Field, SQLModel


class SubmissionBase(SQLModel):
    name: str = Field(min_length=1, max_length=200)
    email: EmailStr = Field(max_length=255)
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


class HouseholdProfileBase(SQLModel):
    postcode: str = Field(default="", max_length=10)
    people: str = Field(default="", max_length=20)
    rooms: str = Field(default="", max_length=20)
    gas: str = Field(default="", max_length=20)
    refrigerators: str = Field(default="", max_length=20)
    dryer: str = Field(default="", max_length=20)
    dryer_week: str = Field(default="", max_length=20)
    dryer_weekend: str = Field(default="", max_length=20)
    heating: str = Field(default="", max_length=40)
    cooling: str = Field(default="", max_length=40)
    hot_water: str = Field(default="", max_length=20)

    monthly_bill: str = Field(default="", max_length=20)
    monthly_kwh: str = Field(default="", max_length=20)
    peak_period: str = Field(default="", max_length=20)
    usage_level: str = Field(default="", max_length=20)
    wfh: str = Field(default="", max_length=20)

    has_solar: str = Field(default="", max_length=10)
    solar_direction: str = Field(default="", max_length=20)
    panel_count: str = Field(default="", max_length=20)
    panel_watts: str = Field(default="", max_length=20)

    battery_units: int = Field(default=1)
    reserve_percent: str = Field(default="", max_length=20)
    battery_age: str = Field(default="", max_length=20)
    battery_model: str = Field(default="", max_length=120)

    provider: str = Field(default="", max_length=120)

    field_sources: dict[str, str] = Field(default_factory=dict, sa_type=JSON)


class HouseholdProfile(HouseholdProfileBase, table=True):
    __tablename__ = "household_profiles"

    id: int | None = Field(default=None, primary_key=True)
    household_id: str = Field(max_length=64, unique=True, index=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_type=DateTime(timezone=True),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_type=DateTime(timezone=True),
    )


class HouseholdProfileCreate(HouseholdProfileBase):
    household_id: str = Field(max_length=64)


class HouseholdProfileRead(HouseholdProfileBase):
    household_id: str
    created_at: datetime
    updated_at: datetime
