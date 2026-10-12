/**
 * Unit tests for goal setup rules: the battery-file baseline, ranges, and checks.
 *
 * The carbon examples must use the same emissions factor field buildKpiReport reads.
 */
import { describe, expect, it } from 'vitest'

import { BASELINE_RULES, GOAL_SUGGESTION_MONTHS } from '../../constants/goals'
import type { DayFigures } from './calculate'
import { addDays } from './calendar'
import { formatGoalAud, formatGoalKg, formatPercent, progressPercent, progressText } from './goalFormat'
import {
  buildCarbonExamples,
  normaliseGoal,
  parseGoalInput,
  pickBaseline,
  suggestGoals,
  validateGoal,
} from './goalSetup'
import { seedMethodologyBundle } from '../methodologyFixture'

const bundle = seedMethodologyBundle()
const TODAY = '2026-10-10'

/** Complete days from `from`, each worth $2 and 1.5 kg. */
function days(from: string, count: number): DayFigures[] {
  return Array.from({ length: count }, (_, index) => ({
    date: addDays(from, index),
    intervals: 96,
    dischargeKwh: 3,
    intakeKwh: 1,
    energyKwh: 4,
    savingsAud: 2,
    carbonKg: 1.5,
  }))
}

describe('pickBaseline', () => {
  it('scales a part-month to an average month: total ÷ days × 30.4', () => {
    const result = pickBaseline(days('2026-09-01', 20), TODAY)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.month).toBe('2026-09')
    expect(result.days).toHaveLength(20)
    expect(result.monthly.savings).toBeCloseTo((40 / 20) * BASELINE_RULES.daysPerMonth, 10)
    expect(result.monthly.carbon).toBeCloseTo((30 / 20) * BASELINE_RULES.daysPerMonth, 10)
  })

  it('uses the latest recent month with enough days, and only its days', () => {
    const result = pickBaseline([...days('2026-08-01', 31), ...days('2026-09-01', 30), ...days('2026-10-01', 5)], TODAY)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.month).toBe('2026-09')
    expect(result.days.every((day) => day.date.startsWith('2026-09'))).toBe(true)
  })

  it('accepts the current month once it has enough complete days', () => {
    const result = pickBaseline(days('2026-10-01', BASELINE_RULES.minCompleteDays), '2026-10-20')
    expect(result.ok && result.month).toBe('2026-10')
  })

  it(`needs at least ${BASELINE_RULES.minCompleteDays} complete days in one month`, () => {
    expect(pickBaseline(days('2026-09-01', BASELINE_RULES.minCompleteDays - 1), TODAY)).toEqual({
      ok: false,
      reason: 'baseline_too_few_days',
    })
    // Spread over two months, neither has enough on its own.
    expect(pickBaseline(days('2026-08-20', 20), TODAY)).toEqual({ ok: false, reason: 'baseline_too_few_days' })
  })

  it(`only counts this month and the ${BASELINE_RULES.recentMonths} months before it`, () => {
    expect(pickBaseline(days('2026-07-01', 31), TODAY).ok).toBe(true)
    expect(pickBaseline(days('2026-06-01', 30), TODAY)).toEqual({ ok: false, reason: 'baseline_not_recent' })
    expect(pickBaseline(days('2026-11-01', 30), TODAY)).toEqual({ ok: false, reason: 'baseline_not_recent' })
  })
})

describe('suggestGoals', () => {
  it('runs from 2 to 13 months of the baseline, suggesting 3, rounded up', () => {
    expect(GOAL_SUGGESTION_MONTHS).toEqual({ min: 2, suggested: 3, max: 13 })
    const { savings, carbon } = suggestGoals({ savings: 30.2, carbon: 20 })
    expect(savings).toEqual({ min: 61, suggested: 91, max: 393 })
    expect(carbon).toEqual({ min: 40, suggested: 60, max: 260 })
  })

  it('gives no range for a goal with nothing counted', () => {
    expect(suggestGoals({ savings: 0, carbon: 5 }).savings).toBeNull()
  })
})

