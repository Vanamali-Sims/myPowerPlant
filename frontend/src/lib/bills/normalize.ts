/** Average days per month (365 / 12), used to scale billing-period figures. */
export const AVG_DAYS_PER_MONTH = 365 / 12

/**
 * Scale a billing-period value to an average calendar month.
 */
export function normalizeMonthly(periodValue: number, periodDays: number): number {
  if (!Number.isFinite(periodValue) || periodDays <= 0) return periodValue
  return (periodValue / periodDays) * AVG_DAYS_PER_MONTH
}

/** Profile fields store whole numbers for kWh and dollars. */
export function formatProfileAmount(value: number): string {
  return String(Math.round(value))
}
