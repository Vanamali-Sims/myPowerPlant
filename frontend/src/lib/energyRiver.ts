/**
 * Energy balance model: generation, use, leftover or gap, and a VPP dollar estimate.
 *
 * Built from the KPI weekly totals, then scaled to the dashboard timeframe.
 * Dollars are modelled estimates — never a live meter or a promised payout.
 */
import { WEEKS_PER_YEAR } from '../constants/kpiMethodology'
import {
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
  /** Annual estimate for the savings card (weekly model × 52, not scaled by timeframe). */
  annualValueAud: number
  feedInValueAud: number
  /** Share of use (borrow) or generation (discharge) that a VPP would handle. */
  share: number
}

export type RiverBarSliceId = 'generated' | 'used' | 'vpp'

export type RiverBarSlice = {
  id: RiverBarSliceId
  tone: 'generated' | 'used' | 'discharge' | 'borrow'
  pct: number
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
  const weeklyAud = weeklyFork * rateForValue
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
    forkValueAud: scaleAud(weeklyAud, timeframe),
    annualValueAud: weeklyAud * WEEKS_PER_YEAR,
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
  if (!Number.isFinite(share)) return '0%'
  return `${Math.round(share * 100)}%`
}

/**
 * riverForkStage
 * @param fork - Surplus (discharge), deficit (borrow), or break-even
 * @returns Labels for the VPP legend item
 */
export function riverForkStage(fork: RiverFork): { eyebrow: string; hint: string } {
  if (fork === 'surplus') return { eyebrow: 'Potential discharge', hint: 'to a VPP, estimate' }
  if (fork === 'deficit') return { eyebrow: 'Potential borrow', hint: 'from a VPP, estimate' }
  return { eyebrow: 'VPP on standby', hint: 'event pay still applies' }
}

/**
 * riverBarSlices
 * @param model - Current balance figures
 * @returns Widths for the parts of energy generated
 *
 * The track is generation (100%). Used energy and potential discharge are
 * shares of that total, left to right. They are normalised so rounding cannot
 * overflow the track or leave a gap. No generation returns an empty bar.
 */
export function riverBarSlices(model: EnergyRiverModel): RiverBarSlice[] {
  const generated = model.generatedKwh
  if (!(generated > 0) || !Number.isFinite(generated)) return []

  const usedKwh = Number.isFinite(model.usedKwh) ? Math.max(0, model.usedKwh) : 0
  const dischargeKwh =
    model.fork === 'surplus' && Number.isFinite(model.forkKwh) ? Math.max(0, model.forkKwh) : 0

  let usedPct = (usedKwh / generated) * 100
  let dischargePct = (dischargeKwh / generated) * 100
  if (!Number.isFinite(usedPct)) usedPct = 0
  if (!Number.isFinite(dischargePct)) dischargePct = 0

  usedPct = Math.min(100, Math.max(0, usedPct))
  dischargePct = Math.min(100, Math.max(0, dischargePct))

  const sum = usedPct + dischargePct
  if (sum <= 0) return []

  usedPct = (usedPct / sum) * 100
  dischargePct = (dischargePct / sum) * 100

  const parts: RiverBarSlice[] = []
  if (usedPct > 0) parts.push({ id: 'used', tone: 'used', pct: usedPct })
  if (dischargePct > 0) parts.push({ id: 'vpp', tone: 'discharge', pct: dischargePct })
  if (!parts.length) return []

  const prior = parts.slice(0, -1).reduce((total, slice) => total + slice.pct, 0)
  parts[parts.length - 1].pct = Math.max(0, 100 - prior)
  return parts.filter((slice) => slice.pct > 0)
}

/**
 * riverHeadlineShare
 * @param model - Current balance figures
 * @returns 0–1 fraction shown above the bar
 *
 * Surplus uses the same discharge ÷ generated ratio as the green segment.
 * Deficit stays the borrow share of use. Break-even is fully covered.
 */
export function riverHeadlineShare(model: EnergyRiverModel): number {
  if (model.fork === 'balanced') return 1
  if (model.fork === 'deficit') {
    return model.usedKwh > 0 && Number.isFinite(model.forkKwh) ? model.forkKwh / model.usedKwh : 0
  }
  const discharge = riverBarSlices(model).find((slice) => slice.id === 'vpp')
  return discharge ? discharge.pct / 100 : 0
}
