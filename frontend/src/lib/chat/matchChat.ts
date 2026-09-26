/**
 * Maps a typed chat sentence to a question the assistant knows (Epic 6).
 * Same idea as setup voice extract: phrase patterns, not a hosted model.
 */
import type { AppNavId } from '../../constants/navigation'
import type { Timeframe } from '../kpis'
import { normalise } from '../voice/extract'
import { parseProfilePatch } from './parseProfilePatch'

export type ChatDataIntent =
  | 'energy_picture'
  | 'appliances'
  | 'balance'
  | 'plan_first'
  | 'plan_terms'
  | 'reminder_days'
  | 'download_calendar'

export type ChatIntent =
  | ChatDataIntent
  | 'navigate'
  | 'set_timeframe'
  | 'set_profile'
  | 'reset_profile'
  | 'profile_display'

export type ChatNavigateTarget = AppNavId | 'setup'

export type ChatMatch =
  | { intent: ChatDataIntent }
  | { intent: 'navigate'; target: ChatNavigateTarget }
  | { intent: 'set_timeframe'; timeframe: Timeframe }
  | { intent: 'set_profile'; patch: Partial<import('../../types/profile').ProfileData> }
  | { intent: 'reset_profile' }
  | { intent: 'profile_display' }

export const CHAT_UNMATCHED =
  'We could not match that to a question we know. Nothing has changed.'

export const PROFILE_LOCKED_MESSAGE = 'Complete setup to view your profile.'

/**
 * matchChat
 * @param message - Raw sentence from the dock
 */
export function matchChat(message: string): ChatMatch | null {
  const text = normalise(message)
  if (!text) return null

  if (matchesResetProfile(text)) return { intent: 'reset_profile' }

  const nav = parseNavigateTarget(text)
  if (nav) return { intent: 'navigate', target: nav }

  const timeframe = parseTimeframe(text)
  if (timeframe) return { intent: 'set_timeframe', timeframe }

  if (matchesProfileDisplay(text)) return { intent: 'profile_display' }

  const patch = parseProfilePatch(message)
  if (patch && matchesSetProfile(text, patch)) return { intent: 'set_profile', patch }

  if (matchesDownloadCalendar(text)) return { intent: 'download_calendar' }
  if (matchesReminderDays(text)) return { intent: 'reminder_days' }
  if (matchesPlanTerms(text)) return { intent: 'plan_terms' }
  if (matchesPlanFirst(text)) return { intent: 'plan_first' }
  if (matchesAppliances(text)) return { intent: 'appliances' }
  if (matchesBalance(text)) return { intent: 'balance' }
  if (matchesEnergyPicture(text)) return { intent: 'energy_picture' }

  return null
}

/**
 * matchChatIntent
 * @deprecated Prefer matchChat for action payloads
 */
export function matchChatIntent(message: string): ChatIntent | null {
  const match = matchChat(message)
  return match?.intent ?? null
}

function matchesResetProfile(text: string): boolean {
  return (
    /\breset (my )?profile\b/.test(text) ||
    /\bclear (my )?profile\b/.test(text) ||
    /\bdelete (my )?profile\b/.test(text) ||
    /\bstart over\b/.test(text) ||
    /\bwipe (my )?answers\b/.test(text)
  )
}

export function parseNavigateTarget(text: string): ChatNavigateTarget | null {
  if (
    /\b(open|go to|show|switch to|take me to)\s+(the )?setup\b/.test(text) ||
    /\bstart setup\b/.test(text) ||
    /\bfinish setup\b/.test(text)
  ) {
    return 'setup'
  }
  if (/\b(open|go to|show|switch to|take me to)\s+(the )?home\b/.test(text) || /\bgo home\b/.test(text)) {
    return 'home'
  }
  if (/\b(open|go to|show|switch to|take me to)\s+(the )?dashboard\b/.test(text)) {
    return 'dashboard'
  }
  if (/\b(open|go to|show|switch to|take me to)\s+(the )?profile\b/.test(text)) {
    return 'profile'
  }
  if (/\b(open|go to|show|switch to|take me to)\s+(the )?reminders\b/.test(text)) {
    return 'reminders'
  }
  return null
}

