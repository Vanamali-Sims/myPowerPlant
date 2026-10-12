/**
 * Unit tests for turning What if household changes into monthly usage.
 */
import { describe, expect, it } from 'vitest'

import { WEEKS_PER_MONTH } from '../../../constants/kpiMethodology'
import { BASELINE_PROFILE } from '../../../data/baselines'
import { emptyProfile } from '../../../types/profile'
import { seedMethodologyBundle } from '../../methodologyFixture'
import { kwhPerCycle, modelledWeeklyKwh, withUsageChange } from '../usageChange'

const bundle = seedMethodologyBundle()
const profile = { ...emptyProfile(), ...BASELINE_PROFILE, monthlyKwh: '540' }

describe('withUsageChange', () => {
  it('adds weekly kWh to the monthly figure, and takes it away when negative', () => {
    expect(withUsageChange(profile, 10).monthlyKwh).toBe(String(Math.round(540 + 10 * WEEKS_PER_MONTH)))
    expect(withUsageChange(profile, -10).monthlyKwh).toBe(String(Math.round(540 - 10 * WEEKS_PER_MONTH)))
  })

  it('stays inside the monthly bounds and leaves answers without a monthly figure alone', () => {
    expect(withUsageChange(profile, -100000).monthlyKwh).toBe('1')
    const modelled = { ...profile, monthlyKwh: '' }
    expect(withUsageChange(modelled, 10)).toBe(modelled)
  })
})

describe('household change sizes', () => {
  it('uses average draw × hours per cycle from the methodology data', () => {
    const spec = bundle.appliances.dishwasher
    expect(kwhPerCycle(bundle, 'dishwasher')).toBeCloseTo(spec.powerKw * (spec.hoursPerCycle ?? 0), 10)
    expect(kwhPerCycle(bundle, 'dishwasher')).toBeGreaterThan(0)
  })

  it('models more people as more weekly use', () => {
    expect(modelledWeeklyKwh({ ...profile, people: '5' }, bundle)).toBeGreaterThan(
      modelledWeeklyKwh({ ...profile, people: '2' }, bundle),
    )
  })
})
