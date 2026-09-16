/**
 * Energy-river model: generation, use, leftover or gap, and a VPP dollar estimate.
 *
 * Built from the KPI weekly totals, then scaled to the dashboard timeframe.
 * Dollars are modelled estimates — never a live meter or a promised payout.
 */
import {
  formatAud,
  formatKg,
  formatKwh,
  scaleAud,
  scaleKwh,
  scaleWeekly,
  type KpiReport,
  type Timeframe,
} from './kpis'

const RIVER_PERIOD: Record<Timeframe, string> = {
  daily: 'today',
  weekly: 'this week',
  fortnightly: 'this fortnight',
}

export type RiverFork = 'surplus' | 'deficit' | 'balanced'

export type EnergyRiverModel = {
  timeframe: Timeframe
  fork: RiverFork
  solarIsPotential: boolean
  generatedKwh: number
  usedKwh: number
  throughHouseKwh: number
  forkKwh: number
  forkValueAud: number
  feedInValueAud: number
  carbonAvoidedKg: number
  maxFlowKwh: number
}

/** Weekly kWh below this (after scaling) reads as a break-even home. */
const BALANCE_EPS_KWH = 0.05

export type RiverSource = {
  report: KpiReport
  timeframe: Timeframe
  feedInRate: number
}

/**
 * riverThickness
 * @param kwh - Flow at this link
 * @param maxKwh - Largest flow on the river (scales the band)
 * @returns ViewBox thickness between 36 and 78
 *
 * Square-root scaling keeps a small leftover visible next to a large roof flow.
 */
export function riverThickness(kwh: number, maxKwh: number): number {
  const min = 36
  const max = 78
  if (maxKwh <= 0 || kwh <= 0) return min
  const ratio = Math.min(1, Math.sqrt(kwh / maxKwh))
  return min + (max - min) * ratio
}

/**
 * buildEnergyRiver
 * @param source.report - Household KPI totals (weekly)
 * @param source.timeframe - Daily / weekly / fortnightly display scale
 * @param source.feedInRate - Standard feed-in, for the surplus comparison
 * @returns Scaled river figures and the leftover/gap fork
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

  return {
    timeframe,
    fork,
    solarIsPotential: report.solarIsPotential,
    generatedKwh,
    usedKwh,
    throughHouseKwh: Math.min(generatedKwh, usedKwh),
    forkKwh,
    forkValueAud: scaleAud(weeklyFork * rateForValue, timeframe),
    feedInValueAud: scaleAud(weeklyFork * feedInRate, timeframe),
    carbonAvoidedKg: scaleWeekly(report.weekly.carbonAvoidedKg, timeframe),
    maxFlowKwh: Math.max(generatedKwh, usedKwh, forkKwh, 1),
  }
}

/**
 * riverTitle
 * @param fork - Leftover, shortfall, or break-even
 * @returns Confident one-line verdict for the page heading
 */
export function riverTitle(fork: RiverFork): string {
  if (fork === 'surplus') return 'This home makes more than it uses.'
  if (fork === 'deficit') return 'This home still needs power from the grid.'
  return 'This home roughly breaks even.'
}

/**
 * riverBody
 * @param model - Scaled river figures
 * @returns The made → used → VPP sentence under the diagram
 */
export function riverBody(model: EnergyRiverModel): string {
  const period = RIVER_PERIOD[model.timeframe]
  const made = formatKwh(model.generatedKwh)
  const used = formatKwh(model.usedKwh)
  if (model.fork === 'surplus') {
    return `Your roof made ${made} ${period}. The house used ${used}. ${formatKwh(model.forkKwh)} can be discharged to a VPP — about ${formatAud(model.forkValueAud)} at a typical VPP credit, versus ${formatAud(model.feedInValueAud)} on standard feed-in.`
  }
  if (model.fork === 'deficit') {
    return `Your roof made ${made} ${period}. The house used ${used}. The house can borrow ${formatKwh(model.forkKwh)} from a VPP — about ${formatAud(model.forkValueAud)} of grid you’d otherwise buy — while yours still earns when the network calls.`
  }
  return `Your roof made ${made} ${period}. The house used ${used}. A VPP still pays when the grid needs this battery.`
}

