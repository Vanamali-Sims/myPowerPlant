/**
 * Unit tests for the KPI engine.
 *
 * Case IDs (FUN-xx) map to testing/02-test-cases/functional-test-cases.md.
 *
 * The KPIs drive a real financial decision, so these tests check the numbers
 * against calculations worked by hand from the documented methodology - not
 * merely that a number was produced. Worked examples are in
 * testing/05-evidence/kpi-worked-example-1.md.
 *
 * One test is marked `it.fails` (KPI-02, still open). KPI-01 (refrigerator
 * power rating) has since been fixed upstream and is now a plain `it`.
 */
import { describe, expect, it } from 'vitest'

import { BASELINE_PROFILE } from '../data/baselines'
import { emptyProfile, type ProfileData } from '../types/profile'
import { seedMethodologyBundle } from './methodologyFixture'
import {
  buildKpiReport,
  formatAud,
  formatKg,
  formatKwh,
  parseCount,
  scaleAud,
  scaleKwh,
  weeklyVppPaymentAud,
} from './kpis'

// Mirrors the Alembic-seeded methodology data — no running API needed.
const data = seedMethodologyBundle()
const {
  melbournePeakSunHours: MELBOURNE_PEAK_SUN_HOURS,
  solarPerformanceRatio: SOLAR_PERFORMANCE_RATIO,
  typicalPotentialKw: TYPICAL_POTENTIAL_KW,
  vicGridKgCo2PerKwh: VIC_GRID_KG_CO2_PER_KWH,
  defaultRetailRate: DEFAULT_RETAIL_RATE,
} = data.methodology
const ORIENTATION_FACTOR = data.orientationFactors

function profile(overrides: Partial<ProfileData> = {}): ProfileData {
  return {
    ...emptyProfile(),
    ...BASELINE_PROFILE,
    fieldSources: {},
    lastUpdated: null,
    ...overrides,
  }
}

/** Every numeric leaf of the weekly block, for finiteness checks. */
function weeklyValues(report: ReturnType<typeof buildKpiReport>): [string, number][] {
  return Object.entries(report.weekly)
}


// parseCount


describe('parseCount', () => {
  it.each([
    ['3', 3],
    ['6+', 6],
    ['10+', 10],
    ['0', 0],
  ])('parses %s as %i', (input, expected) => {
    expect(parseCount(input)).toBe(expected)
  })

  it.each(['', 'abc', 'not a number'])('falls back to 0 for %o', (input) => {
    expect(parseCount(input)).toBe(0)
  })

  it('never returns NaN', () => {
    for (const input of ['', 'x', '6+', '-', '1.5']) {
      expect(Number.isFinite(parseCount(input))).toBe(true)
    }
  })
})


// Timeframe scaling - the documented rule is daily = weekly / 7,
// fortnightly = weekly x 2


describe('timeframe scaling', () => {
  it('daily is weekly divided by 7', () => {
    expect(scaleKwh(140, 'daily')).toBe(20)
  })

  it('weekly is unchanged', () => {
    expect(scaleKwh(140, 'weekly')).toBe(140)
  })

  it('fortnightly is weekly multiplied by 2', () => {
    expect(scaleKwh(140, 'fortnightly')).toBe(280)
  })

  it('scales currency by the same rule as energy', () => {
    for (const tf of ['daily', 'weekly', 'fortnightly'] as const) {
      expect(scaleAud(140, tf)).toBe(scaleKwh(140, tf))
    }
  })

  it('handles zero without producing NaN', () => {
    for (const tf of ['daily', 'weekly', 'fortnightly'] as const) {
      expect(Number.isFinite(scaleKwh(0, tf))).toBe(true)
    }
  })
})


// FUN-08 - consumption against a hand-worked figure


describe('FUN-08 consumption', () => {
  it('derives weekly consumption from the billed monthly figure (540 / 4 = 135)', () => {
    const report = buildKpiReport(profile({ monthlyKwh: '540' }), data)
    expect(report.weekly.consumptionKwh).toBeCloseTo(135, 6)
  })

  it('labels consumption "from_you" when the user supplied monthly kWh', () => {
    const report = buildKpiReport(
      profile({ fieldSources: { monthlyKwh: 'user' } }),
      data,
    )
    expect(report.consumptionKind).toBe('from_you')
  })

  it('labels consumption "estimate" when monthly kWh came from the baseline', () => {
    const report = buildKpiReport(
      profile({ fieldSources: { monthlyKwh: 'baseline' } }),
      data,
    )
    expect(report.consumptionKind).toBe('estimate')
  })

  it('falls back to the modelled appliance total when no monthly kWh is known', () => {
    const report = buildKpiReport(profile({ monthlyKwh: '' }), data)
    const applianceTotal = report.appliances.reduce((s, l) => s + l.weeklyKwh, 0)
    expect(report.weekly.consumptionKwh).toBeCloseTo(applianceTotal, 6)
    expect(report.consumptionKind).toBe('estimate')
  })

  it('FUN-06 recalculates when the user edits their usage', () => {
    const before = buildKpiReport(profile({ monthlyKwh: '540' }), data)
    const after = buildKpiReport(profile({ monthlyKwh: '800' }), data)
    expect(after.weekly.consumptionKwh).toBeGreaterThan(before.weekly.consumptionKwh)
    expect(after.weekly.consumptionKwh).toBeCloseTo(200, 6)
  })
})


