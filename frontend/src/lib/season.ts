/**
 * Australian season for the day the dashboard is opened.
 *
 * Heating and cooling figures are surveyed in their peak season, so the KPI
 * model needs to know which season it is before charging a household for them.
 */

export type Season = 'summer' | 'autumn' | 'winter' | 'spring'

/** Meteorological seasons, indexed by month (0 = January). */
const SEASON_BY_MONTH: Season[] = [
  'summer',
  'summer',
  'autumn',
  'autumn',
  'autumn',
  'winter',
  'winter',
  'winter',
  'spring',
  'spring',
  'spring',
  'summer',
]

export const SEASON_LABELS: Record<Season, string> = {
  summer: 'Summer',
  autumn: 'Autumn',
  winter: 'Winter',
  spring: 'Spring',
}

/**
 * currentSeason
 * @param date - Day to read the season from; defaults to today
 * @returns The Australian meteorological season for that date
 *
 * Southern-hemisphere seasons start on the first of December, March, June,
 * and September — not at the solstices.
 */
export function currentSeason(date: Date = new Date()): Season {
  return SEASON_BY_MONTH[date.getMonth()]
}
