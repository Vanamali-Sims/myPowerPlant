"""
Read-only KPI lookup tables: appliances, rates, orientations, and VPP plans.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models import (
    Appliance,
    BatteryModel,
    Methodology,
    PeakPeriod,
    SolarOrientationFactor,
    VppPlan,
    VppPlanBattery,
)

router = APIRouter()


@router.get("/methodology")
async def get_methodology(
    session: AsyncSession = Depends(get_session),
) -> dict:
    """
    get_methodology

    Args:
        session: Request-scoped SQLAlchemy session.

    Returns:
        dict: Seeded appliances, battery capacities, solar factors, periods,
        methodology scalars, and VPP plans with compatible batteries.

    Used by the dashboard so KPI numbers come from Postgres, not frontend
    constants. A missing seed row is 404; a down database is 503.
    """
    try:
        methodology = await session.get(Methodology, 1)
        appliances = (await session.scalars(select(Appliance).order_by(Appliance.id))).all()
        batteries = (
            await session.scalars(select(BatteryModel).order_by(BatteryModel.name))
        ).all()
        orientations = (
            await session.scalars(
                select(SolarOrientationFactor).order_by(SolarOrientationFactor.direction)
            )
        ).all()
        periods = (
            await session.scalars(select(PeakPeriod).order_by(PeakPeriod.sort_order))
        ).all()
        plans = (await session.scalars(select(VppPlan).order_by(VppPlan.brand))).all()
        links = (await session.scalars(select(VppPlanBattery))).all()
    except OperationalError as exc:
        raise HTTPException(status_code=503, detail="Database unavailable") from exc

    if methodology is None:
        raise HTTPException(status_code=404, detail="Methodology seed is missing")

    batteries_by_plan: dict[str, list[str]] = {}
    for link in links:
        batteries_by_plan.setdefault(link.plan_id, []).append(link.battery_name)

    return {
        "methodology": {
            "melbourne_peak_sun_hours": methodology.melbourne_peak_sun_hours,
            "solar_performance_ratio": methodology.solar_performance_ratio,
            "typical_potential_kw": methodology.typical_potential_kw,
            "vic_grid_kg_co2_per_kwh": methodology.vic_grid_kg_co2_per_kwh,
            "default_retail_rate": methodology.default_retail_rate,
            "default_feed_in_rate": methodology.default_feed_in_rate,
            "battery_shift_factor": methodology.battery_shift_factor,
            "consumption_share_base": methodology.consumption_share_base,
            "consumption_share_peak": methodology.consumption_share_peak,
            "dishwasher_min_people": methodology.dishwasher_min_people,
            "wfh_monitor_hours": methodology.wfh_monitor_hours,
            "washer_min_hours": methodology.washer_min_hours,
            "aircon_base_hours": methodology.aircon_base_hours,
            "aircon_hours_per_room": methodology.aircon_hours_per_room,
            "aircon_max_hours": methodology.aircon_max_hours,
            "evaporative_hours": methodology.evaporative_hours,
            "heater_base_hours": methodology.heater_base_hours,
            "heater_max_hours": methodology.heater_max_hours,
            "water_heater_hours": methodology.water_heater_hours,
        },
        "appliances": [
            {
                "id": row.id,
                "category": row.category,
                "name": row.name,
                "power_kw": row.power_kw,
                "typical_hours_per_week": row.typical_hours_per_week,
            }
            for row in appliances
        ],
        "battery_models": [
            {
                "name": row.name,
                "usable_kwh": row.usable_kwh,
                "is_default": row.is_default,
            }
            for row in batteries
        ],
        "orientation_factors": [
            {"direction": row.direction, "factor": row.factor} for row in orientations
        ],
        "peak_periods": [
            {
                "id": row.id,
                "label": row.label,
                "hint": row.hint,
                "sort_order": row.sort_order,
                "solar_share": row.solar_share,
            }
            for row in periods
        ],
        "vpp_plans": [
            {
                "id": row.id,
                "brand": row.brand,
                "name": row.name,
                "export_rate": row.export_rate,
                "lock_in_months": row.lock_in_months,
                "dispatch_note": row.dispatch_note,
                "signup_bonus": row.signup_bonus,
                "href": row.href,
                "source_label": row.source_label,
                "compatible_batteries": sorted(batteries_by_plan.get(row.id, [])),
            }
            for row in plans
        ],
    }
