/**
 * Epic 6.4 — reminder days and calendar download from chat.
 */
import { DEFAULT_RESERVE_PERCENT, FIELD_BOUNDS, clampNumber } from '../../constants/validation'
import { buildIcsFile, downloadIcsFile } from '../calendarExport'
import { formatReminderDaysReply, loadReminderRecommendations } from '../reminderRecommendations'
import type { ChatReplyContext } from './buildChatReply'
import type { ChatIntent } from './matchChat'

function reservePercent(profile: ChatReplyContext['profile']): number {
  return clampNumber(
    Number.parseInt(profile.reservePercent || DEFAULT_RESERVE_PERCENT, 10),
    FIELD_BOUNDS.reservePercent.min,
    FIELD_BOUNDS.reservePercent.max,
  )
}

function reminderInput(ctx: ChatReplyContext) {
  return {
    profile: ctx.profile,
    bundle: ctx.bundle!,
    eventType: ctx.eventType,
    reminderPeriodDays: ctx.reminderPeriodDays,
    postcode: ctx.profile.postcode,
  }
}

/**
 * isAsyncChatIntent
 * @param intent - Matched chat intent
 * @returns True when the reply needs a forecast fetch
 */
export function isAsyncChatIntent(intent: ChatIntent): boolean {
  return intent === 'reminder_days' || intent === 'download_calendar'
}

/**
 * buildAsyncChatReply
 * @param intent - reminder_days or download_calendar
 * @param ctx - Shared chat context including reminder settings
 */
export async function buildAsyncChatReply(
  intent: ChatIntent,
  ctx: ChatReplyContext,
): Promise<string> {
  if (!ctx.hasProfile) {
    return 'Your energy picture needs a saved profile first. Fill the onboarding form in Setup, then ask again.'
  }
  if (ctx.methodologyError) {
    return `Dashboard rates could not be loaded. ${ctx.methodologyError}`
  }
  if (!ctx.bundle) {
    return 'Loading rates and appliance ratings… Ask again in a moment.'
  }

  const loaded = await loadReminderRecommendations(reminderInput(ctx))
  if (!loaded.ok) return loaded.message

  const reserve = reservePercent(ctx.profile)

  if (intent === 'reminder_days') {
    return formatReminderDaysReply(loaded.recommendations, loaded.eventType, reserve)
  }

  if (!loaded.recommendations.length) {
    return emptyStateMessage(loaded.eventType, reserve)
  }

  const content = buildIcsFile(loaded.recommendations, loaded.eventType)
  downloadIcsFile(
    `mypowerplant-${loaded.eventType.replace('_', '-')}-reminders.ics`,
    content,
  )
  return `Downloaded ${loaded.recommendations.length} reminder day${
    loaded.recommendations.length === 1 ? '' : 's'
  } to your calendar file — the same entries as on Reminders.`
}

import { emptyStateMessage } from '../reminderForecast'