export function parseTimeframe(text: string): Timeframe | null {
  if (/\b(daily|day view|each day)\b/.test(text) && /\b(show|switch|use|set|timeframe|view|numbers)\b/.test(text)) {
    return 'daily'
  }
  if (/\b(fortnight|fortnightly|two weeks)\b/.test(text) && /\b(show|switch|use|set|timeframe|view|numbers)\b/.test(text)) {
    return 'fortnightly'
  }
  if (/\bweekly\b/.test(text) && /\b(show|switch|use|set|timeframe|view|numbers)\b/.test(text)) {
    return 'weekly'
  }
  if (/\bset (the )?timeframe to (daily|weekly|fortnightly)\b/.test(text)) {
    const word = text.match(/\bset (the )?timeframe to (daily|weekly|fortnightly)\b/)?.[2]
    if (word === 'daily' || word === 'weekly' || word === 'fortnightly') return word
  }
  return null
}

function matchesProfileDisplay(text: string): boolean {
  return (
    /\bwhat (does|did) my profile say\b/.test(text) ||
    /\bshow (me )?my profile\b/.test(text) ||
    /\bwhat'?s on my profile\b/.test(text) ||
    /\bprofile details\b/.test(text) ||
    /\bwhat are my profile answers\b/.test(text)
  )
}

function matchesSetProfile(text: string, patch: Partial<import('../../types/profile').ProfileData>): boolean {
  if (/\b(change|set|update|correct|fix|make)\b/.test(text)) return true
  if (patch.postcode && /\bpost\s*code\b/.test(text)) return true
  if (patch.monthlyBill && /\bbill\b/.test(text)) return true
  if (patch.people && /\bpeople\b/.test(text)) return true
  if (patch.batteryModel) return true
  if (patch.provider) return true
  if (patch.hasSolar) return true
  return Object.keys(patch).length > 0 && !matchesProfileDisplay(text)
}

function matchesDownloadCalendar(text: string): boolean {
  return (
    /\badd (these |those |the )?days to (my )?calendar\b/.test(text) ||
    /\badd reminders to (my )?calendar\b/.test(text) ||
    /\bdownload (the )?calendar\b/.test(text) ||
    (/\bdownload\b/.test(text) && /\b(reminder|calendar)\b/.test(text))
  )
}

function matchesReminderDays(text: string): boolean {
  return (
    /\breminder days\b/.test(text) ||
    /\bforecast days\b/.test(text) ||
    (/\bwhich days\b/.test(text) && /\b(join|opt out|remind|discharge)\b/.test(text)) ||
    (/\bsolar forecast\b/.test(text) && /\bdays?\b/.test(text))
  )
}

function matchesPlanTerms(text: string): boolean {
  return (
    /\bterms\b/.test(text) ||
    /\breserve\b/.test(text) ||
    /\bevent cap\b/.test(text) ||
    /\bopt out\b/.test(text) ||
    /\bopt-out\b/.test(text) ||
    /\bpayment structure\b/.test(text) ||
    /\bpayment wording\b/.test(text) ||
    /\bhow (do|does) (it|this plan) pay\b/.test(text)
  )
}

function matchesPlanFirst(text: string): boolean {
  return (
    /\bwhich plan\b/.test(text) ||
    /\bfirst plan\b/.test(text) ||
    /\btop plan\b/.test(text) ||
    /\bwhat plan fits\b/.test(text) ||
    /\bvpp plan\b/.test(text) ||
    /\brecommend(ed)? plan\b/.test(text) ||
    /\bwhy (does|do) (that|this|the) plan\b/.test(text) ||
    /\bwhy (it|that) suits\b/.test(text)
  )
}

function matchesAppliances(text: string): boolean {
  return (
    /\bappliance/.test(text) ||
    /\bdriving (my )?use\b/.test(text) ||
    /\bwhat uses\b/.test(text) ||
    /\bbreakdown\b/.test(text) ||
    /\bwhich (things|devices)\b/.test(text)
  )
}

function matchesBalance(text: string): boolean {
  return (
    /\bahead\b/.test(text) ||
    /\bbehind\b/.test(text) ||
    /\bsurplus\b/.test(text) ||
    /\bgap\b/.test(text) ||
    /\bbalance\b/.test(text) ||
    /\bleftover\b/.test(text) ||
    /\bgenerat(e|ing) more\b/.test(text) ||
    /\buses more than\b/.test(text) ||
    /\bhome uses more\b/.test(text)
  )
}

function matchesEnergyPicture(text: string): boolean {
  return (
    /\benergy picture\b/.test(text) ||
    /\bweekly picture\b/.test(text) ||
    /\bmy (use|usage|consumption|generation|numbers|figures)\b/.test(text) ||
    /\bhow much energy\b/.test(text) ||
    /\bsavings\b/.test(text) ||
    /\bcarbon\b/.test(text) ||
    /\bextra cost\b/.test(text) ||
    /\bnet energy\b/.test(text)
  )
}