// FUN-08 - solar generation against the documented formula


describe('FUN-08 solar generation', () => {
  it('applies kW x peak sun hours x performance ratio x orientation x 7', () => {
    const report = buildKpiReport(
      profile({ hasSolar: 'yes', panelCount: '12', panelWatts: '400', solarDirection: 'S' }),
      data,
    )
    const kw = (12 * 400) / 1000
    const expected =
      kw * MELBOURNE_PEAK_SUN_HOURS * SOLAR_PERFORMANCE_RATIO * ORIENTATION_FACTOR.S * 7
    expect(report.weekly.generationKwh).toBeCloseTo(expected, 6)
    expect(report.weekly.generationKwh).toBeCloseTo(62.0928, 4)
  })

  it('rates a north-facing roof above a south-facing one', () => {
    const north = buildKpiReport(profile({ solarDirection: 'N' }), data)
    const south = buildKpiReport(profile({ solarDirection: 'S' }), data)
    expect(north.weekly.generationKwh).toBeGreaterThan(south.weekly.generationKwh)
  })

  it('treats an unknown direction as the "not sure" factor', () => {
    const unknown = buildKpiReport(profile({ solarDirection: '' }), data)
    const notSure = buildKpiReport(profile({ solarDirection: 'not_sure' }), data)
    expect(unknown.weekly.generationKwh).toBeCloseTo(notSure.weekly.generationKwh, 6)
  })

  it('FUN-07 models a typical 6.6 kW roof as potential when the home has no solar', () => {
    const report = buildKpiReport(
      profile({ hasSolar: 'no', panelCount: '', panelWatts: '', solarDirection: '' }),
      data,
    )
    expect(report.hasSolar).toBe(false)
    expect(report.solarIsPotential).toBe(true)

    const expected =
      TYPICAL_POTENTIAL_KW *
      MELBOURNE_PEAK_SUN_HOURS *
      SOLAR_PERFORMANCE_RATIO *
      ORIENTATION_FACTOR.not_sure *
      7
    expect(report.weekly.generationKwh).toBeCloseTo(expected, 6)
  })
})


// Energy balance


describe('energy balance', () => {
  const report = buildKpiReport(profile(), data)

  it('never distributes more than it generates', () => {
    expect(report.weekly.energyDistributedKwh).toBeLessThanOrEqual(
      report.weekly.generationKwh + 1e-9,
    )
  })

  it('splits generation into self-consumed plus distributed', () => {
    expect(report.weekly.selfConsumedKwh + report.weekly.energyDistributedKwh).toBeCloseTo(
      report.weekly.generationKwh,
      6,
    )
  })

  it('reports no surplus when generation is below consumption', () => {
    expect(report.weekly.surplusKwh).toBe(0)
  })

  it('derives carbon avoided from distributed energy at the Victorian grid factor', () => {
    expect(report.weekly.carbonAvoidedKg).toBeCloseTo(
      report.weekly.energyDistributedKwh * VIC_GRID_KG_CO2_PER_KWH,
      6,
    )
  })

  it('lets a larger battery shift at least as much energy as a smaller one', () => {
    const small = buildKpiReport(profile({ batteryUnits: 1, reservePercent: '80' }), data)
    const large = buildKpiReport(profile({ batteryUnits: 8, reservePercent: '0' }), data)
    expect(large.weekly.selfConsumedKwh).toBeGreaterThanOrEqual(
      small.weekly.selfConsumedKwh,
    )
  })

  it('splits the week into four periods that sum to the weekly totals', () => {
    const consumption = report.periods.reduce((s, p) => s + p.consumptionKwh, 0)
    expect(consumption).toBeCloseTo(report.weekly.consumptionKwh, 6)
    expect(report.periods.map((p) => p.id)).toEqual([
      'morning',
      'afternoon',
      'evening',
      'night',
    ])
  })

  it('weights the stated peak period most heavily', () => {
    const evening = buildKpiReport(profile({ peakPeriod: 'evening' }), data)
    const peak = evening.periods.find((p) => p.id === 'evening')!
    for (const other of evening.periods.filter((p) => p.id !== 'evening')) {
      expect(peak.consumptionKwh).toBeGreaterThan(other.consumptionKwh)
    }
  })
})


