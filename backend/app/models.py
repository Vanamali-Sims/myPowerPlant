"""Storage and request/response schemas for household profiles.

Validation policy (Security Plan S3.3, R7, R9): reject, do not repair. The
browser rules in frontend/src/lib/validateProfile.ts are mirrored here and are
authoritative; client-side validation is a usability feature, not a control.
"""

import re
from datetime import datetime, timezone
from typing import Annotated, Literal

from pydantic import ConfigDict, Field as PydanticField, field_validator, model_validator
from sqlalchemy import JSON, DateTime
from sqlmodel import Field, SQLModel

# Victoria only (CLAUDE.md S2). Mirrors VIC_POSTCODE in validateProfile.ts.
VIC_POSTCODE = re.compile(r"^[38]\d{3}$")

BATTERY_MODELS = frozenset(
    {
        "Tesla Powerwall 2",
        "Sungrow SBR HV",
        "BYD Battery-Box Premium LVL",
        "AlphaESS SMILE5",
        "Goodwe Lynx Home F",
        "SonnenBatterie",
    }
)

ENERGY_PROVIDERS = frozenset(
    {
        "AGL Energy",
        "Origin Energy",
        "EnergyAustralia",
        "Red Energy",
        "Diamond Energy",
        "Simply Energy",
        "Alinta Energy",
        "GloBird Energy",
    }
)

# Keys the client is permitted to send in field_sources. These are the
# camelCase ProfileData keys from frontend/src/types/profile.ts.
PROFILE_FIELD_KEYS = frozenset(
    {
        "postcode", "people", "rooms", "gas", "refrigerators", "dryer",
        "dryerWeek", "dryerWeekend", "heating", "cooling", "hotWater",
        "monthlyBill", "monthlyKwh", "peakPeriod", "usageLevel", "wfh",
        "hasSolar", "solarDirection", "panelCount", "panelWatts",
        "batteryUnits", "reservePercent", "batteryAge", "batteryModel",
        "provider",
    }
)

YesNoNotSure = Literal["yes", "no", "not_sure"]


def _numeric_in_range(value: str, low: float, high: float, label: str) -> str:
    """Validate an optional numeric string. Empty is allowed; junk is not."""
    if value == "":
        return value
    try:
        parsed = float(value)
    except ValueError:
        raise ValueError(f"{label} must be a number") from None
    if not low <= parsed <= high:
        raise ValueError(f"{label} must be between {low:g} and {high:g}")
    return value


# --------------------------------------------------------------------------
# Storage shape. Column definitions only - validation lives on the write
# schema below, so the table can hold historic rows that predate these rules.
# --------------------------------------------------------------------------


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

    # Sequential key, never exposed externally (Security Plan S6.1). The
    # external identifier is household_id, a server-generated UUIDv4.
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


# --------------------------------------------------------------------------
# Write schema. Strict: unknown fields are rejected, every value is checked
# against the same rules the browser applies, and nothing is defaulted.
# --------------------------------------------------------------------------


