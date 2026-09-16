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
    SeasonalFactor,
    SolarOrientationFactor,
    VppPlan,
    VppPlanBattery,
    VppSuggestionPlan,
    VppSuggestionPlanBattery,
    VppSuggestionPlanRegion,
    VppSuggestionPlanTerm,
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
        dict: Seeded appliances with their published usage metrics, seasonal
        factors, battery capacities, solar factors, periods, methodology
        scalars, KPI VPP placeholder plans, and compiled VPP suggestion
        plans with per-term sources.

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
        seasons = (
            await session.scalars(select(SeasonalFactor).order_by(SeasonalFactor.basis))
        ).all()
        plans = (await session.scalars(select(VppPlan).order_by(VppPlan.brand))).all()
        links = (await session.scalars(select(VppPlanBattery))).all()
        suggestion_plans = (
            await session.scalars(select(VppSuggestionPlan).order_by(VppSuggestionPlan.brand))
        ).all()
        suggestion_batteries = (await session.scalars(select(VppSuggestionPlanBattery))).all()
        suggestion_regions = (await session.scalars(select(VppSuggestionPlanRegion))).all()
        suggestion_terms = (await session.scalars(select(VppSuggestionPlanTerm))).all()
    except OperationalError as exc:
        raise HTTPException(status_code=503, detail="Database unavailable") from exc

    if methodology is None:
        raise HTTPException(status_code=404, detail="Methodology seed is missing")

    batteries_by_plan: dict[str, list[str]] = {}
    for link in links:
        batteries_by_plan.setdefault(link.plan_id, []).append(link.battery_name)

    suggestion_batteries_by_plan: dict[str, list[str]] = {}
    for link in suggestion_batteries:
        suggestion_batteries_by_plan.setdefault(link.plan_id, []).append(link.battery_name)

    regions_by_plan: dict[str, list[str]] = {}
    for row in suggestion_regions:
        regions_by_plan.setdefault(row.plan_id, []).append(row.region)

    terms_by_plan: dict[str, list[VppSuggestionPlanTerm]] = {}
    for row in suggestion_terms:
        terms_by_plan.setdefault(row.plan_id, []).append(row)

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
        },
        "appliances": [
            {
                "id": row.id,
                "category": row.category,
                "name": row.name,
                "power_kw": row.power_kw,
                "power_basis": row.power_basis,
                "hours_per_week": row.hours_per_week,
                "usage_basis": row.usage_basis,
                "season_basis": row.season_basis,
                "hours_per_cycle": row.hours_per_cycle,
                "cycles_per_week": row.cycles_per_week,
                "reported_metric": row.reported_metric,
                "source_label": row.source_label,
            }
            for row in appliances
        ],
        "seasonal_factors": [
            {
                "basis": row.basis,
                "summer": row.summer,
                "autumn": row.autumn,
                "winter": row.winter,
                "spring": row.spring,
            }
            for row in seasons
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
        "vpp_suggestion_plans": [
            {
                "id": row.id,
                "brand": row.brand,
                "name": row.name,
                "href": row.href,
                "illustrative_rate_per_kwh": row.illustrative_rate_per_kwh,
                "approved_batteries": sorted(suggestion_batteries_by_plan.get(row.id, [])),
                "eligible_regions": sorted(regions_by_plan.get(row.id, [])),
                "terms": [
                    {
                        "key": term.term_key,
                        "value_text": term.value_text,
                        "numeric_value": term.numeric_value,
                        "source_label": term.source_label,
                        "last_verified": term.last_verified.isoformat(),
                    }
                    for term in sorted(
                        terms_by_plan.get(row.id, []), key=lambda item: item.term_key
                    )
                ],
            }
            for row in suggestion_plans
        ],
    }
