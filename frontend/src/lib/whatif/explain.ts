/**
 * What if explanation: the charts are already drawn; this only writes the line.
 *
 * Figures are computed here. A hosted model may phrase them after the user
 * pauses. Any sentence with a figure that was not computed is discarded, and
 * the fixed line is shown instead.
 */
import { API_BASE_URL, API_PATHS } from '../../constants/api'
import { formatKwh, type KpiReport } from '../kpis'
import { buildTypicalDay, formatHour, leftoverHours, type HourPoint } from '../typicalDay'
import {
  householdControlScore,
  isTermStale,
  matchSuggestionPlans,
  type SuggestionResult,
} from '../vppSuggestions'
import type { MethodologyBundle } from '../methodologyApi'
import type { ProfileData } from '../../types/profile'
import { checkNumbers, type ExplainFact } from './guard'

const MATERIAL_WEEKLY_AUD = 0.5
const LOW_CONTROL = 45

export type ExplainDecision = 'change' | 'keep' | 'unclear'

export type ExplainInput = {
  changes: string[]
  decision: ExplainDecision
  /** Weekly move is below half a dollar, so it is not a reason to change. */
  quiet: boolean
  facts: ExplainFact[]
  surplusNow: string
  surplusDraft: string
  lowControl: boolean
  staleTerms: boolean
  reserveNow: number | null
  reserveDraft: number | null
}

export type ExplainResult = {
  text: string
  source: 'model' | 'template'
}

function cents(value: number): { display: string; numeric: number } {
  const numeric = Math.round(Math.abs(value) * 100) / 100
  const sign = value < 0 ? '-' : ''
  return { display: `${sign}$${numeric.toFixed(2)}`, numeric }
}

function kwhFigure(value: number): number {
  const abs = Math.abs(value)
  if (abs >= 100) return Math.round(abs)
  if (abs >= 10) return Math.round(abs * 10) / 10
  return Math.round(abs * 100) / 100
}

function fact(id: string, label: string, display: string, numeric: number | null): ExplainFact {
  return { id, label, display, numeric }
}

/** Hours where solar is above household use, as a clock span such as "11am to 3pm". */
export function surplusLabel(points: HourPoint[]): string {
  const hours = leftoverHours(points).map((point) => point.hour)
  if (!hours.length) return 'none'
  const start = Math.min(...hours)
  const end = Math.max(...hours)
  if (start === end) return formatHour(start)
  return `${formatHour(start)} to ${formatHour(end)}`
}

function reserveNumber(value: string): number | null {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  return Math.round(parsed)
}

/**
 * buildExplainInput
 * @param reportNow - KPI report for the saved setup
 * @param reportDraft - KPI report for the setup being tried
 * @param plansDraft - VPP matches for the draft, used for control and stale terms
 * @param changes - What the user altered, in their words
 * @param reserveNow - Saved battery reserve percent
 * @param reserveDraft - Draft battery reserve percent
 * @returns The decision and every figure a sentence may cite
 */
export function buildExplainInput(
  reportNow: KpiReport,
  reportDraft: KpiReport,
  plansDraft: SuggestionResult | null,
  changes: string[],
  reserveNow: number | null,
  reserveDraft: number | null,
): ExplainInput {
  const nowSave = reportNow.weekly.savingsAud
  const draftSave = reportDraft.weekly.savingsAud
  const delta = draftSave - nowSave
  const annualNumeric = Math.round(Math.abs(delta) * 52)
  const nowMoney = cents(nowSave)
  const draftMoney = cents(draftSave)
  const deltaMoney = cents(delta)
  const top = plansDraft?.matches[0] ?? null

  const quiet = top != null && Math.abs(delta) < MATERIAL_WEEKLY_AUD
  let decision: ExplainDecision = 'unclear'
  if (quiet || (top && delta <= 0)) decision = 'keep'
  else if (top) decision = 'change'

  const facts: ExplainFact[] = [
    fact('save.now', 'Weekly VPP payment now', nowMoney.display, nowMoney.numeric),
    fact('save.draft', 'Weekly VPP payment after', draftMoney.display, draftMoney.numeric),
    fact('save.delta', 'Change in weekly VPP payment', deltaMoney.display, deltaMoney.numeric),
    fact('save.annual', 'Change over a year', `$${annualNumeric}`, annualNumeric),
    fact('gen.now', 'Weekly solar now', formatKwh(reportNow.weekly.generationKwh), kwhFigure(reportNow.weekly.generationKwh)),
    fact('gen.draft', 'Weekly solar after', formatKwh(reportDraft.weekly.generationKwh), kwhFigure(reportDraft.weekly.generationKwh)),
    fact('use.now', 'Weekly use now', formatKwh(reportNow.weekly.consumptionKwh), kwhFigure(reportNow.weekly.consumptionKwh)),
    fact('use.draft', 'Weekly use after', formatKwh(reportDraft.weekly.consumptionKwh), kwhFigure(reportDraft.weekly.consumptionKwh)),
  ]

  if (reserveNow != null) {
    facts.push(fact('reserve.now', 'Battery reserve now', `${reserveNow}%`, reserveNow))
  }
  if (reserveDraft != null) {
    facts.push(fact('reserve.draft', 'Battery reserve after', `${reserveDraft}%`, reserveDraft))
  }
  if (top) {
    facts.push(fact('plan.name', 'Matched plan', `${top.plan.brand} ${top.plan.name}`, null))
  }

  const lowControl = top != null && householdControlScore(top.plan) < LOW_CONTROL
  const staleTerms = (top?.plan.terms ?? []).some((term) => term.lastVerified && isTermStale(term.lastVerified))

  return {
    changes,
    decision,
    quiet,
    facts,
    surplusNow: surplusLabel(buildTypicalDay(reportNow.periods)),
    surplusDraft: surplusLabel(buildTypicalDay(reportDraft.periods)),
    lowControl,
    staleTerms,
    reserveNow,
    reserveDraft,
  }
}

