/**
 * localStorage persistence for goals, monthly history, and completed goals.
 *
 * The device copy is the only persistence. Nothing is sent to the backend,
 * and the profile key is never read or written here.
 */
import {
  GOALS_MAX_JSON_BYTES,
  GOALS_STORAGE_KEY,
  GOALS_STORE_VERSION,
  MAX_STORED_MONTHS,
} from '../../constants/goals'
import {
  GOAL_KINDS,
  emptyGoalsStore,
  type CompletedGoal,
  type DateRange,
  type GoalEntry,
  type GoalKind,
  type GoalsStore,
  type MonthRecord,
} from '../../types/goals'
import { countRangeDays, daysInMonth, isCalendarDate, monthOf } from './calendar'

const MAX_COMPLETED_GOALS = 500
const MAX_TEXT_LENGTH = 40
const SOURCE_ID_PATTERN = /^[a-z0-9-]{1,40}$/

export type SaveGoalsResult =
  | { ok: true; store: GoalsStore }
  | { ok: false; reason: 'storage_full' | 'write_failed' }

/** Thrown inside load when a stored value fails a check; the caller returns an empty store. */
class InvalidStore extends Error {}

function fail(): never {
  throw new InvalidStore()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readTimestamp(raw: unknown): string {
  if (typeof raw !== 'string' || !raw || raw.length > MAX_TEXT_LENGTH) fail()
  if (!Number.isFinite(Date.parse(raw))) fail()
  return raw
}

function readAmount(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) fail()
  return raw
}

function readGoal(raw: unknown): GoalEntry | null {
  if (raw === null || raw === undefined) return null
  if (!isRecord(raw)) fail()
  const target = readAmount(raw.target)
  if (target <= 0) fail()
  return { target, setOn: readTimestamp(raw.setOn) }
}

function readKind(raw: unknown): GoalKind {
  if (!GOAL_KINDS.includes(raw as GoalKind)) fail()
  return raw as GoalKind
}

function readCompleted(raw: unknown): CompletedGoal {
  if (!isRecord(raw)) fail()
  const target = readAmount(raw.target)
  if (target <= 0) fail()
  const entry: CompletedGoal = {
    kind: readKind(raw.kind),
    target,
    setOn: readTimestamp(raw.setOn),
    reachedOn: readTimestamp(raw.reachedOn),
    totalAtReach: readAmount(raw.totalAtReach),
  }
  if (raw.reachedByEdit === true) entry.reachedByEdit = true
  return entry
}

/**
 * readRanges
 * @param raw - Stored ranges for one month
 * @param month - The month they must sit inside
 * @returns Ranges that are real dates, inside the month, sorted, and not touching
 *
 * Touching or overlapping ranges would mean a day could be counted twice, so
 * they are rejected rather than repaired.
 */
function readRanges(raw: unknown, month: string): DateRange[] {
  if (!Array.isArray(raw) || raw.length === 0) fail()
  const ranges: DateRange[] = []
  let previousEnd = ''
  for (const item of raw) {
    if (!Array.isArray(item) || item.length !== 2) fail()
    const [start, end] = item
    if (typeof start !== 'string' || typeof end !== 'string') fail()
    if (!isCalendarDate(start) || !isCalendarDate(end)) fail()
    if (monthOf(start) !== month || monthOf(end) !== month) fail()
    if (start > end) fail()
    if (previousEnd && countRangeDays([[previousEnd, start]]) <= 2) fail()
    ranges.push([start, end])
    previousEnd = end
  }
  return ranges
}

function readMonth(raw: unknown): MonthRecord {
  if (!isRecord(raw)) fail()
  const month = typeof raw.month === 'string' ? raw.month : ''
  const calendarDays = daysInMonth(month)
  if (!calendarDays || raw.daysInMonth !== calendarDays) fail()
  const coveredRanges = readRanges(raw.coveredRanges, month)
  if (raw.daysCounted !== countRangeDays(coveredRanges)) fail()
  if (typeof raw.sourceId !== 'string' || !SOURCE_ID_PATTERN.test(raw.sourceId)) fail()
  const record: MonthRecord = {
    month,
    daysInMonth: calendarDays,
    daysCounted: raw.daysCounted as number,
    coveredRanges,
    savingsAud: readAmount(raw.savingsAud),
    carbonKg: readAmount(raw.carbonKg),
    dischargeKwh: readAmount(raw.dischargeKwh),
    intakeKwh: raw.intakeKwh === null ? null : readAmount(raw.intakeKwh),
    sourceId: raw.sourceId,
    updatedOn: readTimestamp(raw.updatedOn),
  }
  if (raw.revisedOn !== undefined) record.revisedOn = readTimestamp(raw.revisedOn)
  return record
}

function readMonths(raw: unknown): MonthRecord[] {
  if (!Array.isArray(raw) || raw.length > MAX_STORED_MONTHS) fail()
  const months = raw.map(readMonth)
  for (let i = 1; i < months.length; i += 1) {
    if (months[i - 1].month >= months[i].month) fail()
  }
  return months
}

/**
 * parseGoalsStore
 * @param parsed - JSON from localStorage, treated as untrusted
 * @returns A clean store, or null when any part fails its check
 *
 * One bad month would make every total wrong, so a store that fails any check
 * is treated as empty rather than partly kept.
 */
export function parseGoalsStore(parsed: unknown): GoalsStore | null {
  try {
    if (!isRecord(parsed) || parsed.version !== GOALS_STORE_VERSION) fail()
    if (!isRecord(parsed.goals)) fail()
    if (!Array.isArray(parsed.completedGoals)) fail()
    if (parsed.completedGoals.length > MAX_COMPLETED_GOALS) fail()
    return {
      version: GOALS_STORE_VERSION,
      goals: {
        savings: readGoal(parsed.goals.savings),
        carbon: readGoal(parsed.goals.carbon),
      },
      completedGoals: parsed.completedGoals.map(readCompleted),
      months: readMonths(parsed.months),
    }
  } catch {
    return null
  }
}

/**
 * loadGoals
 * @returns Saved goals and history, or an empty store
 *
 * Missing, corrupt, oversized, or unknown-version data is treated as empty
 * and never throws, so the Goals tab always opens.
 */
export function loadGoals(): GoalsStore {
  try {
    const raw = localStorage.getItem(GOALS_STORAGE_KEY)
    if (!raw || raw.length > GOALS_MAX_JSON_BYTES) return emptyGoalsStore()
    return parseGoalsStore(JSON.parse(raw)) ?? emptyGoalsStore()
  } catch {
    return emptyGoalsStore()
  }
}

/**
 * saveGoals
 * @param store - The whole goals object to persist
 * @returns ok with the saved store, or the reason nothing was written
 *
 * Writes everything in one setItem so goals and history can never be half
 * saved. A store the loader would reject is not written at all.
 */
export function saveGoals(store: GoalsStore): SaveGoalsResult {
  if (store.months.length > MAX_STORED_MONTHS) return { ok: false, reason: 'storage_full' }
  const json = JSON.stringify(store)
  if (json.length > GOALS_MAX_JSON_BYTES) return { ok: false, reason: 'storage_full' }
  const clean = parseGoalsStore(JSON.parse(json))
  if (!clean) return { ok: false, reason: 'write_failed' }
  try {
    localStorage.setItem(GOALS_STORAGE_KEY, json)
    return { ok: true, store: clean }
  } catch {
    return { ok: false, reason: 'write_failed' }
  }
}
