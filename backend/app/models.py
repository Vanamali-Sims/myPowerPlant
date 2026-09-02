"""
SQLModel tables and request/response shapes for submissions and profiles.

Column max_length values are schema constraints. Change them only with a
migration — they are not shared frontend constants.
"""
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


class Appliance(SQLModel, table=True):
    """
    One published usage figure per appliance.

    hours_per_week is the reference weekly figure. usage_basis says how it was
    derived, so the KPI engine knows when a household answer may replace it:
    per_cycle and per_person rows scale, daily_average and always_on do not.

    power_kw is the average draw while the appliance is in use, not a nameplate
    rating — compressors and elements cycle, so nameplate held over every hour
    of use overstates them badly.
    """

    __tablename__ = "appliances"

    id: str = Field(max_length=40, primary_key=True)
    category: str = Field(max_length=40)
    name: str = Field(max_length=80)
    power_kw: float
    power_basis: str = Field(max_length=200)
    hours_per_week: float
    usage_basis: str = Field(max_length=20)
    season_basis: str = Field(max_length=20, foreign_key="seasonal_factors.basis")
    hours_per_cycle: float | None = None
    cycles_per_week: float | None = None
    reported_metric: str = Field(max_length=200)
    source_label: str = Field(max_length=200)


class SeasonalFactor(SQLModel, table=True):
    """Share of the reference weekly hours that applies in each AU season."""

    __tablename__ = "seasonal_factors"

    basis: str = Field(max_length=20, primary_key=True)
    summer: float
    autumn: float
    winter: float
    spring: float


class BatteryModel(SQLModel, table=True):
    __tablename__ = "battery_models"

    name: str = Field(max_length=120, primary_key=True)
    usable_kwh: float
    is_default: bool = False


class SolarOrientationFactor(SQLModel, table=True):
    __tablename__ = "solar_orientation_factors"

    direction: str = Field(max_length=20, primary_key=True)
    factor: float


class PeakPeriod(SQLModel, table=True):
    __tablename__ = "peak_periods"

    id: str = Field(max_length=20, primary_key=True)
    label: str = Field(max_length=40)
    hint: str = Field(max_length=40)
    sort_order: int
    solar_share: float


class Methodology(SQLModel, table=True):
    __tablename__ = "methodology"

    id: int = Field(primary_key=True)
    melbourne_peak_sun_hours: float
    solar_performance_ratio: float
    typical_potential_kw: float
    vic_grid_kg_co2_per_kwh: float
    default_retail_rate: float
    default_feed_in_rate: float
    battery_shift_factor: float
    consumption_share_base: float
    consumption_share_peak: float
    dishwasher_min_people: int


class VppPlan(SQLModel, table=True):
    __tablename__ = "vpp_plans"

    id: str = Field(max_length=40, primary_key=True)
    brand: str = Field(max_length=80)
    name: str = Field(max_length=120)
    export_rate: float
    lock_in_months: int
    dispatch_note: str = Field(max_length=400)
    signup_bonus: float
    href: str = Field(max_length=500)
    source_label: str = Field(max_length=200)


class VppPlanBattery(SQLModel, table=True):
    __tablename__ = "vpp_plan_batteries"

    plan_id: str = Field(max_length=40, primary_key=True, foreign_key="vpp_plans.id")
    battery_name: str = Field(
        max_length=120, primary_key=True, foreign_key="battery_models.name"
    )
