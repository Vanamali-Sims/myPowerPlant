/**
 * Energy balance model: generation, use, leftover or gap, and a VPP dollar estimate.
 *
 * Built from the KPI weekly totals, then scaled to the dashboard timeframe.
 * Dollars are modelled estimates — never a live meter or a promised payout.
 */
import {
  formatAud,
  formatKwh,
  scaleAud,
  scaleKwh,
  type KpiReport,
  type Timeframe,
} from './kpis'

const RIVER_PERIOD: Record<Timeframe, string> = {
  daily: 'Today',
  weekly: 'This week',
  fortnightly: 'This fortnight',
}

export type RiverFork = 'surplus' | 'deficit' | 'balanced'

export type EnergyRiverModel = {
  timeframe: Timeframe
  fork: RiverFork
  solarIsPotential: boolean
  generatedKwh: number
  usedKwh: number
  coveredKwh: number
  forkKwh: number
  forkValueAud: number
  feedInValueAud: number
  /** Share of use (borrow) or generation (discharge) that a VPP would handle. */
  share: number
}

/** Weekly kWh below this (after scaling) reads as a break-even home. */
const BALANCE_EPS_KWH = 0.05

export type RiverSource = {
  report: KpiReport
  timeframe: Timeframe
  feedInRate: number
}

/**
 * buildEnergyRiver
 * @param source.report - Household KPI totals (weekly)
 * @param source.timeframe - Daily / weekly / fortnightly display scale
 * @param source.feedInRate - Standard feed-in, for the surplus comparison
 * @returns Scaled balance figures and the leftover/gap fork
 *
 * Surplus dollars use the recommended plan’s sample export rate.
 * Deficit dollars use the household retail rate (grid the home would otherwise buy).
 */
export function buildEnergyRiver({ report, timeframe, feedInRate }: RiverSource): EnergyRiverModel {
  const generatedKwh = scaleKwh(report.weekly.generationKwh, timeframe)
  const usedKwh = scaleKwh(report.weekly.consumptionKwh, timeframe)
  const delta = generatedKwh - usedKwh
  const fork: RiverFork =
    Math.abs(delta) < BALANCE_EPS_KWH ? 'balanced' : delta > 0 ? 'surplus' : 'deficit'
  const forkKwh = fork === 'balanced' ? 0 : Math.abs(delta)
  const vppRate = report.recommended.plan.exportRate
  const rateForValue = fork === 'deficit' ? report.retailRate : vppRate
  const weeklyFork = fork === 'balanced' ? 0 : Math.abs(report.weekly.generationKwh - report.weekly.consumptionKwh)
  const shareBase = fork === 'surplus' ? generatedKwh : usedKwh
  const share = shareBase > 0 && fork !== 'balanced' ? forkKwh / shareBase : 0

  return {
    timeframe,
    fork,
    solarIsPotential: report.solarIsPotential,
    generatedKwh,
    usedKwh,
    coveredKwh: Math.min(generatedKwh, usedKwh),
    forkKwh,
    forkValueAud: scaleAud(weeklyFork * rateForValue, timeframe),
    feedInValueAud: scaleAud(weeklyFork * feedInRate, timeframe),
    share,
  }
}

/**
 * riverPeriod
 * @param timeframe - Daily / weekly / fortnightly
 * @returns Title-case period for the balance card eyebrow
 */
export function riverPeriod(timeframe: Timeframe): string {
  return RIVER_PERIOD[timeframe]
}

/**
 * formatShare
 * @param share - 0–1 fraction
 * @returns Whole-percent string such as "54%"
 */
export function formatShare(share: number): string {
  return `${Math.round(share * 100)}%`
}

/**
 * riverForkStage
 * @param fork - Surplus (discharge), deficit (borrow), or break-even
 * @returns Labels for the VPP legend item
 */
export function riverForkStage(fork: RiverFork): { eyebrow: string; hint: string } {
  if (fork === 'surplus') return { eyebrow: 'Possible discharge', hint: 'to a VPP, estimate' }
  if (fork === 'deficit') return { eyebrow: 'Possible borrow', hint: 'from a VPP, estimate' }
  return { eyebrow: 'VPP on standby', hint: 'event pay still applies' }
}
