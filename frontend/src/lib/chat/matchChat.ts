/**
 * Maps a typed chat sentence to a question the assistant knows (Epic 6).
 * Same idea as setup voice extract: phrase patterns, not a hosted model.
 */
import { normalise } from '../voice/extract'

export type ChatIntent =
  | 'energy_picture'
  | 'appliances'
  | 'balance'
  | 'plan_first'
  | 'plan_terms'
  | 'reminder_days'
  | 'download_calendar'

export const CHAT_UNMATCHED =
  'We could not match that to a question we know. Nothing has changed.'

/**
 * matchChatIntent
 * @param message - Raw sentence from the dock
 * @returns A known intent, or null when nothing matches
 */
export function matchChatIntent(message: string): ChatIntent | null {
  const text = normalise(message)
  if (!text) return null

  if (matchesDownloadCalendar(text)) return 'download_calendar'
  if (matchesReminderDays(text)) return 'reminder_days'
  if (matchesPlanTerms(text)) return 'plan_terms'
  if (matchesPlanFirst(text)) return 'plan_first'
  if (matchesAppliances(text)) return 'appliances'
  if (matchesBalance(text)) return 'balance'
  if (matchesEnergyPicture(text)) return 'energy_picture'

  return null
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
