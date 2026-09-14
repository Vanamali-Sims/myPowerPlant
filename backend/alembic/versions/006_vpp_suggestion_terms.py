"""add compiled VPP suggestion plans and per-term source rows

Epic 3 dashboard suggestions need reserve, event cap, opt-out, and payment
copy with a source and last-verified date on each term. The existing
vpp_plans table still feeds KPI placeholder export rates and is left alone.

Terms are compiled from context/solarquotes-comparison-vpp.xlsx (14 Sep 2026).
A null value_text means the sheet did not list that term.

Revision ID: 006_vpp_suggestion_terms
Revises: 005_drop_user_data_tables
Create Date: 2026-09-14

"""

from datetime import date
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "006_vpp_suggestion_terms"
down_revision: Union[str, Sequence[str], None] = "005_drop_user_data_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SOURCE = (
    "SolarQuotes VPP comparison table, compiled 14 Sep 2026. "
    "Confirm current terms with the provider."
)
VERIFIED = date(2026, 9, 14)

TESLA = "Tesla Powerwall 2"
SUNGROW = "Sungrow SBR HV"
ALPHA = "AlphaESS SMILE5"
BYD = "BYD Battery-Box Premium LVL"
GOODWE = "Goodwe Lynx Home F"
SONNEN = "SonnenBatterie"
ALL_CATALOGUE = (TESLA, SUNGROW, ALPHA, BYD, GOODWE, SONNEN)

DISCHARGE = (
    "The provider decides when your battery charges or discharges for VPP events. "
    "You cannot pick those times yourself."
)