// Retail rate and plan comparison


describe('retail rate', () => {
  it('derives the rate from bill divided by kWh (180 / 540)', () => {
    const report = buildKpiReport(profile({ monthlyBill: '180', monthlyKwh: '540' }), data)
    expect(report.retailRate).toBeCloseTo(180 / 540, 6)
  })

  it('falls back to the typical Victorian rate when figures are missing', () => {
    const report = buildKpiReport(profile({ monthlyBill: '', monthlyKwh: '' }), data)
    expect(report.retailRate).toBe(DEFAULT_RETAIL_RATE)
    expect(report.retailRateKind).toBe('estimate')
  })

  it('labels the rate "from_you" when the bill came from the user', () => {
    const report = buildKpiReport(profile({ fieldSources: { monthlyBill: 'user' } }), data)
    expect(report.retailRateKind).toBe('from_you')
  })

  it('never divides by zero', () => {
    const report = buildKpiReport(profile({ monthlyBill: '180', monthlyKwh: '0' }), data)
    expect(Number.isFinite(report.retailRate)).toBe(true)
    expect(report.retailRate).toBe(DEFAULT_RETAIL_RATE)
  })
})

describe('plan comparison', () => {
  it('marks the household current provider as the current plan', () => {
    const report = buildKpiReport(profile({ provider: 'AGL Energy' }), data)
    expect(report.currentPlan?.plan.brand).toBe('AGL Energy')
  })

  it('has no current plan when the provider is not on the VPP list', () => {
    expect(buildKpiReport(profile({ provider: 'Other' }), data).currentPlan).toBeNull()
  })

  it('orders plans by weekly savings, best first', () => {
    const plans = buildKpiReport(profile(), data).matchedPlans
    const savings = plans.map((p) => p.weeklySavings)
    expect([...savings].sort((a, b) => b - a)).toEqual(savings)
  })

  it('recommends exactly one plan', () => {
    const plans = buildKpiReport(profile(), data).matchedPlans
    expect(plans.filter((p) => p.isRecommended)).toHaveLength(1)
  })

  it('does not recommend the plan the household is already on', () => {
    const report = buildKpiReport(profile({ provider: 'AGL Energy' }), data)
    expect(report.recommended.plan.brand).not.toBe('AGL Energy')
  })

  it('computes savings as self-consumed x retail + distributed x export rate', () => {
    const report = buildKpiReport(profile(), data)
    const { selfConsumedKwh, energyDistributedKwh } = report.weekly
    const expected =
      selfConsumedKwh * report.retailRate +
      energyDistributedKwh * report.recommended.plan.exportRate
    expect(report.weekly.savingsAud).toBeCloseTo(expected, 6)
  })

  it('computes VPP payment as distributed kWh times the matched plan export rate', () => {
    const report = buildKpiReport(profile(), data)
    const expected = report.weekly.energyDistributedKwh * report.recommended.plan.exportRate
    expect(weeklyVppPaymentAud(report)).toBeCloseTo(expected, 6)
    expect(weeklyVppPaymentAud(report)).toBeLessThanOrEqual(report.weekly.savingsAud)
  })

  it('only offers plans compatible with the household battery', () => {
    const report = buildKpiReport(profile({ batteryModel: 'Tesla Powerwall 2' }), data)
    for (const { plan } of report.matchedPlans) {
      expect(plan.compatibleBatteries).toContain('Tesla Powerwall 2')
    }
  })
})


// Appliance modelling - E = N x P x H, and the conditional branches


