/**
 * Builds chat replies from the same dashboard functions (Epic 6.2–6.3).
 */
import { buildEnergyRiver, riverForkStage, riverPeriod } from '../energyRiver'
import {
  buildKpiReport,
  formatAud,
  formatKg,
  formatKwh,
  scaleAud,
  scaleKwh,
  type Timeframe,
} from '../kpis'
import type { MethodologyBundle, VppSuggestionTermKey } from '../methodologyApi'
import {
  formatVerifiedDate,
  isTermStale,
  matchSuggestionPlans,
  planFitCopy,
  STALE_PROMPT,
  termByKey,
  TERM_LABELS,
  UNAVAILABLE_TERM,
  type MatchReasonCode,
} from '../vppSuggestions'
import type { ProfileData } from '../../types/profile'
import type { EventType } from '../../types/reminders'
import { buildProfileDisplayReply } from './buildProfileDisplayReply'
import type { ChatDataIntent } from './matchChat'

const MATCH_EMPTY: Record<MatchReasonCode, string> = {
  battery:
    'Your battery model isn’t listed as supported by any plan we track. Update your profile if the model was a guess, or check with the provider.',
  region:
    'None of the plans we track cover your postcode’s region yet. MyPowerPlant currently compiles Victorian offers.',
  none: 'We don’t have a matching VPP plan for this home yet.',
}

export type ChatReplyContext = {
  profile: ProfileData
  hasProfile: boolean
  bundle: MethodologyBundle | null
  methodologyError: string
  timeframe: Timeframe
  eventType: EventType
  reminderPeriodDays: string
}

function scaleCarbonKg(weeklyKg: number, timeframe: Timeframe): number {
  if (timeframe === 'daily') return weeklyKg / 7
  if (timeframe === 'fortnightly') return weeklyKg * 2
  return weeklyKg
}

function profileGate(ctx: ChatReplyContext): string | null {
  if (!ctx.hasProfile) {
    return 'Your energy picture needs a saved profile first. Fill the onboarding form in Setup, then ask again.'
  }
  return null
}

function methodologyGate(ctx: ChatReplyContext): string | null {
  if (ctx.methodologyError) {
    return `Dashboard rates could not be loaded. ${ctx.methodologyError}`
  }
  if (!ctx.bundle) {
    return 'Loading rates and appliance ratings… Ask again in a moment.'
  }
  return null
}

/**
 * buildChatReply
 * @param intent - Matched question
 * @param ctx - Profile, timeframe, and methodology bundle
 * @returns Reply text for the transcript
 */
export function buildChatReply(intent: ChatDataIntent | 'profile_display', ctx: ChatReplyContext): string {
  if (intent === 'profile_display') {
    if (!ctx.hasProfile) {
      return 'Your profile is not saved yet. Complete Setup first, then ask again.'
    }
    return buildProfileDisplayReply(ctx.profile)
  }

  const profileBlock = profileGate(ctx)
  if (profileBlock) return profileBlock

  const blocked = methodologyGate(ctx)
  if (blocked) return blocked

  const { profile, bundle, timeframe } = ctx
  const report = buildKpiReport(profile, bundle!)
  const period = riverPeriod(timeframe).toLowerCase()

  if (intent === 'energy_picture') {
    const used = scaleKwh(report.weekly.consumptionKwh, timeframe)
    const generated = scaleKwh(report.weekly.generationKwh, timeframe)
    const carbon = formatKg(scaleCarbonKg(report.weekly.carbonAvoidedKg, timeframe))
    const deficit = report.weekly.generationKwh < report.weekly.consumptionKwh
    const moneyLine = deficit
      ? `Net energy cost ${formatAud(scaleAud(Math.abs(report.weekly.netEnergyValueAud), timeframe))} for ${period} — home uses more than it makes.`
      : `Estimated savings ${formatAud(scaleAud(report.weekly.savingsAud, timeframe))} for ${period}.`
    return [
      `For ${period}, energy used is ${formatKwh(used)}, generated ${formatKwh(generated)}.`,
      moneyLine,
      `Carbon avoided ${carbon}.`,
    ].join(' ')
  }

  if (intent === 'appliances') {
    const lines = [...report.appliances]
      .sort((a, b) => b.weeklyKwh - a.weeklyKwh)
      .filter((row) => row.weeklyKwh > 0)
      .slice(0, 8)
      .map(
        (row) =>
          `${row.spec.name}: ${formatKwh(scaleKwh(row.weeklyKwh, timeframe))} for ${period}`,
      )
    if (!lines.length) {
      return 'No appliance breakdown is available for this profile yet.'
    }
    return `Appliance use for ${period}: ${lines.join('; ')}.`
  }

  if (intent === 'balance') {
    const river = buildEnergyRiver({
      report,
      timeframe,
      feedInRate: bundle!.methodology.defaultFeedInRate,
    })
    const stage = riverForkStage(river.fork)
    if (river.fork === 'balanced') {
      return `For ${period}, generation and use are in balance — the home is not ahead or behind.`
    }
    if (river.fork === 'surplus') {
      return `For ${period}, the home is ahead: ${stage.eyebrow.toLowerCase()} ${formatKwh(river.forkKwh)}.`
    }
    return `For ${period}, the home is behind: ${stage.eyebrow.toLowerCase()} ${formatKwh(river.forkKwh)} — home uses more than it makes.`
  }

  const matchResult = matchSuggestionPlans(
    profile,
    bundle!.vppSuggestionPlans,
    bundle!.batteryModels,
  )

  if (intent === 'plan_first') {
    if (matchResult.emptyReason) {
      return MATCH_EMPTY[matchResult.emptyReason]
    }
    const top = matchResult.matches[0]!
    const { why } = planFitCopy(profile, top)
    return [
      `Top match: ${top.plan.brand} — ${top.plan.name}.`,
      why[0] ?? '',
      'Compiled terms — not a guaranteed return.',
    ]
      .filter(Boolean)
      .join(' ')
  }

  if (matchResult.emptyReason) {
    return MATCH_EMPTY[matchResult.emptyReason]
  }

  const top = matchResult.matches[0]!
  const plan = top.plan
  const keys: VppSuggestionTermKey[] = ['reserve_min', 'event_cap', 'opt_out', 'payment']
  const parts = keys.map((key) => {
    const term = termByKey(plan, key)
    const label = TERM_LABELS[key]
    if (!term) {
      return `${label}: ${UNAVAILABLE_TERM}.`
    }
    let line = `${label}: ${term.valueText}`
    if (isTermStale(term.lastVerified)) {
      line += ` May be outdated — verified ${formatVerifiedDate(term.lastVerified)}. ${STALE_PROMPT}`
    }
    return line
  })

  return [`${plan.brand} — ${plan.name}.`, ...parts].join(' ')
}
