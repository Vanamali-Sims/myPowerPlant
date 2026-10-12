/**
 * Turn a battery-file read into an unsaved goal baseline.
 * Kept out of the step component so that file only exports components.
 */
import { GOAL_RATE_CENTS } from '../../constants/goals'
import type { MessageCode } from '../../constants/goalMessages'
import { buildCalculationContext, calculateDay, type DayFigures } from '../../lib/goals/calculate'
import { parseGoalInput, pickBaseline } from '../../lib/goals/goalSetup'
import { melbourneDate } from '../../lib/goals/melbourneTime'
import type { MethodologyBundle } from '../../lib/methodologyApi'
import type { GoalBaseline, GoalBattery } from '../../types/goals'
import type { ReadDays } from './UploadArea'

/** A baseline read from a file but not saved yet. */
export type BaselineDraft = {
  baseline: Omit<GoalBaseline, 'setOn'>
  /** Complete days of the baseline month, added to progress when goals are saved. */
  days: DayFigures[]
  sourceId: ReadDays['sourceId']
}

/**
 * readGoalRate
 * @param raw - Text from the rate field, in cents per kWh
 * @returns AUD per kWh, null when empty, or 'invalid'
 */
export function readGoalRate(raw: string): number | null | 'invalid' {
  if (!raw.trim()) return null
  const cents = parseGoalInput(raw.replace(/c$/i, ''))
  if (cents === null || cents < GOAL_RATE_CENTS.min || cents > GOAL_RATE_CENTS.max) return 'invalid'
  return Math.round(cents * 100) / 10000
}

/**
 * buildBaselineDraft
 * @returns An unsaved baseline from a successful read, or a baseline rule failure
 */
export function buildBaselineDraft(
  read: ReadDays,
  battery: GoalBattery,
  rate: number | null | 'invalid',
  profileRatePerKwh: number | null,
  bundle: MethodologyBundle,
): { ok: true; draft: BaselineDraft } | { ok: false; reason: MessageCode } {
  if (rate === 'invalid') return { ok: false, reason: 'write_failed' }
  const context = buildCalculationContext(rate, bundle)
  const picked = pickBaseline(
    read.days.map((day) => calculateDay(day, context)),
    melbourneDate(Date.now()),
  )
  if (!picked.ok) return { ok: false, reason: picked.reason }
  return {
    ok: true,
    draft: {
      baseline: {
        month: picked.month,
        days: picked.days.length,
        monthly: picked.monthly,
        battery,
        ratePerKwh: profileRatePerKwh === null ? rate : null,
      },
      days: picked.days,
      sourceId: read.sourceId,
    },
  }
}
