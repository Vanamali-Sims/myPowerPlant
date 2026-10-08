/**
 * Unit tests for estimated savings and carbon (US8.3 AC2, AC3).
 *
 * The consistency checks assert that Goals uses the very same rate and
 * emissions factor values as buildKpiReport, not the same end result: the
 * dashboard values different energy, so its totals are not comparable.
 */
import { describe, expect, it } from 'vitest'

import { BASELINE_PROFILE } from '../../data/baselines'
import { emptyProfile, type ProfileData } from '../../types/profile'
import { buildKpiReport } from '../kpis'
import { seedMethodologyBundle } from '../methodologyFixture'
import {
  buildCalculationContext,
  calculateDay,
  getEmissionsFactor,
  getRateForInterval,
  summariseDays,
} from './calculate'

const bundle = seedMethodologyBundle()

function profile(overrides: Partial<ProfileData> = {}): ProfileData {
  return { ...emptyProfile(), ...BASELINE_PROFILE, lastUpdated: '2026-10-01T00:00:00.000Z', ...overrides }
}

const typical = profile({ monthlyKwh: '' })
const household = profile({
  monthlyBill: '200',
  monthlyKwh: '500',
  fieldSources: { monthlyBill: 'user', monthlyKwh: 'user' },
})

describe('same rules as the main website (AC2)', () => {
  it.each([
    ['a profile without monthly kWh', typical],
    ['a profile with its own bill and usage', household],
  ])('uses the dashboard rate and emissions factor for %s', (_label, answers) => {
    const report = buildKpiReport(answers, bundle)
    const context = buildCalculationContext(answers, bundle)
    expect(context.rate).toBe(report.retailRate)
    expect(context.rateKind).toBe(report.retailRateKind)
    expect(context.factor).toBe(bundle.methodology.vicGridKgCo2PerKwh)
    expect(getEmissionsFactor(bundle)).toBe(bundle.methodology.vicGridKgCo2PerKwh)
    expect(getRateForInterval(context, '2026-09-01')).toBe(report.retailRate)
  })

  it('falls back to the typical rate from the methodology data when monthly kWh is missing', () => {
    const context = buildCalculationContext(typical, bundle)
    expect(context.rate).toBe(bundle.methodology.defaultRetailRate)
    expect(context.rateKind).not.toBe('from_you')
  })

  it("marks the household's own bill and usage as from_you", () => {
    const context = buildCalculationContext(household, bundle)
    expect(context.rateKind).toBe('from_you')
    expect(context.rate).toBeCloseTo(0.4, 10)
  })
})

describe('all battery activity counts (AC3)', () => {
  const context = { rate: 0.3, rateKind: 'estimate' as const, factor: 0.77 }

  it('counts discharge plus intake as battery energy', () => {
    const day = calculateDay({ date: '2026-09-01', intervals: 96, dischargeKwh: 6, intakeKwh: 4 }, context)
    expect(day.energyKwh).toBe(10)
    expect(day.savingsAud).toBeCloseTo(3, 10)
    expect(day.carbonKg).toBeCloseTo(7.7, 10)
  })

  it('keeps a missing intake column as missing, never filled in', () => {
    const days = [
      calculateDay({ date: '2026-09-01', intervals: 96, dischargeKwh: 6, intakeKwh: null }, context),
      calculateDay({ date: '2026-09-02', intervals: 96, dischargeKwh: 4, intakeKwh: null }, context),
    ]
    const totals = summariseDays(days)
    expect(totals.intakeKwh).toBeNull()
    expect(totals.energyKwh).toBe(10)
  })

  it('treats a column of zeros as zero intake, not missing', () => {
    const totals = summariseDays([
      calculateDay({ date: '2026-09-01', intervals: 96, dischargeKwh: 6, intakeKwh: 0 }, context),
    ])
    expect(totals.intakeKwh).toBe(0)
  })

  it('summarises the date range, days, and totals', () => {
    const totals = summariseDays([
      calculateDay({ date: '2026-09-01', intervals: 96, dischargeKwh: 6, intakeKwh: 4 }, context),
      calculateDay({ date: '2026-09-02', intervals: 96, dischargeKwh: 2, intakeKwh: 3 }, context),
    ])
    expect(totals).toMatchObject({
      firstDate: '2026-09-01',
      lastDate: '2026-09-02',
      dayCount: 2,
      dischargeKwh: 8,
      intakeKwh: 7,
      energyKwh: 15,
    })
    expect(totals.savingsAud).toBeCloseTo(4.5, 10)
    expect(totals.carbonKg).toBeCloseTo(11.55, 10)
  })
})
