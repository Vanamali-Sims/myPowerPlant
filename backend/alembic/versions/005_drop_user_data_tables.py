"""drop household_profiles and submissions tables

No user data may be persisted server-side going forward — the backend now
only serves read-only reference data (methodology, appliances, rates, VPP
plans, etc.). The household profile lives in the browser's localStorage
only; the API routes that wrote to these tables were removed separately.

All seeded reference tables (methodology, appliances, battery_models,
peak_periods, seasonal_factors, solar_orientation_factors, vpp_plans,
vpp_plan_batteries) are untouched by this migration.

Revision ID: 005_drop_user_data_tables
Revises: 004_appliance_usage_metrics
Create Date: 2026-09-02

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "005_drop_user_data_tables"
down_revision: Union[str, Sequence[str], None] = "004_appliance_usage_metrics"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_index("ix_household_profiles_household_id", table_name="household_profiles")
    op.drop_table("household_profiles")
    op.drop_table("submissions")


def downgrade() -> None:
    op.create_table(
        "submissions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("message", sa.String(length=2000), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "household_profiles",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("household_id", sa.String(length=64), nullable=False),
        sa.Column("postcode", sa.String(length=10), nullable=False),
        sa.Column("people", sa.String(length=20), nullable=False),
        sa.Column("rooms", sa.String(length=20), nullable=False),
        sa.Column("gas", sa.String(length=20), nullable=False),
        sa.Column("refrigerators", sa.String(length=20), nullable=False),
        sa.Column("dryer", sa.String(length=20), nullable=False),
        sa.Column("dryer_week", sa.String(length=20), nullable=False),
        sa.Column("dryer_weekend", sa.String(length=20), nullable=False),
        sa.Column("heating", sa.String(length=40), nullable=False),
        sa.Column("cooling", sa.String(length=40), nullable=False),
        sa.Column("hot_water", sa.String(length=20), nullable=False),
        sa.Column("monthly_bill", sa.String(length=20), nullable=False),
        sa.Column("monthly_kwh", sa.String(length=20), nullable=False),
        sa.Column("peak_period", sa.String(length=20), nullable=False),
        sa.Column("usage_level", sa.String(length=20), nullable=False),
        sa.Column("wfh", sa.String(length=20), nullable=False),
        sa.Column("has_solar", sa.String(length=10), nullable=False),
        sa.Column("solar_direction", sa.String(length=20), nullable=False),
        sa.Column("panel_count", sa.String(length=20), nullable=False),
        sa.Column("panel_watts", sa.String(length=20), nullable=False),
        sa.Column("battery_units", sa.Integer(), nullable=False),
        sa.Column("reserve_percent", sa.String(length=20), nullable=False),
        sa.Column("battery_age", sa.String(length=20), nullable=False),
        sa.Column("battery_model", sa.String(length=120), nullable=False),
        sa.Column("provider", sa.String(length=120), nullable=False),
        sa.Column("field_sources", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_household_profiles_household_id",
        "household_profiles",
        ["household_id"],
        unique=True,
    )
