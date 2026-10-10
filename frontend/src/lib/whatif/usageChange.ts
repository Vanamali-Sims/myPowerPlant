/**
 * Household changes in What if, measured against the monthly usage the
 * household gave.
 *
 * With a monthly kWh figure, the dashboard model uses it as is and ignores
 * appliance answers, so a change in people or appliance cycles would not move
 * anything. Instead each change is turned into extra (or fewer) weekly kWh and
 * added to the monthly figure.
 */
import { WEEKS_PER_MONTH } from '../../constants/kpiMethodology'
import { FIELD_BOUNDS, clampNumber } from '../../constants/validation'
import type { ProfileData } from '../../types/profile'
import { buildKpiReport } from '../kpis'
import type { MethodologyBundle } from '../methodologyApi'

/** Largest change, either way, in appliance cycles a week. */
export const CYCLE_CHANGE_LIMIT = 14

/** kWh one cycle uses: average draw × hours per cycle, from the methodology data. */
export function kwhPerCycle(bundle: MethodologyBundle, id: 'dishwasher' | 'washer'): number {
  const spec = bundle.appliances[id]
  return spec?.hoursPerCycle ? spec.powerKw * spec.hoursPerCycle : 0
}

/** Weekly kWh the appliance model gives for these answers, ignoring any monthly figure. */
export function modelledWeeklyKwh(profile: ProfileData, bundle: MethodologyBundle): number {
  return buildKpiReport({ ...profile, monthlyKwh: '' }, bundle).appliances.reduce(
    (sum, line) => sum + line.weeklyKwh,
    0,
  )
}

/**
 * withUsageChange
 * @param profile - Answers with a monthly kWh figure
 * @param extraWeeklyKwh - kWh a week to add; negative takes some away
 * @returns The answers with the monthly figure moved, kept inside its bounds
 *
 * Without a monthly figure the answers are returned unchanged, because the
 * appliance model already reflects the change.
 */
export function withUsageChange(profile: ProfileData, extraWeeklyKwh: number): ProfileData {
  const monthly = Number.parseFloat(profile.monthlyKwh)
  if (!(monthly > 0) || !extraWeeklyKwh) return profile
  const next = clampNumber(
    Math.round(monthly + extraWeeklyKwh * WEEKS_PER_MONTH),
    FIELD_BOUNDS.monthlyKwh.min,
    FIELD_BOUNDS.monthlyKwh.max,
  )
  return { ...profile, monthlyKwh: String(next) }
}
