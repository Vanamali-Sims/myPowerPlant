/**
 * Rule-based What if suggestions from the local methodology model.
 *
 * These are modelled next-steps, not a live advisor and not a remote model.
 * Suggestions always start from the combined draft so the panel updates as
 * the user tries changes.
 */
import { FIELD_BOUNDS } from '../../constants/validation'
import { batteryModels, NOT_SURE_VALUE, solarDirections } from '../../data/profileOptions'
import type { MethodologyBundle } from '../methodologyApi'
import { applyProfilePatch } from './applyProfilePatch'
import { buildKpiReport, formatAud, formatKwh, parseCount } from '../kpis'
import { matchSuggestionPlans } from '../vppSuggestions'
import type { ProfileData, SolarDirection } from '../../types/profile'

export type WhatIfSuggestionTab = 'household' | 'battery' | 'solar'

export type WhatIfSuggestionApply = {
  people?: string
  dishwasher?: string
  washer?: string
  battery?: string
  panelCount?: string
  direction?: SolarDirection | ''
}

export type WhatIfSuggestion = {
  id: 'direction' | 'panel' | 'battery' | 'dishwasher' | 'washer'
  title: string
  reason: string
  impact: string
  apply: WhatIfSuggestionApply
  tab: WhatIfSuggestionTab
}

const HIGH_CYCLE = 6

function tryPatch(profile: ProfileData, patch: Partial<ProfileData>): ProfileData | null {
  const result = applyProfilePatch(profile, patch)
  return result.ok ? result.profile : null
}

function directionLabel(value: string): string {
  if (!value) return '—'
  return solarDirections.find((row) => row.value === value)?.label ?? value
}

/** Strongest compiled orientation, excluding “not sure”. */
export function bestSolarDirection(factors: Record<string, number>): SolarDirection | '' {
  const ranked = Object.entries(factors)
    .filter(([key]) => key !== 'not_sure' && solarDirections.some((row) => row.value === key))
    .sort((a, b) => b[1] - a[1])
  return (ranked[0]?.[0] as SolarDirection | undefined) ?? ''
}

function savingsLift(now: number, next: number): string | null {
  const diff = next - now
  if (Math.abs(diff) < 0.05) return null
  const arrow = diff > 0 ? '▲' : '▼'
  return `${arrow} ${formatAud(Math.abs(diff))} weekly VPP savings`
}

function generationLift(now: number, next: number): string | null {
  const diff = next - now
  if (Math.abs(diff) < 0.05) return null
  const arrow = diff > 0 ? '▲' : '▼'
  return `${arrow} ${formatKwh(Math.abs(diff))} weekly solar`
}

function useDrop(now: number, next: number): string | null {
  const diff = now - next
  if (diff < 0.05) return null
  return `▼ ${formatKwh(diff)} weekly use`
}

/**
 * buildWhatIfSuggestions
 * @param draft - Combined What if draft, not only the saved profile
 * @param bundle - Compiled methodology used for KPIs and VPP matching
 * @returns Ranked next-steps the user can apply into the draft
 */
