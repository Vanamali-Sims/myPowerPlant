/**
 * localStorage persistence for the household profile.
 *
 * The device copy is the only persistence. Nothing is written to the backend.
 */
import { PROFILE_MAX_JSON_BYTES, PROFILE_STORAGE_KEY } from '../constants/storage'
import {
  DEFAULT_BATTERY_UNITS,
  FIELD_BOUNDS,
  clampNumber,
} from '../constants/validation'
import { emptyProfile, type FieldSource, type ProfileData } from '../types/profile'

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g

const PROFILE_KEYS = Object.keys(emptyProfile()) as (keyof ProfileData)[]

const COUNT_FIELDS = [
  ['people', FIELD_BOUNDS.people],
  ['rooms', FIELD_BOUNDS.rooms],
  ['refrigerators', FIELD_BOUNDS.refrigerators],
  ['tvHoursPerWeek', FIELD_BOUNDS.tvHoursPerWeek],
  ['washerCyclesPerWeek', FIELD_BOUNDS.washerCyclesPerWeek],
  ['dishwasherCyclesPerWeek', FIELD_BOUNDS.dishwasherCyclesPerWeek],
  ['dryerWeek', FIELD_BOUNDS.dryerWeek],
  ['dryerWeekend', FIELD_BOUNDS.dryerWeekend],
  ['airconHoursPerWeek', FIELD_BOUNDS.airconHoursPerWeek],
  ['monthlyBill', FIELD_BOUNDS.monthlyBill],
  ['monthlyKwh', FIELD_BOUNDS.monthlyKwh],
  ['panelCount', FIELD_BOUNDS.panelCount],
  ['panelWatts', FIELD_BOUNDS.panelWatts],
  ['reservePercent', FIELD_BOUNDS.reservePercent],
  ['batteryAge', FIELD_BOUNDS.batteryAge],
] as const

/**
 * stripControls
 * @param value - Any stored string
 * @returns The same string with C0 controls and DEL removed
 *
 * Null bytes and other controls are never meaningful in a household answer
 * and can truncate logs or C-based consumers if the value is forwarded later.
 */
function stripControls(value: string): string {
  return value.replace(CONTROL_CHARS, '')
}

/**
 * sanitiseCountString
 * @param raw - Stored field, possibly not a string
 * @param bounds - Inclusive min/max from FIELD_BOUNDS
 * @returns Empty, the original in-range text (so "6+" is kept), or a clamped digit string
 */
function sanitiseCountString(raw: unknown, bounds: { min: number; max: number }): string {
  if (typeof raw !== 'string') return ''
  const cleaned = stripControls(raw).trim()
  if (!cleaned) return ''
  const n = Number.parseInt(cleaned.replace('+', ''), 10)
  if (!Number.isFinite(n)) return ''
  if (n >= bounds.min && n <= bounds.max) return cleaned
  return String(clampNumber(n, bounds.min, bounds.max))
}

function sanitiseBatteryUnits(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_BATTERY_UNITS
  return clampNumber(n, FIELD_BOUNDS.batteryUnits.min, FIELD_BOUNDS.batteryUnits.max)
}

function sanitiseFieldSources(raw: unknown): ProfileData['fieldSources'] {
  if (!raw || typeof raw !== 'object') return {}
  const input = raw as Record<string, unknown>
  const out: ProfileData['fieldSources'] = {}
  for (const key of PROFILE_KEYS) {
    const value = input[key]
    if (value === 'user' || value === 'baseline') out[key] = value as FieldSource
  }
  return out
}

function sanitiseLastUpdated(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const cleaned = stripControls(raw).trim()
  if (!cleaned || cleaned.length > 40) return null
  const time = Date.parse(cleaned)
  return Number.isFinite(time) ? cleaned : null
}

/**
 * sanitiseProfile
 * @param parsed - JSON from localStorage, treated as untrusted
 * @returns A ProfileData object with known keys only, counts in range, no control characters
 */
function sanitiseProfile(parsed: Partial<ProfileData>): ProfileData {
  const blank = emptyProfile()
  const next: ProfileData = { ...blank }

  for (const key of PROFILE_KEYS) {
    if (key === 'fieldSources' || key === 'lastUpdated' || key === 'batteryUnits') continue
    const value = parsed[key]
    if (typeof value === 'string') {
      ;(next as Record<string, unknown>)[key] = stripControls(value)
    }
  }

  for (const [field, bounds] of COUNT_FIELDS) {
    next[field] = sanitiseCountString(parsed[field], bounds)
  }

  next.batteryUnits = sanitiseBatteryUnits(parsed.batteryUnits)
  next.fieldSources = sanitiseFieldSources(parsed.fieldSources)
  next.lastUpdated = sanitiseLastUpdated(parsed.lastUpdated)
  return next
}

/**
 * loadProfile
 * @returns Saved profile, or an empty profile when nothing is stored
 *
 * Merges stored JSON onto emptyProfile so older saves still get new fields.
 * Corrupt JSON, oversized blobs, and out-of-range counts are sanitised rather
 * than trusted as-is.
 */
export function loadProfile(): ProfileData {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY)
    if (!raw) return emptyProfile()
    if (raw.length > PROFILE_MAX_JSON_BYTES) return emptyProfile()
    const parsed = JSON.parse(raw) as Partial<ProfileData>
    return sanitiseProfile(parsed)
  } catch {
    return emptyProfile()
  }
}

/**
 * saveProfile
 * @param profile - Household answers to persist
 * @returns The same profile with lastUpdated set to now
 *
 * Stamps lastUpdated so the dashboard and profile screen can show when the
 * answers were last confirmed on this device. Sanitises before write so a
 * tampered in-memory object cannot persist null bytes or unbounded JSON.
 */
export function saveProfile(profile: ProfileData): ProfileData {
  const next = sanitiseProfile({
    ...profile,
    lastUpdated: new Date().toISOString(),
  })
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next))
  return next
}

/**
 * clearStoredProfile
 * @returns void
 *
 * Removes the saved profile key. There is no server row to keep in sync.
 */
export function clearStoredProfile(): void {
  localStorage.removeItem(PROFILE_STORAGE_KEY)
}
