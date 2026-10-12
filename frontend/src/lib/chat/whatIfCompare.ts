/**
 * Plain-language copy for the What if “Now vs this change” dialog.
 *
 * All figures come from buildKpiReport on the device — not live meter data.
 */
import type { KpiReport } from '../kpis'
import { formatAud, formatKwh } from '../kpis'
import { DAYS_PER_WEEK } from '../../constants/kpiMethodology'
import { formatKwhShort, type SuggestionMatch } from '../vppSuggestions'

export type WhatIfKind = 'battery' | 'panel' | 'direction' | 'household'

/** VPP suggestion list for the battery scenario. */
export function formatPlanColumn(matches: SuggestionMatch[], emptyReason: string | null): string {
  if (!matches.length) {
    if (emptyReason === 'battery') return 'No plans list this battery for your region.'
    if (emptyReason === 'region') return 'Plans are seeded for Victorian postcodes only.'
    return 'No matching plans.'
  }
  return matches
    .slice(0, 4)
    .map((row) => {
      const headroom =
        row.reserveHeadroomKwh != null
          ? `, ${formatKwhShort(row.reserveHeadroomKwh)} reserve headroom`
          : ''
      return `${row.plan.brand} ${row.plan.name}${headroom}`
    })
    .join('\n')
}

/** Solar generation figures for panel count or direction scenarios. */
export function formatSolarKpiLines(report: KpiReport): string[] {
  return [
    `Weekly solar: ${formatKwh(report.weekly.generationKwh)}`,
    `Typical day for reminders: ${formatKwh(report.weekly.generationKwh / DAYS_PER_WEEK)}`,
  ]
}

/** Household appliance / occupancy changes — weekly modelled KPIs. */
export function formatHouseholdKpiLines(report: KpiReport): string[] {
  return [
    `Weekly use: ${formatKwh(report.weekly.consumptionKwh)}`,
    `Weekly solar: ${formatKwh(report.weekly.generationKwh)}`,
    `Weekly VPP savings: ${formatAud(report.weekly.savingsAud)}`,
    `Weekly surplus: ${formatKwh(report.weekly.surplusKwh)}`,
  ]
}

export type MetricCompareRow = {
  label: string
  nowDisplay: string
  afterDisplay: string
  delta: string | null
  deltaTone: 'up' | 'down' | 'neutral'
}

function metricDelta(
  now: number,
  after: number,
  unit: 'kwh' | 'aud',
): Pick<MetricCompareRow, 'delta' | 'deltaTone'> {
  const diff = after - now
  if (Math.abs(diff) < 0.005) {
    return { delta: null, deltaTone: 'neutral' }
  }
  const arrow = diff > 0 ? '▲' : '▼'
  const formatted = unit === 'aud' ? formatAud(Math.abs(diff)) : formatKwh(Math.abs(diff))
  return { delta: `${arrow} ${formatted}`, deltaTone: diff > 0 ? 'up' : 'down' }
}

/** Side-by-side household KPI rows with numeric deltas for the compare dialog. */
export function householdCompareRows(now: KpiReport, after: KpiReport): MetricCompareRow[] {
  return [
    {
      label: 'Weekly use',
      nowDisplay: formatKwh(now.weekly.consumptionKwh),
      afterDisplay: formatKwh(after.weekly.consumptionKwh),
      ...metricDelta(now.weekly.consumptionKwh, after.weekly.consumptionKwh, 'kwh'),
    },
    {
      label: 'Weekly solar',
      nowDisplay: formatKwh(now.weekly.generationKwh),
      afterDisplay: formatKwh(after.weekly.generationKwh),
      ...metricDelta(now.weekly.generationKwh, after.weekly.generationKwh, 'kwh'),
    },
    {
      label: 'Weekly VPP savings',
      nowDisplay: formatAud(now.weekly.savingsAud),
      afterDisplay: formatAud(after.weekly.savingsAud),
      ...metricDelta(now.weekly.savingsAud, after.weekly.savingsAud, 'aud'),
    },
    {
      label: 'Weekly surplus',
      nowDisplay: formatKwh(now.weekly.surplusKwh),
      afterDisplay: formatKwh(after.weekly.surplusKwh),
      ...metricDelta(now.weekly.surplusKwh, after.weekly.surplusKwh, 'kwh'),
    },
  ]
}

/** Solar scenario KPI rows with deltas (generation-focused). */
export function solarCompareRows(now: KpiReport, after: KpiReport): MetricCompareRow[] {
  const nowDay = now.weekly.generationKwh / DAYS_PER_WEEK
  const afterDay = after.weekly.generationKwh / DAYS_PER_WEEK
  return [
    {
      label: 'Weekly solar',
      nowDisplay: formatKwh(now.weekly.generationKwh),
      afterDisplay: formatKwh(after.weekly.generationKwh),
      ...metricDelta(now.weekly.generationKwh, after.weekly.generationKwh, 'kwh'),
    },
    {
      label: 'Typical day for reminders',
      nowDisplay: formatKwh(nowDay),
      afterDisplay: formatKwh(afterDay),
      ...metricDelta(nowDay, afterDay, 'kwh'),
    },
  ]
}

/**
 * Footnote under the compare grid, matched to the scenario type.
 */
export function compareFootnote(kind: WhatIfKind): string | null {
  if (kind === 'battery') return null
  if (kind === 'household') {
    return 'Modelled from your answers and published appliance ratings, not a live meter reading.'
  }
  return (
    'Reminder dates stay the same. Only the typical generation figure behind them ' +
    'changes. Forecast and typical both scale with panel size and direction.'
  )
}
