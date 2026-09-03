"""
SQLModel tables for read-only reference data served by the methodology route.

Column max_length values are schema constraints. Change them only with a
migration — they are not shared frontend constants.
"""
from sqlmodel import Field, SQLModel


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
