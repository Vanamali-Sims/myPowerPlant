/**
 * Unit tests for revised months and missing days (US8.7 AC3, AC5).
 */
import { describe, expect, it } from 'vitest'

import { REVISION_TOLERANCE_KWH } from '../../../constants/goals'
import { emptyGoalsStore } from '../../../types/goals'
import type { DayFigures } from '../calculate'
import { addDays } from '../calendar'
import { parseGoalsStore } from '../goalsStorage'
import { applyDays, planMerge } from '../history'
import { applyReplacement, checkRevisions, missingDays } from '../revisions'

const NOW = '2026-10-08T00:00:00.000Z'

function day(date: string, discharge = 6, intake: number | null = 4, rate = 0.3): DayFigures {
  const energy = discharge + (intake ?? 0)
  return {
    date,
    intervals: 96,
    dischargeKwh: discharge,
    intakeKwh: intake,
    energyKwh: energy,
    savingsAud: energy * rate,
    carbonKg: energy * 0.77,
  }
}

function days(from: string, to: string, discharge = 6, intake: number | null = 4, rate = 0.3) {
  const out: DayFigures[] = []
  for (let date = from; date <= to; date = addDays(date, 1)) out.push(day(date, discharge, intake, rate))
  return out
}

const september = applyDays([], days('2026-09-01', '2026-09-20'), 'tesla', NOW)

describe('revised months (AC5)', () => {
  it('flags a month when the file has every counted day and the kWh differ', () => {
    const check = checkRevisions(september, days('2026-09-01', '2026-09-30', 7))
    expect(check.revised).toHaveLength(1)
    const [revision] = check.revised
    expect(revision.month).toBe('2026-09')
    expect(revision.saved.dischargeKwh).toBeCloseTo(120, 9)
    expect(revision.file.dischargeKwh).toBeCloseTo(140, 9)
    expect(revision.file.daysCounted).toBe(20)
    expect(revision.replacement).toHaveLength(30)
  })

  it('does not flag differences within the tolerance', () => {
    const tiny = REVISION_TOLERANCE_KWH / 40
    expect(checkRevisions(september, days('2026-09-01', '2026-09-20', 6 + tiny)).revised).toEqual([])
  })

  it('compares energy, not dollars, so a new rate is never a revision', () => {
    expect(checkRevisions(september, days('2026-09-01', '2026-09-20', 6, 4, 0.5)).revised).toEqual([])
  })

  it('treats a missing intake column as different from saved intake', () => {
    expect(checkRevisions(september, days('2026-09-01', '2026-09-20', 6, null)).revised).toHaveLength(1)
  })

  it('cannot check a month the file only partly covers, and says so', () => {
    const check = checkRevisions(september, days('2026-09-10', '2026-09-30', 9))
    expect(check.revised).toEqual([])
    expect(check.unchecked).toEqual(['2026-09'])
  })

  it('replaces a revised month from the file, marks it revised, and adds other new days', () => {
    const file = days('2026-09-01', '2026-10-03', 7)
    const { revised } = checkRevisions(september, file)
    const plan = planMerge(september, file)
    const months = applyReplacement(september, revised, plan.newDays, 'amber', NOW, '2026-10-08')
    expect(months.map((record) => record.month)).toEqual(['2026-09', '2026-10'])
    expect(months[0]).toMatchObject({
      daysCounted: 30,
      coveredRanges: [['2026-09-01', '2026-09-30']],
      revisedOn: '2026-10-08',
      sourceId: 'amber',
    })
    expect(months[0].dischargeKwh).toBeCloseTo(210, 9)
    expect(months[1]).toMatchObject({ daysCounted: 3 })
    expect(months[1].revisedOn).toBeUndefined()
    expect(parseGoalsStore({ ...emptyGoalsStore(), months })).not.toBeNull()
  })

  it('keeps a revised mark when a later upload adds to the month', () => {
    const replaced = applyReplacement(september, checkRevisions(september, days('2026-09-01', '2026-09-20', 7)).revised, [], 'tesla', NOW, '2026-10-08')
    const later = applyDays(replaced, days('2026-09-21', '2026-09-25'), 'tesla', NOW)
    expect(later[0].revisedOn).toBe('2026-10-08')
  })
})

describe('missing days (AC3)', () => {
  it('names the gap between the last counted date and a later file', () => {
    expect(missingDays(september, days('2026-09-25', '2026-09-30'))).toEqual([['2026-09-21', '2026-09-24']])
  })

  it('names gaps inside the file and skips days already counted', () => {
    const file = [...days('2026-09-18', '2026-09-22'), ...days('2026-09-26', '2026-09-30')]
    expect(missingDays(september, file)).toEqual([['2026-09-23', '2026-09-25']])
  })

  it('finds nothing missing for a file that continues straight on', () => {
    expect(missingDays(september, days('2026-09-21', '2026-09-30'))).toEqual([])
  })

  it('only looks inside an older file that fills a gap', () => {
    const months = applyDays(september, days('2026-11-01', '2026-11-05'), 'tesla', NOW)
    expect(missingDays(months, days('2026-10-01', '2026-10-10'))).toEqual([])
  })
})
