import { describe, expect, it } from 'vitest'
import { emptyGoalsStore, type MonthRecord } from '../types/goals'
import { formatDateRange, formatShortDay, lastUpload, nextDischargeDay } from './improveDashboard'
import type { ReminderRecommendation } from './reminderForecast'

function record(month: string, ranges: [string, string][], updatedOn: string): MonthRecord {
  return {
    month,
    daysInMonth: 30,
    daysCounted: 10,
    coveredRanges: ranges,
    savingsAud: 1,
    carbonKg: 1,
    dischargeKwh: 1,
    intakeKwh: null,
    sourceId: 'tesla',
    updatedOn,
  }
}

function day(date: string): ReminderRecommendation {
  return { date, dayLabel: date, forecastKwh: 13, typicalKwh: 10, reason: '' }
}

describe('improve dashboard figures', () => {
  it('formats days and ranges', () => {
    expect(formatShortDay('2026-10-10')).toBe('Sat 10 Oct')
    expect(formatDateRange('2026-09-01', '2026-09-28')).toBe('1 Sep – 28 Sep')
    expect(formatDateRange('2025-12-20', '2026-01-10')).toBe('20 Dec 2025 – 10 Jan 2026')
    expect(formatDateRange('2026-09-05', '2026-09-05')).toBe('5 Sep')
  })

  it('picks the next discharge day from today on, never one already past', () => {
    const days = [day('2026-10-10'), day('2026-10-14'), day('2026-10-16')]
    expect(nextDischargeDay(days, '2026-10-11')?.date).toBe('2026-10-14')
    expect(nextDischargeDay(days, '2026-10-14')?.date).toBe('2026-10-14')
    expect(nextDischargeDay(days, '2026-10-17')).toBeNull()
  })

  it('takes the months from the latest upload, across month boundaries', () => {
    const store = {
      ...emptyGoalsStore(),
      months: [
        record('2026-07', [['2026-07-01', '2026-07-31']], '2026-08-03T00:00:00.000Z'),
        record('2026-08', [['2026-08-20', '2026-08-31']], '2026-09-04T00:00:00.000Z'),
        record('2026-09', [['2026-09-01', '2026-09-03']], '2026-09-04T00:00:00.000Z'),
      ],
    }
    expect(lastUpload(store)).toEqual({ kind: 'months', start: '2026-08-20', end: '2026-09-03', uploadedOn: '2026-09-04' })
  })

  it('falls back to the goal baseline file, then to nothing', () => {
    expect(lastUpload(emptyGoalsStore())).toBeNull()
    const store = {
      ...emptyGoalsStore(),
      baseline: {
        month: '2026-09',
        days: 30,
        monthly: { savings: 50, carbon: 80 },
        battery: { model: 'Tesla Powerwall 2', units: 1 },
        ratePerKwh: null,
        setOn: '2026-10-05T00:00:00.000Z',
      },
    }
    expect(lastUpload(store)).toEqual({ kind: 'baseline', month: '2026-09', uploadedOn: '2026-10-05' })
  })
})
