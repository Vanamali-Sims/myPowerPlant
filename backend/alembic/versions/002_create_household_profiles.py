"""create household_profiles table

Revision ID: 002_create_household_profiles
Revises: 001_create_submissions
Create Date: 2026-08-31

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002_create_household_profiles"
down_revision: Union[str, Sequence[str], None] = "001_create_submissions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
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


def downgrade() -> None:
    op.drop_index("ix_household_profiles_household_id", table_name="household_profiles")
    op.drop_table("household_profiles")
