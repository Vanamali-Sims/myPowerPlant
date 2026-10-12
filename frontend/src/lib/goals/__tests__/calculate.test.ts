/**
 * Unit tests for estimated savings and carbon (US8.3 AC2, AC3).
 *
 * Savings use the rate the person entered, else the typical Victorian rate
 * from the methodology data. Only discharge counts towards savings and carbon.
 */
import { describe, expect, it } from 'vitest'

import { seedMethodologyBundle } from '../../methodologyFixture'
import {
  buildCalculationContext,
  calculateDay,
  getEmissionsFactor,
  getRateForInterval,
  summariseDays,
} from '../calculate'

const bundle = seedMethodologyBundle()

describe('which rate is used (AC2)', () => {
  it('uses the rate the person entered, marked as theirs', () => {
    const context = buildCalculationContext(0.35, bundle)
    expect(context).toEqual({ rate: 0.35, rateKind: 'from_you', factor: bundle.methodology.vicGridKgCo2PerKwh })
    expect(getRateForInterval(context, '2026-09-01')).toBe(0.35)
  })

  it('falls back to the typical Victorian rate as an estimate when none was entered', () => {
    const context = buildCalculationContext(null, bundle)
    expect(context.rate).toBe(bundle.methodology.defaultRetailRate)
    expect(context.rateKind).toBe('estimate')
  })

  it('uses the shared Victorian emissions factor', () => {
    expect(getEmissionsFactor(bundle)).toBe(bundle.methodology.vicGridKgCo2PerKwh)
  })
})

describe('only discharge counts (AC3)', () => {
  const context = { rate: 0.3, rateKind: 'estimate' as const, factor: 0.77 }

  it('counts discharge only, never intake', () => {
    const day = calculateDay({ date: '2026-09-01', intervals: 96, dischargeKwh: 6, intakeKwh: 4 }, context)
    expect(day.energyKwh).toBe(6)
    expect(day.savingsAud).toBeCloseTo(1.8, 10)
    expect(day.carbonKg).toBeCloseTo(4.62, 10)
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
      energyKwh: 8,
    })
    expect(totals.savingsAud).toBeCloseTo(2.4, 10)
    expect(totals.carbonKg).toBeCloseTo(6.16, 10)
  })
})
