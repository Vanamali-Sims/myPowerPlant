"""create KPI methodology lookup tables and seed current values

Revision ID: 003_create_methodology_tables
Revises: 002_create_household_profiles
Create Date: 2026-09-01

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003_create_methodology_tables"
down_revision: Union[str, Sequence[str], None] = "002_create_household_profiles"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "appliances",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("category", sa.String(length=40), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("power_kw", sa.Float(), nullable=False),
        sa.Column("typical_hours_per_week", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "battery_models",
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("usable_kwh", sa.Float(), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("name"),
    )
    op.create_table(
        "solar_orientation_factors",
        sa.Column("direction", sa.String(length=20), nullable=False),
        sa.Column("factor", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("direction"),
    )
    op.create_table(
        "peak_periods",
        sa.Column("id", sa.String(length=20), nullable=False),
        sa.Column("label", sa.String(length=40), nullable=False),
        sa.Column("hint", sa.String(length=40), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("solar_share", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "methodology",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("melbourne_peak_sun_hours", sa.Float(), nullable=False),
        sa.Column("solar_performance_ratio", sa.Float(), nullable=False),
        sa.Column("typical_potential_kw", sa.Float(), nullable=False),
        sa.Column("vic_grid_kg_co2_per_kwh", sa.Float(), nullable=False),
        sa.Column("default_retail_rate", sa.Float(), nullable=False),
        sa.Column("default_feed_in_rate", sa.Float(), nullable=False),
        sa.Column("battery_shift_factor", sa.Float(), nullable=False),
        sa.Column("consumption_share_base", sa.Float(), nullable=False),
        sa.Column("consumption_share_peak", sa.Float(), nullable=False),
        sa.Column("dishwasher_min_people", sa.Integer(), nullable=False),
        sa.Column("wfh_monitor_hours", sa.Float(), nullable=False),
        sa.Column("washer_min_hours", sa.Float(), nullable=False),
        sa.Column("aircon_base_hours", sa.Float(), nullable=False),
        sa.Column("aircon_hours_per_room", sa.Float(), nullable=False),
        sa.Column("aircon_max_hours", sa.Float(), nullable=False),
        sa.Column("evaporative_hours", sa.Float(), nullable=False),
        sa.Column("heater_base_hours", sa.Float(), nullable=False),
        sa.Column("heater_max_hours", sa.Float(), nullable=False),
        sa.Column("water_heater_hours", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "vpp_plans",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("brand", sa.String(length=80), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("export_rate", sa.Float(), nullable=False),
        sa.Column("lock_in_months", sa.Integer(), nullable=False),
        sa.Column("dispatch_note", sa.String(length=400), nullable=False),
        sa.Column("signup_bonus", sa.Float(), nullable=False),
        sa.Column("href", sa.String(length=500), nullable=False),
        sa.Column("source_label", sa.String(length=200), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "vpp_plan_batteries",
        sa.Column("plan_id", sa.String(length=40), nullable=False),
        sa.Column("battery_name", sa.String(length=120), nullable=False),
        sa.ForeignKeyConstraint(["plan_id"], ["vpp_plans.id"]),
        sa.ForeignKeyConstraint(["battery_name"], ["battery_models.name"]),
        sa.PrimaryKeyConstraint("plan_id", "battery_name"),
    )

    appliances = sa.table(
        "appliances",
        sa.column("id", sa.String),
        sa.column("category", sa.String),
        sa.column("name", sa.String),
        sa.column("power_kw", sa.Float),
        sa.column("typical_hours_per_week", sa.Float),
    )
    op.bulk_insert(
        appliances,
        [
            {
                "id": "tv",
                "category": "Entertainment",
                "name": "TV",
                "power_kw": 0.117,
                "typical_hours_per_week": 21,
            },
            {
                "id": "monitor",
                "category": "Entertainment",
                "name": "Computer monitor",
                "power_kw": 0.025,
                "typical_hours_per_week": 35,
            },
            {
                "id": "refrigerator",
                "category": "Kitchen & Household",
                "name": "Refrigerator",
                "power_kw": 1.92,
                "typical_hours_per_week": 168,
            },
            {
                "id": "dishwasher",
                "category": "Kitchen & Household",
                "name": "Dishwasher",
                "power_kw": 0.213,
                "typical_hours_per_week": 4,
            },
            {
                "id": "washer",
                "category": "Laundry",
                "name": "Clothes washer",
                "power_kw": 0.551,
                "typical_hours_per_week": 3,
            },
            {
                "id": "dryer",
                "category": "Laundry",
                "name": "Clothes dryer",
                "power_kw": 0.884,
                "typical_hours_per_week": 3,
            },
            {
                "id": "aircon",
                "category": "Heating / Cooling",
                "name": "Air conditioner",
                "power_kw": 1.92,
                "typical_hours_per_week": 14,
            },
            {
                "id": "evaporative",
                "category": "Heating / Cooling",
                "name": "Evaporative cooler",
                "power_kw": 0.7,
                "typical_hours_per_week": 12,
            },
            {
                "id": "heater",
                "category": "Heating / Cooling",
                "name": "Electric heater",
                "power_kw": 2.1,
                "typical_hours_per_week": 10,
            },
            {
                "id": "waterHeater",
                "category": "Heating / Cooling",
                "name": "Electric water heater",
                "power_kw": 3.6,
                "typical_hours_per_week": 8,
            },
        ],
    )

    battery_models = sa.table(
        "battery_models",
        sa.column("name", sa.String),
        sa.column("usable_kwh", sa.Float),
        sa.column("is_default", sa.Boolean),
    )
    op.bulk_insert(
        battery_models,
        [
            {"name": "Tesla Powerwall 2", "usable_kwh": 13.5, "is_default": False},
            {"name": "Sungrow SBR HV", "usable_kwh": 12.8, "is_default": False},
            {"name": "BYD Battery-Box Premium LVL", "usable_kwh": 13.8, "is_default": False},
            {"name": "AlphaESS SMILE5", "usable_kwh": 10.1, "is_default": False},
            {"name": "Goodwe Lynx Home F", "usable_kwh": 10.24, "is_default": False},
            {"name": "SonnenBatterie", "usable_kwh": 10, "is_default": True},
        ],
    )

    orientations = sa.table(
        "solar_orientation_factors",
        sa.column("direction", sa.String),
        sa.column("factor", sa.Float),
    )
    op.bulk_insert(
        orientations,
        [
            {"direction": "N", "factor": 1},
            {"direction": "NE", "factor": 0.95},
            {"direction": "NW", "factor": 0.95},
            {"direction": "E", "factor": 0.85},
            {"direction": "W", "factor": 0.85},
            {"direction": "SE", "factor": 0.7},
            {"direction": "SW", "factor": 0.7},
            {"direction": "S", "factor": 0.55},
            {"direction": "not_sure", "factor": 0.85},
        ],
    )

    peak_periods = sa.table(
        "peak_periods",
        sa.column("id", sa.String),
        sa.column("label", sa.String),
        sa.column("hint", sa.String),
        sa.column("sort_order", sa.Integer),
        sa.column("solar_share", sa.Float),
    )
    op.bulk_insert(
        peak_periods,
        [
            {
                "id": "morning",
                "label": "Morning",
                "hint": "6am – 12pm",
                "sort_order": 1,
                "solar_share": 0.28,
            },
            {
                "id": "afternoon",
                "label": "Afternoon",
                "hint": "12pm – 6pm",
                "sort_order": 2,
                "solar_share": 0.55,
            },
            {
                "id": "evening",
                "label": "Evening",
                "hint": "6pm – 10pm",
                "sort_order": 3,
                "solar_share": 0.15,
            },
            {
                "id": "night",
                "label": "Night",
                "hint": "10pm – 6am",
                "sort_order": 4,
                "solar_share": 0.02,
            },
        ],
    )

    methodology = sa.table(
        "methodology",
        sa.column("id", sa.Integer),
        sa.column("melbourne_peak_sun_hours", sa.Float),
        sa.column("solar_performance_ratio", sa.Float),
        sa.column("typical_potential_kw", sa.Float),
        sa.column("vic_grid_kg_co2_per_kwh", sa.Float),
        sa.column("default_retail_rate", sa.Float),
        sa.column("default_feed_in_rate", sa.Float),
        sa.column("battery_shift_factor", sa.Float),
        sa.column("consumption_share_base", sa.Float),
        sa.column("consumption_share_peak", sa.Float),
        sa.column("dishwasher_min_people", sa.Integer),
        sa.column("wfh_monitor_hours", sa.Float),
        sa.column("washer_min_hours", sa.Float),
        sa.column("aircon_base_hours", sa.Float),
        sa.column("aircon_hours_per_room", sa.Float),
        sa.column("aircon_max_hours", sa.Float),
        sa.column("evaporative_hours", sa.Float),
        sa.column("heater_base_hours", sa.Float),
        sa.column("heater_max_hours", sa.Float),
        sa.column("water_heater_hours", sa.Float),
    )
    op.bulk_insert(
        methodology,
        [
            {
                "id": 1,
                "melbourne_peak_sun_hours": 4.2,
                "solar_performance_ratio": 0.8,
                "typical_potential_kw": 6.6,
                "vic_grid_kg_co2_per_kwh": 0.77,
                "default_retail_rate": 0.32,
                "default_feed_in_rate": 0.05,
                "battery_shift_factor": 0.5,
                "consumption_share_base": 0.2,
                "consumption_share_peak": 0.4,
                "dishwasher_min_people": 3,
                "wfh_monitor_hours": 40,
                "washer_min_hours": 2,
                "aircon_base_hours": 8,
                "aircon_hours_per_room": 1.5,
                "aircon_max_hours": 28,
                "evaporative_hours": 12,
                "heater_base_hours": 6,
                "heater_max_hours": 24,
                "water_heater_hours": 8,
            }
        ],
    )

    vpp_plans = sa.table(
        "vpp_plans",
        sa.column("id", sa.String),
        sa.column("brand", sa.String),
        sa.column("name", sa.String),
        sa.column("export_rate", sa.Float),
        sa.column("lock_in_months", sa.Integer),
        sa.column("dispatch_note", sa.String),
        sa.column("signup_bonus", sa.Float),
        sa.column("href", sa.String),
        sa.column("source_label", sa.String),
    )
    source = "Sample plan terms (CDR-shaped). Not a live CDR feed yet."
    op.bulk_insert(
        vpp_plans,
        [
            {
                "id": "agl-vpp",
                "brand": "AGL Energy",
                "name": "AGL Virtual Power Plant",
                "export_rate": 0.15,
                "lock_in_months": 0,
                "dispatch_note": "Your battery may be called a few times a week. You keep the reserve you set.",
                "signup_bonus": 150,
                "href": "https://www.agl.com.au/solar-batteries/batteries/virtual-power-plant",
                "source_label": source,
            },
            {
                "id": "origin-loop",
                "brand": "Origin Energy",
                "name": "Origin Loop VPP",
                "export_rate": 0.12,
                "lock_in_months": 12,
                "dispatch_note": "Origin can draw from your battery during grid peaks, within your reserve.",
                "signup_bonus": 100,
                "href": "https://www.originenergy.com.au/solar/batteries/origin-loop/",
                "source_label": source,
            },
            {
                "id": "ea-power-response",
                "brand": "EnergyAustralia",
                "name": "EnergyAustralia PowerResponse",
                "export_rate": 0.1,
                "lock_in_months": 0,
                "dispatch_note": "Event-based dispatch. You can usually opt out of a single event.",
                "signup_bonus": 50,
                "href": "https://www.energyaustralia.com.au/home/electricity-and-gas/solar/virtual-power-plant",
                "source_label": source,
            },
            {
                "id": "simply-vpp",
                "brand": "Simply Energy",
                "name": "Simply VPP",
                "export_rate": 0.18,
                "lock_in_months": 24,
                "dispatch_note": "Higher credit, longer contract. Check the exit fee before you switch.",
                "signup_bonus": 0,
                "href": "https://www.simplyenergy.com.au/residential/solar-and-batteries/vpp",
                "source_label": source,
            },
            {
                "id": "red-vpp",
                "brand": "Red Energy",
                "name": "Red Energy VPP",
                "export_rate": 0.11,
                "lock_in_months": 0,
                "dispatch_note": "No lock-in on this sample offer. Credits apply when your battery is dispatched.",
                "signup_bonus": 75,
                "href": "https://www.redenergy.com.au/residential/solar/vpp",
                "source_label": source,
            },
        ],
    )

    junction = sa.table(
        "vpp_plan_batteries",
        sa.column("plan_id", sa.String),
        sa.column("battery_name", sa.String),
    )
    op.bulk_insert(
        junction,
        [
            {"plan_id": "agl-vpp", "battery_name": "Tesla Powerwall 2"},
            {"plan_id": "agl-vpp", "battery_name": "Sungrow SBR HV"},
            {"plan_id": "agl-vpp", "battery_name": "SonnenBatterie"},
            {"plan_id": "origin-loop", "battery_name": "Tesla Powerwall 2"},
            {"plan_id": "origin-loop", "battery_name": "AlphaESS SMILE5"},
            {"plan_id": "origin-loop", "battery_name": "Goodwe Lynx Home F"},
            {"plan_id": "origin-loop", "battery_name": "BYD Battery-Box Premium LVL"},
            {"plan_id": "ea-power-response", "battery_name": "Tesla Powerwall 2"},
            {"plan_id": "ea-power-response", "battery_name": "Sungrow SBR HV"},
            {"plan_id": "ea-power-response", "battery_name": "BYD Battery-Box Premium LVL"},
            {"plan_id": "simply-vpp", "battery_name": "Tesla Powerwall 2"},
            {"plan_id": "simply-vpp", "battery_name": "SonnenBatterie"},
            {"plan_id": "simply-vpp", "battery_name": "Goodwe Lynx Home F"},
            {"plan_id": "red-vpp", "battery_name": "Tesla Powerwall 2"},
            {"plan_id": "red-vpp", "battery_name": "AlphaESS SMILE5"},
            {"plan_id": "red-vpp", "battery_name": "Sungrow SBR HV"},
        ],
    )


def downgrade() -> None:
    op.drop_table("vpp_plan_batteries")
    op.drop_table("vpp_plans")
    op.drop_table("methodology")
    op.drop_table("peak_periods")
    op.drop_table("solar_orientation_factors")
    op.drop_table("battery_models")
    op.drop_table("appliances")
