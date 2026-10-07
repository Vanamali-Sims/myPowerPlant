/**
 * How thick a flow line is, and how many dots travel on it.
 *
 * The same scale is used for every path. Full width is 32 kWh in a day, so
 * 6, 10 and 20 stay apart instead of slamming into a cap near 9.
 */

const FULL_KWH = 32
const MIN_WIDTH = 1.6
const WIDTH_SPAN = 12.4

export function flowStroke(amount: number): number {
  if (amount < 0.05) return MIN_WIDTH
  const t = Math.min(1, amount / FULL_KWH)
  return MIN_WIDTH + t * WIDTH_SPAN
}

export function flowDotCount(amount: number): number {
  if (amount < 0.05) return 0
  return Math.max(1, Math.min(14, Math.round(amount / 2.2)))
}