class HouseholdProfileWrite(SQLModel):
    model_config = ConfigDict(extra="forbid")

    postcode: str
    people: Literal["1", "2", "3", "4", "5", "6+"]
    rooms: Literal["1", "2", "3", "4", "5", "6", "7", "8", "9", "10+"]
    gas: YesNoNotSure
    refrigerators: Literal["0", "1", "2", "3", "4+"]
    dryer: YesNoNotSure
    dryer_week: str = ""
    dryer_weekend: str = ""
    heating: Literal["electric", "gas", "wood", "none", "other", "not_sure"]
    cooling: Literal[
        "air_conditioning", "evaporative", "fans", "none", "other", "not_sure"
    ]
    hot_water: YesNoNotSure

    monthly_bill: str
    monthly_kwh: str
    peak_period: Literal["morning", "afternoon", "evening", "night"]
    usage_level: Literal["low", "moderate", "high", "very_high"]
    wfh: YesNoNotSure

    has_solar: Literal["yes", "no"]
    solar_direction: Literal[
        "N", "NE", "E", "SE", "S", "SW", "W", "NW", "not_sure", ""
    ] = ""
    panel_count: str = ""
    panel_watts: str = ""

    battery_units: Annotated[int, PydanticField(ge=0, le=8)] = 1
    reserve_percent: str = ""
    battery_age: str = ""
    battery_model: str = ""

    provider: str

    field_sources: dict[str, str] = {}

    @field_validator("postcode")
    @classmethod
    def _postcode(cls, value: str) -> str:
        if not VIC_POSTCODE.match(value):
            raise ValueError("postcode must be a 4-digit Victorian postcode")
        return value

    @field_validator("*")
    @classmethod
    def _no_control_characters(cls, value):
        """Reject null bytes and control characters in any string field."""
        if isinstance(value, str) and any(ord(ch) < 32 for ch in value):
            raise ValueError("value contains control characters")
        return value

    @field_validator("dryer_week", "dryer_weekend")
    @classmethod
    def _dryer_cycles(cls, value: str) -> str:
        return _numeric_in_range(value, 0, 7, "dryer cycles")

    @field_validator("monthly_bill")
    @classmethod
    def _bill(cls, value: str) -> str:
        if value == "":
            raise ValueError("monthly_bill is required")
        return _numeric_in_range(value, 1, 5000, "monthly_bill")

    @field_validator("monthly_kwh")
    @classmethod
    def _kwh(cls, value: str) -> str:
        if value == "":
            raise ValueError("monthly_kwh is required")
        return _numeric_in_range(value, 1, 5000, "monthly_kwh")

    @field_validator("panel_count")
    @classmethod
    def _panel_count(cls, value: str) -> str:
        return _numeric_in_range(value, 1, 80, "panel_count")

    @field_validator("panel_watts")
    @classmethod
    def _panel_watts(cls, value: str) -> str:
        return _numeric_in_range(value, 50, 500, "panel_watts")

    @field_validator("reserve_percent")
    @classmethod
    def _reserve(cls, value: str) -> str:
        return _numeric_in_range(value, 0, 80, "reserve_percent")

    @field_validator("battery_age")
    @classmethod
    def _battery_age(cls, value: str) -> str:
        return _numeric_in_range(value, 0, 40, "battery_age")

    @field_validator("battery_model")
    @classmethod
    def _battery_model(cls, value: str) -> str:
        if value not in BATTERY_MODELS and value not in {"", "Not sure"}:
            raise ValueError("battery_model is not on the approved list")
        return value

    @field_validator("provider")
    @classmethod
    def _provider(cls, value: str) -> str:
        if value not in ENERGY_PROVIDERS and value not in {"Not sure", "Other"}:
            raise ValueError("provider is not on the known list")
        return value

    @field_validator("field_sources")
    @classmethod
    def _field_sources(cls, value: dict[str, str]) -> dict[str, str]:
        """Bound this dict. It is client-supplied JSON written straight to a
        JSON column, so without a check it is an unbounded storage write."""
        unknown = set(value) - PROFILE_FIELD_KEYS
        if unknown:
            raise ValueError(f"unknown field_sources keys: {sorted(unknown)[:5]}")
        bad = {k: v for k, v in value.items() if v not in {"user", "baseline"}}
        if bad:
            raise ValueError("field_sources values must be 'user' or 'baseline'")
        return value

    @model_validator(mode="after")
    def _conditionals(self):
        """Mirror the conditional requirements in validateProfile.ts."""
        if self.dryer == "yes" and not (self.dryer_week and self.dryer_weekend):
            raise ValueError("dryer_week and dryer_weekend are required when dryer is 'yes'")
        if self.has_solar == "yes":
            if not self.solar_direction:
                raise ValueError("solar_direction is required when has_solar is 'yes'")
            if not self.panel_count or not self.panel_watts:
                raise ValueError("panel_count and panel_watts are required when has_solar is 'yes'")
        return self


class HouseholdProfileRead(HouseholdProfileBase):
    """Response shape. Deliberately excludes the sequential primary key."""

    household_id: str
    created_at: datetime
    updated_at: datetime


class HouseholdProfileCreated(SQLModel):
    """Returned by POST /api/profile. The identifier is the capability, so it
    is issued exactly once, here, and never derived from client input."""

    household_id: str
