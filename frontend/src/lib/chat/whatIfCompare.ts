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
          ? ` — ${formatKwhShort(row.reserveHeadroomKwh)} reserve headroom`
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

/**
 * Footnote under the compare grid, matched to the scenario type.
 */
export function compareFootnote(kind: WhatIfKind): string | null {
  if (kind === 'battery') return null
  if (kind === 'household') {
    return 'Modelled from your answers and published appliance ratings — not a live meter reading.'
  }
  return (
    'Reminder dates stay the same — only the typical generation figure behind them ' +
    'changes. Forecast and typical both scale with panel size and direction.'
  )
}
