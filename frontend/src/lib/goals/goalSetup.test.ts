/**
 * Unit tests for goal setup rules (US8.1 AC2, AC3, AC4, AC6).
 *
 * Suggestions must come from the dashboard's own estimate, and the carbon
 * examples must use the same emissions factor field buildKpiReport reads.
 */
import { describe, expect, it } from 'vitest'

import { GOAL_SUGGESTION_MONTHS } from '../../constants/goals'
import { WEEKS_PER_MONTH } from '../../constants/kpiMethodology'
import { BASELINE_PROFILE } from '../../data/baselines'
import { emptyProfile, type ProfileData } from '../../types/profile'
import { buildKpiReport } from '../kpis'
import { seedMethodologyBundle } from '../methodologyFixture'
import { formatGoalAud, formatGoalKg, formatPercent, progressPercent, progressText } from './goalFormat'
import {
  buildCarbonExamples,
  getGoalsReadiness,
  monthlyProfileEstimate,
  normaliseGoal,
  parseGoalInput,
  suggestGoals,
  validateGoal,
} from './goalSetup'

const bundle = seedMethodologyBundle()

function savedProfile(overrides: Partial<ProfileData> = {}): ProfileData {
  return {
    ...emptyProfile(),
    ...BASELINE_PROFILE,
    lastUpdated: '2026-10-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('getGoalsReadiness', () => {
  it('is ready for a saved profile the wizard would accept', () => {
    expect(getGoalsReadiness(savedProfile())).toEqual({ ready: true })
  })

  it('lists every setup section when no profile is saved', () => {
    const result = getGoalsReadiness(emptyProfile())
    expect(result.ready).toBe(false)
    if (result.ready) return
    expect(result.hasSavedProfile).toBe(false)
    expect(result.missing).toEqual([
      'Household Profile',
      'Household Usage',
      'Solar Details',
      'Battery Profile',
      'Energy Provider',
    ])
  })

  it('names the missing answers on a saved but incomplete profile', () => {
    const result = getGoalsReadiness(savedProfile({ monthlyBill: '', postcode: '' }))
    expect(result.ready).toBe(false)
    if (result.ready) return
    expect(result.hasSavedProfile).toBe(true)
    expect(result.missing).toContain('Postcode')
    expect(result.missing).toContain('Average monthly electricity bill')
  })

  it('does not require monthly kWh, which no screen collects', () => {
    expect(getGoalsReadiness(savedProfile({ monthlyKwh: '' }))).toEqual({ ready: true })
  })
})

describe('suggestGoals', () => {
  it('uses the dashboard estimate × WEEKS_PER_MONTH as the monthly basis', () => {
    const profile = savedProfile()
    const report = buildKpiReport(profile, bundle)
    const monthly = monthlyProfileEstimate(profile, bundle)
    expect(monthly.savings).toBeCloseTo(report.weekly.savingsAud * WEEKS_PER_MONTH, 10)
    expect(monthly.carbon).toBeCloseTo(report.weekly.carbonAvoidedKg * WEEKS_PER_MONTH, 10)
  })

  it('suggests the agreed number of months, with the range from min to max months', () => {
    const profile = savedProfile()
    const monthly = monthlyProfileEstimate(profile, bundle)
    const { savings, carbon } = suggestGoals(profile, bundle)
    expect(savings).not.toBeNull()
    expect(carbon).not.toBeNull()
    if (!savings || !carbon) return
    expect(savings.min).toBe(Math.ceil(monthly.savings * GOAL_SUGGESTION_MONTHS.min))
    expect(savings.max).toBe(Math.ceil(monthly.savings * GOAL_SUGGESTION_MONTHS.max))
    expect(savings.suggested).toBe(Math.ceil(monthly.savings * GOAL_SUGGESTION_MONTHS.suggested))
    expect(carbon.min).toBeLessThanOrEqual(carbon.suggested)
    expect(carbon.suggested).toBeLessThanOrEqual(carbon.max)
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
  })

  it('keeps the real percentage above 100', () => {
    expect(progressPercent(390, 300)).toBeCloseTo(130, 10)
    expect(formatPercent(130)).toBe('130 percent')
    expect(progressPercent(10, 0)).toBe(0)
  })
})