/**
 * riverForkStage
 * @param fork - Surplus (discharge), deficit (borrow), or break-even
 * @returns Labels for the third river node
 */
export function riverForkStage(fork: RiverFork): { eyebrow: string; hint: string } {
  if (fork === 'surplus') return { eyebrow: 'Possible discharge', hint: 'To the VPP' }
  if (fork === 'deficit') return { eyebrow: 'Possible borrow', hint: 'From the VPP' }
  return { eyebrow: 'VPP on standby', hint: 'Event pay still applies' }
}

/**
 * riverCarbonNote
 * @param model - Scaled river figures
 * @returns Carbon footnote, or null when nothing is distributed
 */
export function riverCarbonNote(model: EnergyRiverModel): string | null {
  if (model.carbonAvoidedKg <= 0) return null
  return `That movement also avoids about ${formatKg(model.carbonAvoidedKg)} of Victorian grid carbon.`
}

export const VIEW_W = 1000
export const VIEW_H = 140

/**
 * flowingRiverPath
 * @param thicknesses - Width of the river at generated, used, and borrow/discharge
 * @param axis - Horizontal desktop flow or vertical mobile waterfall
 * @returns A closed SVG path that tapers from stage to stage
 */
export function flowingRiverPath(
  thicknesses: [number, number, number],
  axis: 'horizontal' | 'vertical',
): string {
  const stations = riverStations(thicknesses)
  const mid = VIEW_H / 2

  if (axis === 'horizontal') {
    const tops = stations.map((s) => [s.along, mid - s.thick / 2] as const)
    const bots = stations.map((s) => [s.along, mid + s.thick / 2] as const)
    return closedBand(tops, bots, 'x')
  }

  const lefts = stations.map((s) => [mid - s.thick / 2, s.along] as const)
  const rights = stations.map((s) => [mid + s.thick / 2, s.along] as const)
  return closedBand(lefts, rights, 'y')
}

/**
 * flowingRiverCenterline
 * @param thicknesses - Width of the river at each of the three stages
 * @param axis - Horizontal or vertical
 * @returns An open SVG path along the middle of the river, for the current
 */
export function flowingRiverCenterline(
  thicknesses: [number, number, number],
  axis: 'horizontal' | 'vertical',
): string {
  const stations = riverStations(thicknesses)
  const mid = VIEW_H / 2
  const pts =
    axis === 'horizontal'
      ? stations.map((s) => [s.along, mid] as const)
      : stations.map((s) => [mid, s.along] as const)
  return `M ${pts[0][0]} ${pts[0][1]}${cubicJoin(pts, axis === 'horizontal' ? 'x' : 'y')}`
}

function riverStations(thicknesses: [number, number, number]): { along: number; thick: number }[] {
  const [t0, t1, t2] = thicknesses
  const alongs = [0, VIEW_W / 6, VIEW_W / 2, (VIEW_W * 5) / 6]
  const ts = [t0, t0, t1, t2]
  return alongs.map((along, i) => ({ along, thick: ts[i] }))
}

function closedBand(
  leading: ReadonlyArray<readonly [number, number]>,
  trailing: ReadonlyArray<readonly [number, number]>,
  along: 'x' | 'y',
): string {
  const back = trailing.slice().reverse()
  return `M ${leading[0][0]} ${leading[0][1]}${cubicJoin(leading, along)} L ${back[0][0]} ${back[0][1]}${cubicJoin(back, along)} Z`
}

function cubicJoin(points: ReadonlyArray<readonly [number, number]>, along: 'x' | 'y'): string {
  let d = ''
  for (let i = 0; i < points.length - 1; i += 1) {
    const [ax, ay] = points[i]
    const [bx, by] = points[i + 1]
    if (along === 'x') {
      const dx = (bx - ax) / 2
      d += ` C ${ax + dx} ${ay}, ${bx - dx} ${by}, ${bx} ${by}`
    } else {
      const dy = (by - ay) / 2
      d += ` C ${ax} ${ay + dy}, ${bx} ${by - dy}, ${bx} ${by}`
    }
  }
  return d
}
