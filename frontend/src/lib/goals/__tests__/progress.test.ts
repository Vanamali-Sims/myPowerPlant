/**
 * Unit tests for progress over time (US8.5 AC1, AC3, AC4).
 */
import { describe, expect, it } from 'vitest'

import type { MonthRecord } from '../../../types/goals'
import {
  compareWithPreviousMonth,
  estimateFinish,
  fruitCount,
  progressRate,
  stageForStep,
  stageNumber,
  stageStarts,
  treeStep,
} from '../progress'

function month(label: string, savings: number, daysCounted?: number): MonthRecord {
  const [year, index] = label.split('-').map(Number)
  const daysInMonth = new Date(Date.UTC(year, index, 0)).getUTCDate()
  const counted = daysCounted ?? daysInMonth
  return {
    month: label,
    daysInMonth,
    daysCounted: counted,
    coveredRanges: [[`${label}-01`, `${label}-${String(counted).padStart(2, '0')}`]],
    savingsAud: savings,
    carbonKg: savings * 2,
    dischargeKwh: savings,
    intakeKwh: 0,
    sourceId: 'tesla',
    updatedOn: '2026-10-08T00:00:00.000Z',
  }
}

describe('tree growth every 5 percent (AC1)', () => {
  it.each([
    [0, 0],
    [4.99, 0],
    [5, 1],
    [9.99, 1],
    [10, 2],
    [95, 19],
    [99.99, 19],
    [100, 20],
    [130, 20],
  ])('carbon %s percent is step %s', (percent, step) => {
    expect(treeStep(percent)).toBe(step)
  })

  it('treats negative or missing progress as the seed', () => {
    expect(treeStep(-3)).toBe(0)
    expect(treeStep(Number.NaN)).toBe(0)
  })

  it.each([
    [0, 'seed', 1],
    [3, 'seed', 1],
    [4, 'sprout', 2],
    [7, 'sprout', 2],
    [8, 'sapling', 3],
    [11, 'sapling', 3],
    [12, 'young tree', 4],
    [19, 'young tree', 4],
    [20, 'harvest', 5],
  ])('step %s is the %s stage, stage %s of 5', (step, stage, number) => {
    expect(stageForStep(step)).toBe(stage)
    expect(stageNumber(step)).toBe(number)
  })

  it('starts the stages at 0, 20, 40, 60, and 100 percent of the carbon goal', () => {
    expect(stageStarts().map((stage) => stage.percent)).toEqual([0, 20, 40, 60, 100])
  })


  it('adds one fruit per 5 percent of savings, up to 20', () => {
    expect(fruitCount(0)).toBe(0)
    expect(fruitCount(4.99)).toBe(0)
    expect(fruitCount(25)).toBe(5)
    expect(fruitCount(150)).toBe(20)
  })
})

describe('rate and comparison (AC3)', () => {
  it('averages the percent of the goal gained per complete month', () => {
    const months = [month('2026-07', 30), month('2026-08', 60), month('2026-09', 10, 12)]
    expect(progressRate(months, 'savings', 300)).toBeCloseTo(15, 10)
    expect(progressRate([month('2026-09', 10, 12)], 'savings', 300)).toBeNull()
  })

  it('needs two months before comparing', () => {
    expect(compareWithPreviousMonth([month('2026-09', 30)], 'savings')).toEqual({
      kind: 'not_enough',
      months: 1,
    })
  })

  it('compares by average per day so a partial month is fair', () => {
    const result = compareWithPreviousMonth([month('2026-08', 31), month('2026-09', 15, 15)], 'savings')
    expect(result).toEqual({
      kind: 'compared',
      direction: 'similar',
      change: 0,
      month: '2026-09',
      previousMonth: '2026-08',
    })
  })

  it('says higher or lower outside the similar band', () => {
    const higher = compareWithPreviousMonth([month('2026-08', 31), month('2026-09', 36)], 'savings')
    expect(higher.kind === 'compared' && higher.direction).toBe('higher')
    const lower = compareWithPreviousMonth([month('2026-08', 31), month('2026-09', 20)], 'carbon')
    expect(lower.kind === 'compared' && lower.direction).toBe('lower')
  })
})

describe('estimated finish (AC4)', () => {
  it('estimates the month from the last complete months', () => {
    const months = [month('2026-07', 30), month('2026-08', 30), month('2026-09', 30)]
    expect(estimateFinish(months, 'savings', 300)).toEqual({ kind: 'estimate', month: '2027-04', monthsUsed: 3 })
  })

  it('is hidden with too little history, no progress, a reached goal, or beyond five years', () => {
    expect(estimateFinish([month('2026-09', 30)], 'savings', 300)).toEqual({
      kind: 'hidden',
      reason: 'too_little_history',
    })
    expect(estimateFinish([month('2026-08', 0), month('2026-09', 0)], 'savings', 300)).toEqual({
      kind: 'hidden',
      reason: 'no_progress',
    })
    expect(estimateFinish([month('2026-08', 200), month('2026-09', 200)], 'savings', 300)).toEqual({
      kind: 'hidden',
      reason: 'reached',
    })
    expect(estimateFinish([month('2026-08', 1), month('2026-09', 1)], 'savings', 300)).toEqual({
      kind: 'hidden',
      reason: 'too_far',
    })
  })
})
