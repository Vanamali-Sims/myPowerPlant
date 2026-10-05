/**
 * Pulls explicit profile edits out of a chat sentence (Epic 6.5.1).
 */
import { batteryModels, energyProviders } from '../../data/profileOptions'
import type { ProfileData } from '../../types/profile'
import { normalise, wordsToDigits } from '../voice/extract'

function textOf(message: string): string {
  return wordsToDigits(normalise(message))
}

/**
 * parseProfilePatch
 * @param message - Raw chat sentence
 * @returns Fields to merge, or null when nothing looks like an edit
 */
export function parseProfilePatch(message: string): Partial<ProfileData> | null {
  const text = textOf(message)
  if (!text) return null
  if (looksLikeQuestion(text) && !looksLikeEditVerb(text)) return null

  const patch: Partial<ProfileData> = {}

  const postcode =
    text.match(/\b(?:post\s*code|postcode)\s*(?:is|to|=)?\s*(\d{4})\b/)?.[1] ??
    text.match(/\b(?:change|set|update)\s+(?:my\s+)?post\s*code\s+to\s+(\d{4})\b/)?.[1]
  if (postcode) patch.postcode = postcode

  const people =
    text.match(/\b(\d+)\s+(?:people|persons|person)\b/)?.[1] ??
    text.match(/\bpeople\s+(?:in\s+(?:the\s+)?house(?:hold)?\s+)?(?:is|are|to)\s+(\d+)\b/)?.[1]
  if (people) patch.people = people

  const rooms =
    text.match(/\b(?:change|set|update)\s+(?:my\s+)?rooms?\s+to\s+(\d+)\b/)?.[1] ??
    text.match(/\b(\d+)\s+rooms?\b/)?.[1] ??
    text.match(/\brooms?\s+(?:is|are|to)\s+(\d+)\b/)?.[1]
  if (rooms) patch.rooms = rooms

  const dishwasher =
    text.match(/\b(?:change|set|update)\s+(?:my\s+)?dishwasher\s+to\s+(\d+)\b/)?.[1] ??
    text.match(/\bdishwasher\s+(?:to\s+)?(\d+)\s+(?:times?|cycles?|loads?)(?:\s+(?:a|per)\s+week)?\b/)?.[1] ??
    text.match(/\b(\d+)\s+dishwasher\s+(?:cycles?|loads?)\b/)?.[1]
  if (dishwasher) patch.dishwasherCyclesPerWeek = dishwasher

  const washer =
    text.match(/\b(?:change|set|update)\s+(?:my\s+)?(?:washing\s+machine|washer)\s+to\s+(\d+)\b/)?.[1] ??
    text.match(/\b(?:washing\s+machine|washer)\s+(?:to\s+)?(\d+)\s+(?:times?|cycles?|loads?)(?:\s+(?:a|per)\s+week)?\b/)?.[1] ??
    text.match(/\b(\d+)\s+(?:washer|washing)\s+(?:cycles?|loads?)\b/)?.[1]
  if (washer) patch.washerCyclesPerWeek = washer

  const refrigerators =
    text.match(/\b(\d+)\s+fridges?\b/)?.[1] ??
    text.match(/\b(\d+)\s+refrigerators?\b/)?.[1]
  if (refrigerators) patch.refrigerators = refrigerators

  const bill =
    text.match(/\b(?:monthly\s+)?(?:electricity\s+)?bill\s*(?:is|to|=)?\s*\$?\s*(\d+(?:\.\d+)?)\b/)?.[1] ??
    text.match(/\b(?:change|set|update)\s+(?:my\s+)?bill\s+to\s+\$?\s*(\d+(?:\.\d+)?)\b/)?.[1]
  if (bill) patch.monthlyBill = bill

  const reserve = text.match(/\breserve\s*(?:is|to|=)?\s*(\d+)\s*(?:%|percent)\b/)?.[1]
  if (reserve) patch.reservePercent = reserve

  const batteryAge = text.match(/\bbattery\s+age\s*(?:is|to|=)?\s*(\d+)\b/)?.[1]
  if (batteryAge) patch.batteryAge = batteryAge

  const panelCount = text.match(/\b(\d+)\s+panels?\b/)?.[1]
  if (panelCount) patch.panelCount = panelCount

  for (const model of batteryModels) {
    const needle = normalise(model)
    if (needle.length > 4 && text.includes(needle)) {
      patch.batteryModel = model
      break
    }
  }

  for (const provider of energyProviders) {
    const needle = normalise(provider)
    if (needle.length > 3 && text.includes(needle)) {
      patch.provider = provider
      break
    }
  }

  if (/\b(no|without)\s+solar\b/.test(text) || /\bhas\s+no\s+solar\b/.test(text)) {
    patch.hasSolar = 'no'
  } else if (/\b(have|has)\s+solar\b/.test(text) || /\bwith\s+solar\b/.test(text)) {
    patch.hasSolar = 'yes'
  }

  return Object.keys(patch).length ? patch : null
}

function looksLikeQuestion(text: string): boolean {
  return (
    /^(what|which|who|where|when|how|show me|tell me)\b/.test(text) ||
    /\bwhat is my\b/.test(text) ||
    /\bwhat's my\b/.test(text)
  )
}

function looksLikeEditVerb(text: string): boolean {
  return /\b(change|set|update|make|correct|fix)\b/.test(text)
}