def upgrade() -> None:
    op.create_table(
        "vpp_suggestion_plans",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("brand", sa.String(length=80), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("href", sa.String(length=500), nullable=False),
        sa.Column("illustrative_rate_per_kwh", sa.Float(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "vpp_suggestion_plan_batteries",
        sa.Column("plan_id", sa.String(length=40), nullable=False),
        sa.Column("battery_name", sa.String(length=120), nullable=False),
        sa.ForeignKeyConstraint(["plan_id"], ["vpp_suggestion_plans.id"]),
        sa.ForeignKeyConstraint(["battery_name"], ["battery_models.name"]),
        sa.PrimaryKeyConstraint("plan_id", "battery_name"),
    )
    op.create_table(
        "vpp_suggestion_plan_regions",
        sa.Column("plan_id", sa.String(length=40), nullable=False),
        sa.Column("region", sa.String(length=20), nullable=False),
        sa.ForeignKeyConstraint(["plan_id"], ["vpp_suggestion_plans.id"]),
        sa.PrimaryKeyConstraint("plan_id", "region"),
    )
    op.create_table(
        "vpp_suggestion_plan_terms",
        sa.Column("plan_id", sa.String(length=40), nullable=False),
        sa.Column("term_key", sa.String(length=40), nullable=False),
        sa.Column("value_text", sa.String(length=2000), nullable=True),
        sa.Column("numeric_value", sa.Float(), nullable=True),
        sa.Column("source_label", sa.String(length=300), nullable=False),
        sa.Column("last_verified", sa.Date(), nullable=False),
        sa.ForeignKeyConstraint(["plan_id"], ["vpp_suggestion_plans.id"]),
        sa.PrimaryKeyConstraint("plan_id", "term_key"),
    )

    plans = sa.table(
        "vpp_suggestion_plans",
        sa.column("id", sa.String),
        sa.column("brand", sa.String),
        sa.column("name", sa.String),
        sa.column("href", sa.String),
        sa.column("illustrative_rate_per_kwh", sa.Float),
    )
    op.bulk_insert(
        plans,
        [
            {
                "id": "agl-byo-battery",
                "brand": "AGL Energy",
                "name": "AGL Bring Your Own Battery",
                "href": "https://www.agl.com.au/solar-batteries/batteries/virtual-power-plant",
                "illustrative_rate_per_kwh": 1.0,
            },
            {
                "id": "origin-battery-lite",
                "brand": "Origin Energy",
                "name": "Origin Battery Lite",
                "href": "https://www.originenergy.com.au/solar/batteries/origin-loop/",
                "illustrative_rate_per_kwh": 1.0,
            },
            {
                "id": "engie-vpp-advantage",
                "brand": "ENGIE",
                "name": "ENGIE VPP Advantage",
                "href": "https://www.engie.com.au/",
                "illustrative_rate_per_kwh": None,
            },
            {
                "id": "diamond-wattbank",
                "brand": "Diamond Energy",
                "name": "Diamond Energy WATTBANK VPP",
                "href": "https://www.diamondenergy.com.au/",
                "illustrative_rate_per_kwh": 0.30,
            },
            {
                "id": "globird-zerohero",
                "brand": "GloBird Energy",
                "name": "GloBird ZEROHERO",
                "href": "https://www.globirdenergy.com.au/",
                "illustrative_rate_per_kwh": 0.10,
            },
        ],
    )

    batteries = sa.table(
        "vpp_suggestion_plan_batteries",
        sa.column("plan_id", sa.String),
        sa.column("battery_name", sa.String),
    )
    battery_rows = (
        [{"plan_id": "agl-byo-battery", "battery_name": name} for name in (TESLA, ALPHA, SUNGROW)]
        + [{"plan_id": "origin-battery-lite", "battery_name": name} for name in ALL_CATALOGUE]
        + [
            {"plan_id": "engie-vpp-advantage", "battery_name": name}
            for name in (TESLA, ALPHA, SUNGROW)
        ]
        + [
            {"plan_id": "diamond-wattbank", "battery_name": name}
            for name in (SUNGROW, ALPHA)
        ]
        + [{"plan_id": "globird-zerohero", "battery_name": name} for name in ALL_CATALOGUE]
    )
    op.bulk_insert(batteries, battery_rows)

    regions = sa.table(
        "vpp_suggestion_plan_regions",
        sa.column("plan_id", sa.String),
        sa.column("region", sa.String),
    )
    op.bulk_insert(
        regions,
        [
            {"plan_id": plan_id, "region": "VIC"}
            for plan_id in (
                "agl-byo-battery",
                "origin-battery-lite",
                "engie-vpp-advantage",
                "diamond-wattbank",
                "globird-zerohero",
            )
        ],
    )

    terms = sa.table(
        "vpp_suggestion_plan_terms",
        sa.column("plan_id", sa.String),
        sa.column("term_key", sa.String),
        sa.column("value_text", sa.String),
        sa.column("numeric_value", sa.Float),
        sa.column("source_label", sa.String),
        sa.column("last_verified", sa.Date),
    )

    def term(
        plan_id: str,
        term_key: str,
        value_text: str | None,
        numeric_value: float | None = None,
    ) -> dict:
        return {
            "plan_id": plan_id,
            "term_key": term_key,
            "value_text": value_text,
            "numeric_value": numeric_value,
            "source_label": SOURCE,
            "last_verified": VERIFIED,
        }

    op.bulk_insert(
        terms,
        [
            term(
                "agl-byo-battery",
                "reserve_min",
                "AGL keeps at least 20% of Tesla, AlphaESS and Sungrow batteries "
                "for the home. That slice is not used for VPP dispatch.",
                0.20,
            ),
            term(
                "agl-byo-battery",
                "event_cap",
                f"{DISCHARGE} Eligible VPP-event energy is capped at 250 kWh per year.",
            ),
            term(
                "agl-byo-battery",
                "opt_out",
                "Bring-your-own battery customers can leave at any time without a "
                "penalty. SolarQuotes lists a $0 cancellation fee. There is a "
                "12-month VPP credit period, but leaving early is allowed.",
            ),
            term(
                "agl-byo-battery",
                "payment",
                "Payment is a mix of bill credits, not a guaranteed annual saving. "
                "SolarQuotes lists a $200 welcome credit, then $80 a year in "
                "Victoria ($20 each quarter), plus $1 per kWh for energy charged "
                "from or discharged to the grid during eligible VPP events, capped "
                "at 250 kWh a year. You also stay on an eligible AGL electricity plan.",
            ),
            term(
                "origin-battery-lite",
                "reserve_min",
                "Origin keeps at least 20% of the battery for the home. The VPP "
                "does not use that reserved slice.",
                0.20,
            ),
            term(
                "origin-battery-lite",
                "event_cap",
                f"{DISCHARGE} Eligible VPP-event discharges are paid at $1 per kWh "
                "and capped at 200 kWh per year.",
            ),
            term(
                "origin-battery-lite",
                "opt_out",
                "No fixed-term lock-in. Give Origin 20 business days’ notice to "
                "leave. SolarQuotes lists no cancellation fee.",
            ),
            term(
                "origin-battery-lite",
                "payment",
                "Payment is bill credits plus event payments, not a forecast of "
                "what your home will earn. SolarQuotes lists a $200 upfront bill "
                "credit, then $1 per kWh for eligible VPP-event discharges, capped "
                "at 200 kWh a year. Everyday usage still uses the rates on your "
                "eligible Origin electricity plan. You need a compatible battery "
                "of at least 5 kWh, solar of at least 5 kW, a smart meter, and an "
                "active Origin electricity agreement.",
            ),
            term(
                "engie-vpp-advantage",
                "reserve_min",
                "For Tesla Powerwalls, ENGIE keeps at least 20% of the battery in "
                "reserve. For other approved brands on this list, SolarQuotes says "
                "the VPP can technically use the full battery, though reaching "
                "zero would be rare. The 20% figure is used below only when your "
                "listed model is a Tesla Powerwall.",
                0.20,
            ),
            term(
                "engie-vpp-advantage",
                "event_cap",
                f"{DISCHARGE} ENGIE may charge, discharge or hold up to 400 kWh "
                "over a rolling 12-month period for applicable customers.",
            ),
            term(
                "engie-vpp-advantage",
                "opt_out",
                "The agreement is ongoing. SolarQuotes lists no cancellation fee "
                "and does not describe a one-click event opt-out.",
            ),
            term(
                "engie-vpp-advantage",
                "payment",
                "In Victoria, SolarQuotes lists a $300 sign-up split ($100 "
                "electricity and $200 gas) plus about $15 a month, on top of your "
                "ENGIE electricity plan. That is how ENGIE describes payment — "
                "not a prediction of what you would receive. You must be an ENGIE "
                "electricity customer with a compatible battery of at least 10 kWh.",
            ),
            term(
                "diamond-wattbank",
                "reserve_min",
                None,
                None,
            ),
            term(
                "diamond-wattbank",
                "event_cap",
                None,
                None,
            ),
            term(
                "diamond-wattbank",
                "opt_out",
                "No lock-in contract. You can opt in and out at any time. "
                "SolarQuotes lists no cancellation fee.",
            ),
            term(
                "diamond-wattbank",
                "payment",
                "Payment is an annual WATTBANK credit plus a time-window usage "
                "credit — not a guaranteed total. SolarQuotes lists $250–$450 a "
                "year depending on system size, and 30c per kWh for eligible "
                "battery exports between 6pm and 8am. You also need to be on "
                "Diamond Energy in Victoria with at least 5 kWh usable storage "
                "and 5 kW of solar, and not already in another VPP.",
            ),
            term(
                "globird-zerohero",
                "reserve_min",
                None,
                None,
            ),
            term(
                "globird-zerohero",
                "event_cap",
                None,
                None,
            ),
            term(
                "globird-zerohero",
                "opt_out",
                "No fixed VPP term is listed. Leaving is subject to the GloBird "
                "electricity-plan terms. SolarQuotes lists no cancellation fee.",
            ),
            term(
                "globird-zerohero",
                "payment",
                "GloBird pays through plan credits, not a single VPP savings "
                "figure. From 1 July 2026, SolarQuotes lists free standard-circuit "
                "electricity from 12pm–3pm (50 kWh daily fair use), a $1 daily "
                "credit when imports stay below 0.03 kWh per hour from 6pm–9pm, "
                "and 10c per kWh for the first 15 kWh exported from 6pm–9pm. "
                "You need to be in Victoria with 3–30 kW of inverter capacity.",
            ),
        ],
    )


def downgrade() -> None:
    op.drop_table("vpp_suggestion_plan_terms")
    op.drop_table("vpp_suggestion_plan_regions")
    op.drop_table("vpp_suggestion_plan_batteries")
    op.drop_table("vpp_suggestion_plans")
