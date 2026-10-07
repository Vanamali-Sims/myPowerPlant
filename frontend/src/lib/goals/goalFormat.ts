/**
 * Display formatting for goal figures.
 *
 * Uses en-AU grouping so larger goals read as "$1,200" rather than "$1200".
 */
import type { GoalKind } from '../../types/goals'

const WHOLE = new Intl.NumberFormat('en-AU', { maximumFractionDigits: 0 })
const ONE_DECIMAL = new Intl.NumberFormat('en-AU', { maximumFractionDigits: 1 })
const TWO_DECIMALS = new Intl.NumberFormat('en-AU', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * formatGoalAud
 * @param value - Dollars
 * @returns "$1,200" for whole amounts, "$12.50" when there are cents
 */
export function formatGoalAud(value: number): string {
  const hasCents = Math.round(value * 100) % 100 !== 0
  return `$${hasCents ? TWO_DECIMALS.format(value) : WHOLE.format(value)}`
}

/**
 * formatGoalKgAmount
 * @param value - Kilograms of CO2e
 * @returns "1,200 kg", keeping one decimal for small figures
 */
export function formatGoalKgAmount(value: number): string {
  const text = value >= 100 ? WHOLE.format(value) : ONE_DECIMAL.format(value)
  return `${text} kg`
}

/**
 * formatGoalKg
 * @param value - Kilograms of CO2e
 * @returns "1,200 kg CO2e"
 */
export function formatGoalKg(value: number): string {
  return `${formatGoalKgAmount(value)} CO2e`
}

/** Savings in dollars, carbon in kilograms. */
export function formatGoalValue(kind: GoalKind, value: number): string {
  return kind === 'savings' ? formatGoalAud(value) : formatGoalKg(value)
}

/** Whole kilowatt-hours with grouping, for worked examples. */
export function formatExampleKwh(value: number): string {
  return `${WHOLE.format(value)} kWh`
}

/**
 * progressPercent
 * @param total - Counted so far
 * @param target - The goal
 * @returns The real percentage, which can be over 100
 */
export function progressPercent(total: number, target: number): number {
  if (!(target > 0)) return 0
  return (total / target) * 100
}

/** Whole percent for display; the real figure can exceed 100. */
export function formatPercent(value: number): string {
  return `${WHOLE.format(Math.floor(value))} percent`
}

/**
 * progressText
 * @returns "$120 of $300, 40 percent" or "127 kg of 288 kg CO2e, 44 percent"
 *
 * The CO2e unit is said once, after the goal, so the sentence does not repeat it.
 */
export function progressText(kind: GoalKind, total: number, target: number): string {
  const counted = kind === 'savings' ? formatGoalAud(total) : formatGoalKgAmount(total)
  return `${counted} of ${formatGoalValue(kind, target)}, ${formatPercent(
    progressPercent(total, target),
  )}`
}

const DAY_LABEL = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

/**
 * formatDayLabel
 * @param date - YYYY-MM-DD calendar date
 * @returns "1 September 2026", or the text unchanged when it is not a date
 */
export function formatDayLabel(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date
  return DAY_LABEL.format(new Date(`${date}T00:00:00Z`))
}

/**
 * formatFileSize
 * @param bytes - File size
 * @returns "820 bytes", "12.4 KB", or "1.2 MB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`
  if (bytes < 1024 * 1024) return `${ONE_DECIMAL.format(bytes / 1024)} KB`
  return `${ONE_DECIMAL.format(bytes / (1024 * 1024))} MB`
}

/**
 * formatEnergy
 * @param value - Kilowatt-hours
 * @returns "1,234.5 kWh" with one decimal place
 */
export function formatEnergy(value: number): string {
  return `${ONE_DECIMAL.format(value)} kWh`
}

/** A rate such as "$0.32 per kWh". */
export function formatRate(value: number): string {
  return `$${TWO_DECIMALS.format(value)} per kWh`
}
