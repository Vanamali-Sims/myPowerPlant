"""replace heuristic appliance hours with sourced usage metrics

Weekly hours now live on the appliance row with the metric and source that
produced them, so the dashboard can cite them. Room/people heuristics in the
methodology singleton are dropped. Heating and cooling gain a seasonal factor
so a winter heater figure is not charged through summer.

power_kw is also redefined: it is now the average draw while the appliance is
in use, not a nameplate rating. Motors and compressors cycle, so a nameplate
figure held for every hour of use overstated the fridge by about thirty times
and the climate-control lines by roughly double.

Revision ID: 004_appliance_usage_metrics
Revises: 003_create_methodology_tables
Create Date: 2026-09-02

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "004_appliance_usage_metrics"
down_revision: Union[str, Sequence[str], None] = "003_create_methodology_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

BASELINE_SOURCE = "MyPowerPlant baseline — no published figure sourced yet"

# Weekly hours as derived in context/Appliance_Usage_Reference.docx. Rows the
# reference does not cover keep their previous hours and say so in the source.
APPLIANCE_USAGE = [
    {
        "id": "tv",
        "power_kw": 0.117,
        "power_basis": "Typical LED television while switched on",
        "hours_per_week": 17.15,
        "usage_basis": "daily_average",
        "season_basis": "year_round",
        "hours_per_cycle": None,
        "cycles_per_week": None,
        "reported_metric": "2 hr 27 min per day (2.45 hr)",
        "source_label": "Nielsen — Screen time still an Australian pastime",
    },
    {
        "id": "monitor",
        "power_kw": 0.025,
        "power_basis": "Typical LED monitor while switched on",
        "hours_per_week": 44.1,
        "usage_basis": "daily_average",
        "season_basis": "year_round",
        "hours_per_cycle": None,
        "cycles_per_week": None,
        "reported_metric": "6.3 hours per day",
        "source_label": "Life Calculators — Screen Time Calculator",
    },
    {
        # 1.92 kW was a compressor nameplate, not the draw averaged over the
        # day, which made one fridge 322 kWh/week. 500 kWh/year over 8760 h is
        # the average draw an Energy Rating label implies.
        "id": "refrigerator",
        "power_kw": 0.057,
        "power_basis": "500 kWh a year on the energy label, spread over 8760 hours",
        "hours_per_week": 168,
        "usage_basis": "always_on",
        "season_basis": "year_round",
        "hours_per_cycle": None,
        "cycles_per_week": None,
        "reported_metric": "Runs continuously; about 500 kWh per year",
        "source_label": "Energy Rating (energyrating.gov.au) — typical 400–500 L fridge-freezer",
    },
    {
        "id": "dishwasher",
        "power_kw": 0.213,
        "power_basis": "Averaged across a normal cycle, including the heated rinse",
        "hours_per_week": 12.375,
        "usage_basis": "per_cycle",
        "season_basis": "year_round",
        "hours_per_cycle": 2.25,
        "cycles_per_week": 5.5,
        "reported_metric": "2.25 hr per Normal cycle; run 4–7 times a week (avg 5.5)",
        "source_label": "KitchenAid — Dishwasher cycles explained / RACV — Dishwasher buying guide",
    },
    {
        "id": "washer",
        "power_kw": 0.551,
        "power_basis": "Averaged across a warm wash cycle",
        "hours_per_week": 4.0785,
        "usage_basis": "per_cycle",
        "season_basis": "year_round",
        "hours_per_cycle": 0.96667,
        "cycles_per_week": 4.21918,
        "reported_metric": "58 min per cycle; 220 loads per year",
        "source_label": "Sustainability Victoria — Energy Clothes Dryer Retrofit Trial Report",
    },
    {
        # hours_per_week is per person: the trial reports 84–132 uses a year
        # for a 2.5-person household, so the midpoint is divided by 2.5.
        "id": "dryer",
        "power_kw": 0.884,
        "power_basis": "Averaged across a vented dryer cycle",
        "hours_per_week": 0.747,
        "usage_basis": "per_person",
        "season_basis": "year_round",
        "hours_per_cycle": 0.90167,
        "cycles_per_week": 0.82849,
        "reported_metric": "54.1 min per cycle; 84–132 uses a year for 2.5 people",
        "source_label": "Sustainability Victoria — Energy Clothes Dryer Retrofit Trial Report",
    },
    {
        # 1.92 kW was close to a large ducted system at full load. A common
        # split system draws about 1.4 kW, and the thermostat cuts the
        # compressor once the room is cool, so the average is lower again.
        "id": "aircon",
        "power_kw": 1.0,
        "power_basis": "5 kW reverse-cycle split at EER 3.5, averaged over thermostat cycling",
        "hours_per_week": 42,
        "usage_basis": "daily_average",
        "season_basis": "summer_peak",
        "hours_per_cycle": None,
        "cycles_per_week": None,
        "reported_metric": "6 hours per day",
        "source_label": "Finder — Air conditioner running costs",
    },
    {
        "id": "evaporative",
        "power_kw": 0.7,
        "power_basis": "Fan and water pump running together",
        "hours_per_week": 12,
        "usage_basis": "daily_average",
        "season_basis": "summer_peak",
        "hours_per_cycle": None,
        "cycles_per_week": None,
        "reported_metric": "12 hours a week",
        "source_label": BASELINE_SOURCE,
    },
    {
        # The profile offers "Electric (Reverse cycle / Heat pump)", so this
        # row is a heat pump, not a resistive bar heater. 2.1 kW was close to
        # resistive: a heat pump moves roughly 3.5 units of heat per unit in.
        "id": "heater",
        "name": "Reverse-cycle heater",
        "power_kw": 1.2,
        "power_basis": "5 kW reverse-cycle heating at COP 3.5, averaged over thermostat cycling",
        "hours_per_week": 30.8,
        "usage_basis": "daily_average",
        "season_basis": "winter_peak",
        "hours_per_cycle": None,
        "cycles_per_week": None,
        "reported_metric": "4.4 hours per day",
        "source_label": "Finder — How much do you use your heater in winter?",
    },
    {
        "id": "waterHeater",
        "power_kw": 3.6,
        "power_basis": "Resistive storage element while it is heating",
        "hours_per_week": 8,
        "usage_basis": "daily_average",
        "season_basis": "year_round",
        "hours_per_cycle": None,
        "cycles_per_week": None,
        "reported_metric": "8 hours a week",
        "source_label": BASELINE_SOURCE,
    },
]

# Shoulder seasons keep half the peak-season hours: autumn and spring still see
# some heating and cooling, just not the surveyed peak-month figure.
SEASONAL_FACTORS = [
    {"basis": "year_round", "summer": 1, "autumn": 1, "winter": 1, "spring": 1},
    {"basis": "summer_peak", "summer": 1, "autumn": 0.5, "winter": 0, "spring": 0.5},
    {"basis": "winter_peak", "summer": 0, "autumn": 0.5, "winter": 1, "spring": 0.5},
]

DROPPED_SCALARS = [
    ("wfh_monitor_hours", 40),
    ("washer_min_hours", 2),
    ("aircon_base_hours", 8),
    ("aircon_hours_per_room", 1.5),
    ("aircon_max_hours", 28),
    ("evaporative_hours", 12),
    ("heater_base_hours", 6),
    ("heater_max_hours", 24),
    ("water_heater_hours", 8),
]

PREVIOUS_ROWS = [
    {"id": "tv", "typical_hours_per_week": 21},
    {"id": "monitor", "typical_hours_per_week": 35},
    {"id": "refrigerator", "typical_hours_per_week": 168, "power_kw": 1.92},
    {"id": "dishwasher", "typical_hours_per_week": 4},
    {"id": "washer", "typical_hours_per_week": 3},
    {"id": "dryer", "typical_hours_per_week": 3},
    {"id": "aircon", "typical_hours_per_week": 14, "power_kw": 1.92},
    {"id": "evaporative", "typical_hours_per_week": 12},
    {
        "id": "heater",
        "typical_hours_per_week": 10,
        "power_kw": 2.1,
        "name": "Electric heater",
    },
    {"id": "waterHeater", "typical_hours_per_week": 8},
]


def upgrade() -> None:
    op.create_table(
        "seasonal_factors",
        sa.Column("basis", sa.String(length=20), nullable=False),
        sa.Column("summer", sa.Float(), nullable=False),
        sa.Column("autumn", sa.Float(), nullable=False),
        sa.Column("winter", sa.Float(), nullable=False),
        sa.Column("spring", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("basis"),
    )
    op.bulk_insert(
        sa.table(
            "seasonal_factors",
            sa.column("basis", sa.String),
            sa.column("summer", sa.Float),
            sa.column("autumn", sa.Float),
            sa.column("winter", sa.Float),
            sa.column("spring", sa.Float),
        ),
        SEASONAL_FACTORS,
    )

    op.alter_column(
        "appliances",
        "typical_hours_per_week",
        new_column_name="hours_per_week",
        existing_type=sa.Float(),
        existing_nullable=False,
    )
    op.add_column(
        "appliances",
        sa.Column("usage_basis", sa.String(length=20), nullable=False, server_default="daily_average"),
    )
    op.add_column(
        "appliances",
        sa.Column("season_basis", sa.String(length=20), nullable=False, server_default="year_round"),
    )
    op.add_column("appliances", sa.Column("hours_per_cycle", sa.Float(), nullable=True))
    op.add_column("appliances", sa.Column("cycles_per_week", sa.Float(), nullable=True))
    op.add_column(
        "appliances",
        sa.Column("power_basis", sa.String(length=200), nullable=False, server_default=""),
    )
    op.add_column(
        "appliances",
        sa.Column("reported_metric", sa.String(length=200), nullable=False, server_default=""),
    )
    op.add_column(
        "appliances",
        sa.Column("source_label", sa.String(length=200), nullable=False, server_default=""),
    )
    op.create_foreign_key(
        "fk_appliances_season_basis",
        "appliances",
        "seasonal_factors",
        ["season_basis"],
        ["basis"],
    )

    appliances = sa.table(
        "appliances",
        sa.column("id", sa.String),
        sa.column("name", sa.String),
        sa.column("power_kw", sa.Float),
        sa.column("power_basis", sa.String),
        sa.column("hours_per_week", sa.Float),
        sa.column("usage_basis", sa.String),
        sa.column("season_basis", sa.String),
        sa.column("hours_per_cycle", sa.Float),
        sa.column("cycles_per_week", sa.Float),
        sa.column("reported_metric", sa.String),
        sa.column("source_label", sa.String),
    )
    for row in APPLIANCE_USAGE:
        op.execute(
            appliances.update()
            .where(appliances.c.id == row["id"])
            .values({key: value for key, value in row.items() if key != "id"})
        )

    for column in (
        "usage_basis",
        "season_basis",
        "reported_metric",
        "source_label",
        "power_basis",
    ):
        op.alter_column("appliances", column, server_default=None)

    for column, _ in DROPPED_SCALARS:
        op.drop_column("methodology", column)


def downgrade() -> None:
    for column, value in DROPPED_SCALARS:
        op.add_column(
            "methodology",
            sa.Column(column, sa.Float(), nullable=False, server_default=str(value)),
        )
        op.alter_column("methodology", column, server_default=None)

    op.alter_column(
        "appliances",
        "hours_per_week",
        new_column_name="typical_hours_per_week",
        existing_type=sa.Float(),
        existing_nullable=False,
    )
    appliances = sa.table(
        "appliances",
        sa.column("id", sa.String),
        sa.column("name", sa.String),
        sa.column("power_kw", sa.Float),
        sa.column("typical_hours_per_week", sa.Float),
    )
    for row in PREVIOUS_ROWS:
        op.execute(
            appliances.update()
            .where(appliances.c.id == row["id"])
            .values({key: value for key, value in row.items() if key != "id"})
        )

    op.drop_constraint("fk_appliances_season_basis", "appliances", type_="foreignkey")
    op.drop_column("appliances", "power_basis")
    op.drop_column("appliances", "source_label")
    op.drop_column("appliances", "reported_metric")
    op.drop_column("appliances", "cycles_per_week")
    op.drop_column("appliances", "hours_per_cycle")
    op.drop_column("appliances", "season_basis")
    op.drop_column("appliances", "usage_basis")

    op.drop_table("seasonal_factors")