describe('appliance modelling', () => {
  const lineFor = (p: ProfileData, id: string) =>
    buildKpiReport(p, data).appliances.find((l) => l.spec.id === id)

  it('computes each line as units x power x hours', () => {
    for (const line of buildKpiReport(profile(), data).appliances) {
      expect(line.weeklyKwh).toBeCloseTo(line.units * line.spec.powerKw * line.hoursPerWeek, 9)
    }
  })

  it('includes a monitor only when someone works from home', () => {
    expect(lineFor(profile({ wfh: 'yes' }), 'monitor')).toBeDefined()
    expect(lineFor(profile({ wfh: 'no' }), 'monitor')).toBeUndefined()
  })

  it('includes a dryer only when the home has one', () => {
    expect(lineFor(profile({ dryer: 'yes' }), 'dryer')).toBeDefined()
    expect(lineFor(profile({ dryer: 'no' }), 'dryer')).toBeUndefined()
  })

  it('uses the stated dryer cycles times the published minutes per cycle', () => {
    const line = lineFor(profile({ dryer: 'yes', dryerWeek: '4', dryerWeekend: '2' }), 'dryer')
    const hoursPerCycle = data.appliances.dryer.hoursPerCycle!
    // 6 stated cycles x ~54 min/cycle (Sustainability Victoria), not 1 hr/cycle.
    expect(line?.hoursPerWeek).toBeCloseTo(6 * hoursPerCycle, 6)
  })

  it('counts the stated number of refrigerators', () => {
    expect(lineFor(profile({ refrigerators: '3' }), 'refrigerator')?.units).toBe(3)
  })

  it('skips the electric water heater when the home has gas', () => {
    expect(lineFor(profile({ gas: 'yes', hotWater: 'yes' }), 'waterHeater')).toBeUndefined()
    expect(lineFor(profile({ gas: 'no', hotWater: 'yes' }), 'waterHeater')).toBeDefined()
  })

  it('picks the cooling appliance that matches the answer', () => {
    expect(lineFor(profile({ cooling: 'air_conditioning' }), 'aircon')).toBeDefined()
    expect(lineFor(profile({ cooling: 'evaporative' }), 'evaporative')).toBeDefined()
    expect(lineFor(profile({ cooling: 'none' }), 'aircon')).toBeUndefined()
  })

  it('includes an electric heater only for electric heating', () => {
    expect(lineFor(profile({ heating: 'electric' }), 'heater')).toBeDefined()
    expect(lineFor(profile({ heating: 'gas' }), 'heater')).toBeUndefined()
  })

  it('marks a line as "from you" only when the field came from the user', () => {
    const fromUser = lineFor(
      profile({ refrigerators: '2', fieldSources: { refrigerators: 'user' } }),
      'refrigerator',
    )
    const fromBaseline = lineFor(
      profile({ refrigerators: '2', fieldSources: { refrigerators: 'baseline' } }),
      'refrigerator',
    )
    expect(fromUser?.fromYou).toBe(true)
    expect(fromBaseline?.fromYou).toBe(false)
  })

  /**
   * DEFECT KPI-01 (S2) is fixed: refrigerator powerKw moved from 1.92 (a
   * rated input power) to a duty-cycle-adjusted 0.057. Kept as a regression.
   */
  it('KPI-01: a single refrigerator uses a realistic 5-20 kWh per week', () => {
    const line = lineFor(profile({ refrigerators: '1' }), 'refrigerator')!
    expect(line.weeklyKwh).toBeGreaterThan(5)
    expect(line.weeklyKwh).toBeLessThan(20)
  })
})


// FUN-07 - households without solar


describe('FUN-07 household without solar or battery', () => {
  const noSystem = profile({
    hasSolar: 'no',
    panelCount: '',
    panelWatts: '',
    solarDirection: '',
    batteryUnits: 0,
    batteryModel: 'Not sure',
  })

  it('still produces a complete, finite report', () => {
    const report = buildKpiReport(noSystem, data)
    for (const [key, value] of weeklyValues(report)) {
      expect(Number.isFinite(value), `${key} is not finite`).toBe(true)
    }
  })

  it('shifts no energy when there is no battery', () => {
    const report = buildKpiReport(noSystem, data)
    const daytime = report.weekly.consumptionKwh * 0.4
    expect(report.weekly.selfConsumedKwh).toBeLessThanOrEqual(daytime + 1e-9)
  })

  it('flags the solar figure as potential rather than actual', () => {
    expect(buildKpiReport(noSystem, data).solarIsPotential).toBe(true)
  })

  /**
   * DEFECT KPI-02 (S2). For a household that answered "no solar", the report
   * still returns a non-zero savingsAud and carbonAvoidedKg derived from a
   * hypothetical 6.6 kW array. DashboardView renders weekly.savingsAud as a
   * dollar KPI without consulting solarIsPotential, so a household with no
   * panels is shown money it is not saving. Either zero these figures for a
   * potential-only report, or label them as hypothetical in the dashboard.
   */
  it.fails('KPI-02: a household with no solar should not be shown dollar savings', () => {
    expect(buildKpiReport(noSystem, data).weekly.savingsAud).toBe(0)
  })

  it('KPI-02 current behaviour, pinned until the defect is fixed', () => {
    const report = buildKpiReport(noSystem, data)
    expect(report.weekly.savingsAud).toBeGreaterThan(0)
    expect(report.weekly.carbonAvoidedKg).toBeGreaterThan(0)
  })
})