describe('parseGoalInput', () => {
  it.each([
    ['300', 300],
    ['$1,200', 1200],
    [' 12.5 ', 12.5],
    ['-4', -4],
  ])('reads %s', (raw, expected) => {
    expect(parseGoalInput(raw)).toBe(expected)
  })

  it.each(['', 'abc', '12a', '1.2.3', '$', '1e3'])('rejects %j', (raw) => {
    expect(parseGoalInput(raw)).toBeNull()
  })
})

describe('validateGoal', () => {
  const range = { suggested: 300, min: 100, max: 1200 }

  it.each([
    ['', 'Enter a savings goal.'],
    ['abc', 'Enter a number only, for example 300.'],
    ['0', 'Enter an amount above zero.'],
    ['-20', 'Enter an amount above zero.'],
    ['50', 'This is below the allowed range.'],
    ['5000', 'This is above the allowed range.'],
  ])('explains what is wrong with %j and leaves the range to the line under the field', (raw, message) => {
    expect(validateGoal('savings', raw, range)).toBe(message)
  })

  it('accepts values inside the range, including both ends', () => {
    expect(validateGoal('savings', '100', range)).toBeUndefined()
    expect(validateGoal('savings', '1200', range)).toBeUndefined()
    expect(validateGoal('carbon', '450', { suggested: 450, min: 150, max: 1800 })).toBeUndefined()
  })

  it('names the carbon goal', () => {
    expect(validateGoal('carbon', '', { suggested: 450, min: 150, max: 1800 })).toBe(
      'Enter a carbon goal.',
    )
  })

  it('keeps cents and tenths of a kilogram', () => {
    expect(normaliseGoal('savings', 12.345)).toBe(12.35)
    expect(normaliseGoal('carbon', 12.345)).toBe(12.3)
  })
})

describe('buildCarbonExamples', () => {
  it('multiplies battery kWh by the methodology emissions factor', () => {
    const factor = bundle.methodology.vicGridKgCo2PerKwh
    const examples = buildCarbonExamples(factor, null)
    expect(examples.length).toBeGreaterThanOrEqual(2)
    for (const example of examples) {
      expect(example.kg).toBeCloseTo(example.kwh * factor, 10)
    }
  })

  it('adds one example close to the suggested carbon goal', () => {
    const factor = bundle.methodology.vicGridKgCo2PerKwh
    const examples = buildCarbonExamples(factor, 362)
    const near = examples.find((example) => example.nearSuggestion)
    expect(near).toBeDefined()
    expect(Math.abs((near?.kg ?? 0) - 362)).toBeLessThanOrEqual(factor)
  })
})

describe('goal formatting', () => {
  it('formats dollars, kilograms, and progress in plain words', () => {
    expect(formatGoalAud(1200)).toBe('$1,200')
    expect(formatGoalAud(12.5)).toBe('$12.50')
    expect(formatGoalKg(1800)).toBe('1,800 kg CO2e')
    expect(formatGoalKg(7.7)).toBe('7.7 kg CO2e')
    expect(progressText('savings', 120, 300)).toBe('$120 of $300, 40 percent')
    expect(progressText('carbon', 127, 288)).toBe('127 kg of 288 kg CO2e, 44 percent')
    expect(progressText('carbon', 7.5, 288)).toBe('7.5 kg of 288 kg CO2e, 2 percent')
  })

  it('keeps the real percentage above 100', () => {
    expect(progressPercent(390, 300)).toBeCloseTo(130, 10)
    expect(formatPercent(130)).toBe('130 percent')
    expect(formatPercent((290 / 500) * 100)).toBe('58 percent')
    expect(formatPercent(57.6)).toBe('57 percent')
    expect(progressPercent(10, 0)).toBe(0)
  })
})
