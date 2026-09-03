/**
 * Dev-time assertions for buildKpiReport. Run via `npx tsx src/lib/kpis.selftest.ts`
 * from the frontend folder when changing the KPI model.
 */
import { BASELINE_PROFILE } from '../data/baselines'
import { nearestMappedPostcode } from '../data/profileOptions'
import { emptyProfile, type ProfileData } from '../types/profile'
import { buildKpiReport, scaleKwh, type KpiReport } from './kpis'
import { seedMethodologyBundle } from './methodologyFixture'
import { currentSeason } from './season'
import { buildTypicalDay, leftoverHours } from './typicalDay'

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

function almostEqual(a: number, b: number, epsilon = 0.05) {
  return Math.abs(a - b) <= epsilon
}

function lineFor(report: KpiReport, id: string) {
  const line = report.appliances.find((item) => item.spec.id === id)
  if (!line) throw new Error(`expected an appliance line for ${id}`)
  return line
}

function hoursFor(report: KpiReport, id: string): number {
  return lineFor(report, id).hoursPerWeek
}

const JAN = new Date('2026-01-15T00:00:00')
const JUL = new Date('2026-07-15T00:00:00')
const SEP = new Date('2026-09-15T00:00:00')

const baseline: ProfileData = {
  ...emptyProfile(),
  ...BASELINE_PROFILE,
  fieldSources: {
    monthlyKwh: 'user',
    monthlyBill: 'user',
    hasSolar: 'user',
    panelCount: 'user',
    panelWatts: 'user',
    provider: 'user',
    batteryModel: 'user',
  },
  lastUpdated: new Date().toISOString(),
}

const data = seedMethodologyBundle()
const report = buildKpiReport(baseline, data, JAN)

assert(almostEqual(report.weekly.consumptionKwh, 540 / 4), 'billed monthly kWh should drive weekly consumption')
assert(report.consumptionKind === 'from_you', 'user monthly kWh should be labelled from you')
assert(report.hasSolar, 'baseline has solar')
assert(!report.solarIsPotential, 'existing solar is not potential')
assert(report.weekly.generationKwh > 0, 'solar generation should be positive')
assert(report.appliances.some((line) => line.spec.id === 'dryer'), 'dryer should appear when the profile has one')
assert(report.appliances.some((line) => line.spec.id === 'refrigerator' && line.units === 2), 'two refrigerators')
assert(!report.appliances.some((line) => line.spec.id === 'waterHeater'), 'gas hot water should skip electric HW')
assert(report.currentPlan?.plan.brand === 'AGL Energy', 'current provider should match AGL')
assert(report.matchedPlans.length >= 1, 'at least one matched plan')
assert(report.recommended.weeklySavings > 0, 'recommended plan should have a savings figure')
assert(
  almostEqual(scaleKwh(report.weekly.consumptionKwh, 'daily'), report.weekly.consumptionKwh / 7),
  'daily = weekly / 7',
)
assert(
  almostEqual(scaleKwh(report.weekly.consumptionKwh, 'fortnightly'), report.weekly.consumptionKwh * 2),
  'fortnightly = weekly * 2',
)

// Published hours from context/Appliance_Usage_Reference.docx reach the model.
assert(almostEqual(hoursFor(report, 'tv'), 17.15), 'TV should use the Nielsen 17.15 h/week figure')
assert(almostEqual(hoursFor(report, 'dishwasher'), 12.375), 'dishwasher should use 2.25 h x 5.5 cycles')
assert(almostEqual(hoursFor(report, 'washer'), 4.0785), 'washer should use 220 loads a year at 58 min')
assert(almostEqual(hoursFor(report, 'monitor'), 44.1), 'monitor should use 6.3 h/day')

// Saved dryer counts beat the published per-person average.
assert(almostEqual(hoursFor(report, 'dryer'), 3 * 0.90167), 'three saved loads should convert at 54.1 min each')
const noDryerCounts = buildKpiReport({ ...baseline, dryerWeek: '', dryerWeekend: '' }, data, JAN)
assert(
  almostEqual(hoursFor(noDryerCounts, 'dryer'), 0.747 * 3),
  'without saved counts the dryer falls back to 0.747 h/week per person',
)

// Season decides whether heating or cooling hours are charged.
const electricClimate: ProfileData = { ...baseline, heating: 'electric', cooling: 'air_conditioning' }
const summer = buildKpiReport(electricClimate, data, JAN)
const winter = buildKpiReport(electricClimate, data, JUL)
const spring = buildKpiReport(electricClimate, data, SEP)
assert(summer.season === 'summer' && winter.season === 'winter' && spring.season === 'spring', 'AU seasons')
assert(almostEqual(hoursFor(summer, 'aircon'), 42), 'summer runs the full 6 h/day air conditioner figure')
assert(hoursFor(summer, 'heater') === 0, 'no electric heating charged in summer')
assert(almostEqual(hoursFor(winter, 'heater'), 30.8), 'winter runs the full 4.4 h/day heater figure')
assert(hoursFor(winter, 'aircon') === 0, 'no air conditioning charged in winter')
assert(almostEqual(hoursFor(spring, 'aircon'), 21), 'shoulder seasons keep half the peak hours')
assert(almostEqual(hoursFor(spring, 'heater'), 15.4), 'shoulder seasons keep half the peak hours')