// FUN-10 - extreme but valid inputs


describe('FUN-10 boundary profiles produce usable output', () => {
  const profiles: [string, ProfileData][] = [
    ['all maximums', profile({
      monthlyBill: '5000',
      monthlyKwh: '5000',
      panelCount: '80',
      panelWatts: '500',
      batteryUnits: 8,
      reservePercent: '0',
      people: '6+',
      rooms: '10+',
      refrigerators: '4+',
      dryerWeek: '7',
      dryerWeekend: '7',
    })],
    ['all minimums', profile({
      monthlyBill: '1',
      monthlyKwh: '1',
      panelCount: '1',
      panelWatts: '50',
      batteryUnits: 1,
      reservePercent: '80',
      people: '1',
      rooms: '1',
      refrigerators: '0',
    })],
    ['empty profile', emptyProfile()],
    ['no solar, no battery', profile({ hasSolar: 'no', batteryUnits: 0 })],
  ]

  it.each(profiles)('%s: every weekly figure is finite and non-negative', (_name, p) => {
    const report = buildKpiReport(p, data)
    for (const [key, value] of weeklyValues(report)) {
      expect(Number.isFinite(value), `${key} is ${value}`).toBe(true)
      // netEnergyValueAud is (generation − consumption) × rate: signed by
      // design, negative for any household that imports more than it makes.
      if (key === 'netEnergyValueAud') continue
      expect(value, `${key} is negative`).toBeGreaterThanOrEqual(0)
    }
  })

  it.each(profiles)('%s: always recommends a plan', (_name, p) => {
    expect(buildKpiReport(p, data).recommended?.plan).toBeDefined()
  })

  it.each(profiles)('%s: every appliance line is finite', (_name, p) => {
    for (const line of buildKpiReport(p, data).appliances) {
      expect(Number.isFinite(line.weeklyKwh)).toBe(true)
    }
  })

  it.each(profiles)('%s: produces the full set of assumptions', (_name, p) => {
    const report = buildKpiReport(p, data)
    expect(report.assumptions.length).toBeGreaterThanOrEqual(7)
    for (const a of report.assumptions) {
      expect(a.title).toBeTruthy()
      expect(a.detail).toBeTruthy()
    }
  })
})


// Formatters - boundary behaviour


describe('formatters', () => {
  it.each([
    [150, '150 kWh'],
    [100, '100 kWh'],
    [99.9, '99.9 kWh'],
    [15, '15.0 kWh'],
    [10, '10.0 kWh'],
    [9.99, '9.99 kWh'],
    [1.5, '1.50 kWh'],
    [0, '0.00 kWh'],
  ])('formatKwh(%f) is %s', (input, expected) => {
    expect(formatKwh(input)).toBe(expected)
  })

  it.each([
    [15, '$15'],
    [10, '$10'],
    [9.99, '$9.99'],
    [1.5, '$1.50'],
    [0, '$0.00'],
  ])('formatAud(%f) is %s', (input, expected) => {
    expect(formatAud(input)).toBe(expected)
  })

  it.each([
    [15, '15 kg'],
    [10, '10 kg'],
    [9.9, '9.9 kg'],
    [0, '0.0 kg'],
  ])('formatKg(%f) is %s', (input, expected) => {
    expect(formatKg(input)).toBe(expected)
  })

  it('never renders NaN or Infinity as a value', () => {
    for (const fn of [formatKwh, formatAud, formatKg]) {
      expect(fn(0)).not.toMatch(/NaN|Infinity/)
    }
  })
})


// Report shape


describe('report shape', () => {
  it('labels the location from the postcode', () => {
    expect(buildKpiReport(profile({ postcode: '3101' }), data).locationLabel).toBeTruthy()
  })

  it('falls back to VIC when the postcode is unknown', () => {
    expect(buildKpiReport(profile({ postcode: '' }), data).locationLabel).toBe('VIC')
  })

  it('is a pure function of the profile', () => {
    const p = profile()
    expect(buildKpiReport(p, data).weekly).toEqual(buildKpiReport(p, data).weekly)
  })

  it('does not mutate the profile it is given', () => {
    const p = profile()
    const snapshot = JSON.stringify(p)
    buildKpiReport(p, data)
    expect(JSON.stringify(p)).toBe(snapshot)
  })
})