export function plansFor(profile: ProfileData, bundle: MethodologyBundle): SuggestionResult {
  return matchSuggestionPlans(profile, bundle.vppSuggestionPlans, bundle.batteryModels)
}

/** The line shown when the model is off, slow, or rejected. */
export function templateExplain(input: ExplainInput): string {
  const annual = input.facts.find((item) => item.id === 'save.annual')?.display ?? '—'
  const weeklyNow = input.facts.find((item) => item.id === 'save.now')?.display ?? '—'
  const weeklyDraft = input.facts.find((item) => item.id === 'save.draft')?.display ?? '—'
  const weeklyDelta = input.facts.find((item) => item.id === 'save.delta')?.display ?? '—'

  let lead: string
  if (input.decision === 'change') {
    lead = `Worth changing. This is about ${annual} more over a year — ${weeklyDraft} a week, against ${weeklyNow} now.`
  } else if (input.decision === 'unclear') {
    lead = 'Not enough to judge yet. This setup does not match a VPP plan we hold, so there is no payment to compare.'
  } else if (input.quiet) {
    lead = `Stay as you are. The difference is ${weeklyDelta} a week, inside the margin of this estimate.`
  } else {
    lead = `Stay as you are. This change is about ${annual} less over a year.`
  }

  const day =
    input.surplusDraft === 'none'
      ? 'The day chart shows no spare solar for a VPP to take.'
      : `Spare solar on the day chart runs ${input.surplusDraft}.`

  const reserve =
    input.reserveNow != null &&
    input.reserveDraft != null &&
    input.reserveNow !== input.reserveDraft
      ? `Battery reserve moves from ${input.reserveNow}% to ${input.reserveDraft}%, so more or less of the battery stays for the house.`
      : ''

  const control = input.lowControl ? 'This plan leaves the household less say over the battery.' : ''
  const stale = input.staleTerms ? 'Some of this plan’s terms have not been checked in over 90 days.' : ''

  return [lead, day, reserve, control, stale, 'These figures are a model, not your bill.'].filter(Boolean).join(' ')
}

/**
 * explainChange
 * @param input - Decision and figures already calculated on the device
 * @param signal - Aborted when the user moves a control again
 * @returns The model sentence when it stays inside the figures, otherwise the fixed line
 */
export async function explainChange(input: ExplainInput, signal: AbortSignal): Promise<ExplainResult> {
  const fallback = templateExplain(input)
  if (!API_BASE_URL) return { text: fallback, source: 'template' }

  try {
    const response = await fetch(`${API_BASE_URL}${API_PATHS.advice}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        changes: input.changes,
        decision: input.decision,
        surplusNow: input.surplusNow,
        surplusDraft: input.surplusDraft,
        lowControl: input.lowControl,
        staleTerms: input.staleTerms,
        facts: input.facts,
      }),
      signal,
    })
    if (!response.ok) return { text: fallback, source: 'template' }
    const body = (await response.json()) as { available?: boolean; text?: string }
    const text = body.text?.trim() ?? ''
    if (!body.available || !text) return { text: fallback, source: 'template' }
    const checked = checkNumbers(text, input.facts)
    if (!checked.ok) return { text: fallback, source: 'template' }
    return { text: checked.text, source: 'model' }
  } catch {
    return { text: fallback, source: 'template' }
  }
}

export function reservePercents(saved: string, draft: string): { now: number | null; next: number | null } {
  return { now: reserveNumber(saved), next: reserveNumber(draft) }
}