export function buildWhatIfSuggestions(
  draft: ProfileData,
  bundle: MethodologyBundle,
): WhatIfSuggestion[] {
  const reportNow = buildKpiReport(draft, bundle)
  const suggestions: WhatIfSuggestion[] = []
  const solarOn = draft.hasSolar === 'yes'

  if (solarOn) {
    const best = bestSolarDirection(bundle.orientationFactors)
    if (best && best !== draft.solarDirection) {
      const next = tryPatch(draft, { solarDirection: best })
      if (next) {
        const report = buildKpiReport(next, bundle)
        suggestions.push({
          id: 'direction',
          title: `Point panels ${directionLabel(best)}`,
          reason: `This model scores ${directionLabel(best)} as the strongest direction for your postcode. You’re currently on ${directionLabel(draft.solarDirection)}.`,
          impact: generationLift(reportNow.weekly.generationKwh, report.weekly.generationKwh) ?? 'Stronger modelled generation.',
          apply: { direction: best },
          tab: 'solar',
        })
      }
    }

    const currentPanels = parseCount(draft.panelCount)
    const nextPanels = Math.min(currentPanels + 1, FIELD_BOUNDS.panelCount.max)
    if (nextPanels > currentPanels) {
      const next = tryPatch(draft, { panelCount: String(nextPanels) })
      if (next) {
        const report = buildKpiReport(next, bundle)
        suggestions.push({
          id: 'panel',
          title: `Try ${nextPanels} panels`,
          reason: `You have ${currentPanels || '0'} panels on this setup. One more panel scales typical generation in this model.`,
          impact: generationLift(reportNow.weekly.generationKwh, report.weekly.generationKwh) ?? 'More modelled solar.',
          apply: { panelCount: String(nextPanels) },
          tab: 'solar',
        })
      }
    }
  }

  const plansNow = matchSuggestionPlans(draft, bundle.vppSuggestionPlans, bundle.batteryModels)
  const listedBattery = batteryModels.find((model) => {
    if (model === draft.batteryModel) return false
    const next = tryPatch(draft, { batteryModel: model })
    if (!next) return false
    if (!bundle.vppSuggestionPlans.length) return true
    return matchSuggestionPlans(next, bundle.vppSuggestionPlans, bundle.batteryModels).matches.length > 0
  })
  const needsBattery =
    !plansNow.matches.length &&
    (Boolean(listedBattery) || !draft.batteryModel || draft.batteryModel === NOT_SURE_VALUE)
  if (needsBattery && listedBattery) {
    suggestions.push({
      id: 'battery',
      title: `Try ${listedBattery}`,
      reason:
        draft.batteryModel && draft.batteryModel !== NOT_SURE_VALUE
          ? 'No VPP plan lists the battery on this setup. A listed model can unlock a Reserve, Opt Out, and Discharge match.'
          : 'Pick a listed battery so the VPP card can show Reserve, Opt Out, and Discharge.',
      impact: 'Unlocks a modelled VPP recommendation.',
      apply: { battery: listedBattery },
      tab: 'battery',
    })
  }

  const billedUse = Number.parseFloat(draft.monthlyKwh) > 0
  const dishwasher = parseCount(draft.dishwasherCyclesPerWeek)
  if (!billedUse && dishwasher >= HIGH_CYCLE) {
    const nextCount = dishwasher - 1
    const next = tryPatch(draft, { dishwasherCyclesPerWeek: String(nextCount) })
    if (next) {
      const report = buildKpiReport(next, bundle)
      suggestions.push({
        id: 'dishwasher',
        title: `One fewer dishwasher cycle`,
        reason: `This setup is on ${dishwasher} dishwasher cycles a week. Dropping one cycle is a small modelled change you can try without saving.`,
        impact:
          useDrop(reportNow.weekly.consumptionKwh, report.weekly.consumptionKwh) ??
          savingsLift(reportNow.weekly.savingsAud, report.weekly.savingsAud) ??
          'Slightly lower modelled use.',
        apply: { dishwasher: String(nextCount) },
        tab: 'household',
      })
    }
  }

  const washer = parseCount(draft.washerCyclesPerWeek)
  if (!billedUse && washer >= HIGH_CYCLE) {
    const nextCount = washer - 1
    const next = tryPatch(draft, { washerCyclesPerWeek: String(nextCount) })
    if (next) {
      const report = buildKpiReport(next, bundle)
      suggestions.push({
        id: 'washer',
        title: `One fewer wash cycle`,
        reason: `This setup is on ${washer} washing machine cycles a week. Try one fewer to see the modelled household card move.`,
        impact:
          useDrop(reportNow.weekly.consumptionKwh, report.weekly.consumptionKwh) ??
          savingsLift(reportNow.weekly.savingsAud, report.weekly.savingsAud) ??
          'Slightly lower modelled use.',
        apply: { washer: String(nextCount) },
        tab: 'household',
      })
    }
  }

  const rank: Record<WhatIfSuggestion['id'], number> = {
    direction: 0,
    battery: 1,
    panel: 2,
    dishwasher: 3,
    washer: 4,
  }
  return suggestions.sort((a, b) => rank[a.id] - rank[b.id])
}
