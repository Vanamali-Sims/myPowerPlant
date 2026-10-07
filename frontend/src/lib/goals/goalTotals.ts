/**
 * Totals derived from stored monthly records. Never stored themselves.
 */
import type { GoalKind, MonthRecord } from '../../types/goals'

/**
 * deriveTotals
 * @param months - Stored monthly records
 * @returns Running savings (AUD) and carbon (kg) across every counted month
 */
export function deriveTotals(months: MonthRecord[]): Record<GoalKind, number> {
  return months.reduce(
    (sum, month) => ({
      savings: sum.savings + month.savingsAud,
      carbon: sum.carbon + month.carbonKg,
    }),
    { savings: 0, carbon: 0 },
  )
}