// power_kw is now the average draw while in use, not a nameplate rating.
// The old nameplate values gave 322 kWh/week for a fridge and 80 for an AC.
const fridge = lineFor(report, 'refrigerator')
assert(fridge.weeklyKwh / fridge.units < 12, 'one refrigerator should land near 9.6 kWh a week')
assert(lineFor(summer, 'aircon').weeklyKwh < 50, 'summer air conditioning should land near 42 kWh a week')
assert(lineFor(winter, 'heater').weeklyKwh < 45, 'winter heating should land near 37 kWh a week')

// The day curve only reshapes energy; it must not create or lose any.
const day = buildTypicalDay(report.periods)
assert(day.length === 24, 'a typical day has 24 points')
const daySolar = day.reduce((sum, point) => sum + point.solarKwh, 0)
const dayLoad = day.reduce((sum, point) => sum + point.loadKwh, 0)
assert(almostEqual(daySolar, report.weekly.generationKwh / 7, 0.01), 'day curve conserves solar')
assert(almostEqual(dayLoad, report.weekly.consumptionKwh / 7, 0.01), 'day curve conserves load')
assert(day[2].solarKwh === 0, 'no solar generated at 2am')

const modelled = buildKpiReport({ ...baseline, monthlyKwh: '' }, data, SEP)
assert(modelled.consumptionKind === 'estimate', 'no billed kWh means an estimate')
assert(
  modelled.weekly.consumptionKwh > 20 && modelled.weekly.consumptionKwh < 250,
  `modelled week should be plausible, got ${modelled.weekly.consumptionKwh.toFixed(1)} kWh`,
)

const noSolar: ProfileData = { ...baseline, hasSolar: 'no', panelCount: '', panelWatts: '' }
const potential = buildKpiReport(noSolar, data, JAN)
assert(potential.solarIsPotential, 'no solar should show potential')
assert(potential.weekly.generationKwh > report.weekly.generationKwh, 'typical 6.6 kW potential should exceed 4.8 kW south array')

const edited: ProfileData = { ...baseline, monthlyKwh: '800' }
const updated = buildKpiReport(edited, data, JAN)
assert(updated.weekly.consumptionKwh > report.weekly.consumptionKwh, 'editing usage should change the report')

const atMaxBattery: ProfileData = { ...baseline, batteryUnits: 8 }
const absurdBattery: ProfileData = { ...baseline, batteryUnits: 999 }
const atMaxSavings = buildKpiReport(atMaxBattery, data, JAN).weekly.savingsAud
const absurdSavings = buildKpiReport(absurdBattery, data, JAN).weekly.savingsAud
assert(
  almostEqual(absurdSavings, atMaxSavings),
  'battery_units above the form max must not inflate savings',
)
const negativeBattery = buildKpiReport({ ...baseline, batteryUnits: -5 }, data, JAN)
assert(
  negativeBattery.weekly.savingsAud <= report.weekly.savingsAud + 0.05,
  'negative battery_units must not increase savings',
)

assert(
  nearestMappedPostcode(-37.806, 145.031, 25) === '3101',
  'Kew GPS should snap to 3101 on-device',
)
assert(
  nearestMappedPostcode(-33.8688, 151.2093, 25) === null,
  'Sydney GPS must not snap to a Victorian suburb',
)
assert(
  nearestMappedPostcode(-37.56, 143.85, 25) === '3350',
  'Ballarat GPS should snap to 3350 on-device',
)

const vppAssumption = report.assumptions.find((item) => item.title === 'VPP credit')
assert(vppAssumption?.kind === 'sample', 'sample VPP rates must not be labelled sourced')
assert(
  vppAssumption?.detail.includes('placeholder'),
  'VPP credit copy must say the rates are placeholders',
)
assert(
  report.assumptions.find((item) => item.title === 'Timeframes')?.kind === 'estimate',
  'timeframe arithmetic is not sourced plan terms',
)

console.log('kpi self-test passed', {
  seasonToday: currentSeason(),
  weeklyKwh: report.weekly.consumptionKwh.toFixed(1),
  modelledWeeklyKwh: modelled.weekly.consumptionKwh.toFixed(1),
  generation: report.weekly.generationKwh.toFixed(1),
  savings: report.weekly.savingsAud.toFixed(2),
  distributed: report.weekly.energyDistributedKwh.toFixed(1),
  carbonKg: report.weekly.carbonAvoidedKg.toFixed(1),
  leftoverWindowHours: leftoverHours(day).length,
  recommended: report.recommended.plan.name,
})
