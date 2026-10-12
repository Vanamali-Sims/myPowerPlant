/**
 * @vitest-environment jsdom
 *
 * Unit tests for goals storage (US8.1 AC5, US8.4 AC2 groundwork).
 *
 * Goals live under their own key, are written in one setItem, and anything
 * missing, corrupt, oversized, or from another version loads as empty.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  GOALS_MAX_JSON_BYTES,
  GOALS_STORAGE_KEY,
  MAX_STORED_MONTHS,
} from '../../../constants/goals'
import { PROFILE_STORAGE_KEY } from '../../../constants/storage'
import { emptyGoalsStore, type GoalsStore, type MonthRecord } from '../../../types/goals'
import { countRangeDays, daysBetweenInclusive, daysInMonth, isCalendarDate } from '../calendar'
import { loadGoals, parseGoalsStore, saveGoals } from '../goalsStorage'

const SET_ON = '2026-10-01T00:00:00.000Z'

function month(overrides: Partial<MonthRecord> = {}): MonthRecord {
  return {
    month: '2026-09',
    daysInMonth: 30,
    daysCounted: 18,
    coveredRanges: [['2026-09-01', '2026-09-18']],
    savingsAud: 12.5,
    carbonKg: 30.1,
    dischargeKwh: 20,
    intakeKwh: 19.1,
    sourceId: 'generic',
    updatedOn: SET_ON,
    ...overrides,
  }
}

function storeWith(overrides: Partial<GoalsStore> = {}): GoalsStore {
  return {
    ...emptyGoalsStore(),
    goals: {
      savings: { target: 300, setOn: SET_ON },
      carbon: { target: 500, setOn: SET_ON },
    },
    ...overrides,
  }
}

const BASELINE = {
  month: '2026-09',
  days: 30,
  monthly: { savings: 30, carbon: 20 },
  battery: { model: 'Tesla Powerwall 2', units: 1 },
  ratePerKwh: null,
  setOn: SET_ON,
}

function writeRaw(value: unknown) {
  localStorage.setItem(GOALS_STORAGE_KEY, typeof value === 'string' ? value : JSON.stringify(value))
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('calendar helpers', () => {
  it('knows month lengths, including leap years', () => {
    expect(daysInMonth('2026-02')).toBe(28)
    expect(daysInMonth('2028-02')).toBe(29)
    expect(daysInMonth('2026-09')).toBe(30)
    expect(daysInMonth('2026-13')).toBe(0)
    expect(daysInMonth('nope')).toBe(0)
  })

  it('rejects impossible dates', () => {
    expect(isCalendarDate('2026-02-28')).toBe(true)
    expect(isCalendarDate('2026-02-30')).toBe(false)
    expect(isCalendarDate('2026-9-1')).toBe(false)
  })

  it('counts calendar days across a daylight saving change', () => {
    // Melbourne moves its clocks on 2026-10-04; calendar days are unaffected.
    expect(daysBetweenInclusive('2026-10-01', '2026-10-31')).toBe(31)
    expect(countRangeDays([['2026-09-01', '2026-09-18'], ['2026-09-20', '2026-09-30']])).toBe(29)
  })
})

describe('loadGoals', () => {
  it('returns an empty store when nothing is saved', () => {
    expect(loadGoals()).toEqual(emptyGoalsStore())
  })

  it('treats corrupt JSON as empty without throwing', () => {
    writeRaw('{not json')
    expect(loadGoals()).toEqual(emptyGoalsStore())
  })

  it('treats an unknown version as empty', () => {
    writeRaw({ ...storeWith(), version: 3 })
    expect(loadGoals()).toEqual(emptyGoalsStore())
  })

  it('moves a v1 store up to v2 with no baseline, keeping goals and history', () => {
    const { goals, completedGoals } = storeWith()
    writeRaw({ version: 1, goals, completedGoals, months: [month()] })
    expect(loadGoals()).toEqual(storeWith({ months: [month()], baseline: null }))
  })

  it('round-trips a baseline, with and without a rate', () => {
    for (const ratePerKwh of [null, 0.32]) {
      const store = storeWith({ baseline: { ...BASELINE, ratePerKwh } })
      expect(saveGoals(store).ok).toBe(true)
      expect(loadGoals()).toEqual(store)
    }
  })

  it.each([
    ['a baseline month that is not real', { ...BASELINE, month: '2026-13' }],
    ['more baseline days than the month has', { ...BASELINE, days: 31 }],
    ['a negative baseline figure', { ...BASELINE, monthly: { savings: -1, carbon: 20 } }],
    ['a battery model not in the list', { ...BASELINE, battery: { model: 'Made up', units: 1 } }],
    ['too many battery units', { ...BASELINE, battery: { model: 'Not sure', units: 99 } }],
    ['a rate far above any plan', { ...BASELINE, ratePerKwh: 5 }],
  ])('treats %s as corrupt', (_label, bad) => {
    writeRaw(storeWith({ baseline: bad }))
    expect(loadGoals()).toEqual(emptyGoalsStore())
  })

  it('treats an oversized blob as empty', () => {
    writeRaw(`"${'x'.repeat(GOALS_MAX_JSON_BYTES)}"`)
    expect(loadGoals()).toEqual(emptyGoalsStore())
  })

  it('treats a negative or zero goal as corrupt', () => {
    writeRaw(storeWith({ goals: { savings: { target: -5, setOn: SET_ON }, carbon: null } }))
    expect(loadGoals()).toEqual(emptyGoalsStore())
    writeRaw(storeWith({ goals: { savings: { target: 0, setOn: SET_ON }, carbon: null } }))
    expect(loadGoals()).toEqual(emptyGoalsStore())
  })

  it('round-trips goals and monthly history', () => {
    const store = storeWith({ months: [month()] })
    expect(saveGoals(store).ok).toBe(true)
    expect(loadGoals()).toEqual(store)
  })

  it.each([
    ['a daysCounted that does not match its ranges', month({ daysCounted: 17 })],
    ['a range outside its month', month({ coveredRanges: [['2026-08-31', '2026-09-18']], daysCounted: 19 })],
    [
      'touching ranges that should have been merged',
      month({ coveredRanges: [['2026-09-01', '2026-09-10'], ['2026-09-11', '2026-09-18']] }),
    ],
    [
      'overlapping ranges',
      month({ coveredRanges: [['2026-09-01', '2026-09-10'], ['2026-09-05', '2026-09-18']], daysCounted: 24 }),
    ],
    ['the wrong number of days in the month', month({ daysInMonth: 31 })],
    ['a negative figure', month({ savingsAud: -1 })],
    ['an impossible date', month({ coveredRanges: [['2026-09-01', '2026-09-31']], daysCounted: 31 })],
  ])('treats %s as corrupt', (_label, bad) => {
    writeRaw(storeWith({ months: [bad] }))
    expect(loadGoals()).toEqual(emptyGoalsStore())
  })

  it('keeps a missing intake column as null, distinct from zero', () => {
    const store = storeWith({ months: [month({ intakeKwh: null }), month({ month: '2026-10', daysInMonth: 31, coveredRanges: [['2026-10-01', '2026-10-02']], daysCounted: 2, intakeKwh: 0 })] })
    expect(saveGoals(store).ok).toBe(true)
    const loaded = loadGoals()
    expect(loaded.months[0].intakeKwh).toBeNull()
    expect(loaded.months[1].intakeKwh).toBe(0)
  })

  it('rejects months that are out of order', () => {
    const later = month({ month: '2026-10', daysInMonth: 31, coveredRanges: [['2026-10-01', '2026-10-02']], daysCounted: 2 })
    writeRaw(storeWith({ months: [later, month()] }))
    expect(loadGoals()).toEqual(emptyGoalsStore())
  })
})

describe('saveGoals', () => {
  it('writes once, under the goals key only, and leaves the profile alone', () => {
    localStorage.setItem(PROFILE_STORAGE_KEY, '{"postcode":"3101"}')
    const spy = vi.spyOn(Storage.prototype, 'setItem')
    const result = saveGoals(storeWith())
    expect(result.ok).toBe(true)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0]).toBe(GOALS_STORAGE_KEY)
    expect(localStorage.getItem(PROFILE_STORAGE_KEY)).toBe('{"postcode":"3101"}')
    expect(JSON.parse(localStorage.getItem(GOALS_STORAGE_KEY) ?? '{}').version).toBe(2)
  })

  it('reports a failed write and leaves what was saved before', () => {
    expect(saveGoals(storeWith()).ok).toBe(true)
    const before = localStorage.getItem(GOALS_STORAGE_KEY)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    const result = saveGoals(storeWith({ goals: { savings: { target: 900, setOn: SET_ON }, carbon: { target: 900, setOn: SET_ON } } }))
    expect(result).toEqual({ ok: false, reason: 'write_failed' })
    expect(localStorage.getItem(GOALS_STORAGE_KEY)).toBe(before)
  })

  it('refuses to store more months than the cap', () => {
    const months: MonthRecord[] = []
    for (let i = 0; i <= MAX_STORED_MONTHS; i += 1) {
      const year = 2020 + Math.floor(i / 12)
      const m = String((i % 12) + 1).padStart(2, '0')
      const label = `${year}-${m}`
      months.push(month({ month: label, daysInMonth: daysInMonth(label), coveredRanges: [[`${label}-01`, `${label}-01`]], daysCounted: 1 }))
    }
    expect(saveGoals(storeWith({ months }))).toEqual({ ok: false, reason: 'storage_full' })
    expect(localStorage.getItem(GOALS_STORAGE_KEY)).toBeNull()
  })

  it('does not write a store the loader would reject', () => {
    const result = saveGoals(storeWith({ months: [month({ daysCounted: 3 })] }))
    expect(result).toEqual({ ok: false, reason: 'write_failed' })
    expect(localStorage.getItem(GOALS_STORAGE_KEY)).toBeNull()
  })

  it('parses the same object the loader would', () => {
    expect(parseGoalsStore(JSON.parse(JSON.stringify(storeWith())))).toEqual(storeWith())
    expect(parseGoalsStore(null)).toBeNull()
  })
})
