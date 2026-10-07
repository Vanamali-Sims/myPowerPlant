/**
 * Unit tests for monthly history (US8.4 AC2, AC3, AC4).
 *
 * Only monthly records are stored, so these check that adding days by
 * month gives the same result however the uploads are split.
 */
import { describe, expect, it } from 'vitest'

import { emptyGoalsStore, type MonthRecord } from '../../types/goals'
import type { DayFigures } from './calculate'
import { addDays, mergeRanges } from './calendar'
import { parseGoalsStore } from './goalsStorage'
import { applyDays, historyRows, lastCountedDate, planMerge } from './history'

const NOW = '2026-10-08T00:00:00.000Z'

function day(date: string, discharge = 6, intake: number | null = 4): DayFigures {
  const energy = discharge + (intake ?? 0)
  return {
    date,
    intervals: 96,
    dischargeKwh: discharge,
    intakeKwh: intake,
    energyKwh: energy,
    savingsAud: energy * 0.3,
    carbonKg: energy * 0.77,
  }
}

function daysBetween(from: string, to: string, intake: number | null = 4): DayFigures[] {
  const out: DayFigures[] = []
  for (let date = from; date <= to; date = addDays(date, 1)) out.push(day(date, 6, intake))
  return out
}

function withoutTimestamps(months: MonthRecord[]) {
  return months.map((record) => ({ ...record, updatedOn: '' }))
}

function expectSameMonths(a: MonthRecord[], b: MonthRecord[]) {
  expect(a.map((record) => record.coveredRanges)).toEqual(b.map((record) => record.coveredRanges))
  expect(a.map((record) => record.daysCounted)).toEqual(b.map((record) => record.daysCounted))
  a.forEach((record, index) => {
    expect(record.savingsAud).toBeCloseTo(b[index].savingsAud, 9)
    expect(record.carbonKg).toBeCloseTo(b[index].carbonKg, 9)
    expect(record.dischargeKwh).toBeCloseTo(b[index].dischargeKwh, 9)
    expect(record.intakeKwh ?? 0).toBeCloseTo(b[index].intakeKwh ?? 0, 9)
  })
}

describe('mergeRanges', () => {
  it('joins touching and overlapping days into ranges', () => {
    expect(mergeRanges([['2026-09-01', '2026-09-10']], ['2026-09-11', '2026-09-13', '2026-09-12'])).toEqual([
      ['2026-09-01', '2026-09-13'],
    ])
    expect(mergeRanges([], ['2026-09-05', '2026-09-01'])).toEqual([
      ['2026-09-01', '2026-09-01'],
      ['2026-09-05', '2026-09-05'],
    ])
  })
})

describe('only new days are added (AC3)', () => {
  it('skips days already inside a counted range', () => {
    const months = applyDays([], daysBetween('2026-09-01', '2026-09-10'), 'tesla', NOW)
    const plan = planMerge(months, daysBetween('2026-09-05', '2026-09-15'))
    expect(plan.skippedDays).toEqual(daysBetween('2026-09-05', '2026-09-10').map((d) => d.date))
    expect(plan.newDays.map((d) => d.date)).toEqual(daysBetween('2026-09-11', '2026-09-15').map((d) => d.date))
  })

  it('accepts an older file that fills a gap', () => {
    let months = applyDays([], daysBetween('2026-09-01', '2026-09-05'), 'tesla', NOW)
    months = applyDays(months, daysBetween('2026-09-20', '2026-09-30'), 'tesla', NOW)
    expect(months[0].coveredRanges).toHaveLength(2)
    const plan = planMerge(months, daysBetween('2026-09-01', '2026-09-30'))
    expect(plan.newDays).toHaveLength(14)
    months = applyDays(months, plan.newDays, 'tesla', NOW)
    expect(months[0].coveredRanges).toEqual([['2026-09-01', '2026-09-30']])
    expect(months[0].daysCounted).toBe(30)
  })

  it('gives the same months for two split uploads as for one combined upload', () => {
    const combined = applyDays([], daysBetween('2026-08-20', '2026-10-05'), 'tesla', NOW)
    let split = applyDays([], daysBetween('2026-08-20', '2026-09-14'), 'tesla', NOW)
    const second = planMerge(split, daysBetween('2026-09-10', '2026-10-05'))
    split = applyDays(split, second.newDays, 'tesla', NOW)
    expect(second.skippedDays).toHaveLength(5)
    expectSameMonths(split, combined)
    expect(withoutTimestamps(split).map((record) => record.month)).toEqual(['2026-08', '2026-09', '2026-10'])
  })

  it('moves the last counted date forward', () => {
    let months = applyDays([], daysBetween('2026-09-01', '2026-09-10'), 'tesla', NOW)
    expect(lastCountedDate(months)).toBe('2026-09-10')
    months = applyDays(months, daysBetween('2026-09-11', '2026-10-02'), 'tesla', NOW)
    expect(lastCountedDate(months)).toBe('2026-10-02')
    expect(lastCountedDate([])).toBeNull()
  })
})

describe('monthly records (AC2, AC4)', () => {
  it('stores month totals, ranges, and source, and stays valid for storage', () => {
    const months = applyDays([], daysBetween('2026-09-01', '2026-09-12'), 'amber', NOW)
    expect(months).toHaveLength(1)
    expect(months[0]).toMatchObject({
      month: '2026-09',
      daysInMonth: 30,
      daysCounted: 12,
      coveredRanges: [['2026-09-01', '2026-09-12']],
      sourceId: 'amber',
      updatedOn: NOW,
    })
    expect(months[0].savingsAud).toBeCloseTo(12 * 10 * 0.3, 9)
    expect(parseGoalsStore({ ...emptyGoalsStore(), months })).not.toBeNull()
  })

  it('marks a month partial until a later upload completes it', () => {
    let months = applyDays([], daysBetween('2026-09-01', '2026-09-12'), 'tesla', NOW)
    expect(historyRows(months)[0]).toMatchObject({ partial: true, daysCounted: 12, daysInMonth: 30 })
    months = applyDays(months, planMerge(months, daysBetween('2026-09-01', '2026-09-30')).newDays, 'tesla', NOW)
    expect(historyRows(months)[0]).toMatchObject({ partial: false, daysCounted: 30 })
  })

  it('keeps intake missing until a file with intake adds to the month', () => {
    let months = applyDays([], daysBetween('2026-09-01', '2026-09-05', null), 'tesla', NOW)
    expect(months[0].intakeKwh).toBeNull()
    months = applyDays(months, daysBetween('2026-09-06', '2026-09-07', 4), 'tesla', NOW)
    expect(months[0].intakeKwh).toBe(8)
  })
})
