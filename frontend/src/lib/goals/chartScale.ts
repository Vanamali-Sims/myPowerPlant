/**
 * Axis scale for the monthly progress graph.
 */

/**
 * niceTop
 * @param value - Largest figure the axis must show (goal or running total)
 * @returns A tidy axis top split into 4 equal, round steps
 *
 * Keeps the ticks readable ($0, $100, $200…) instead of odd figures.
 */
export function niceTop(value: number): number {
  if (!(value > 0)) return 1
  const rough = (value * 1.05) / 4
  const power = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((m) => m * power).find((candidate) => candidate >= rough) ?? 10 * power
  return step * 4
}
