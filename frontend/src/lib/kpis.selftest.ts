/**
 * Dev-time assertions for buildKpiReport. Run via `npx tsx src/lib/kpis.selftest.ts`
 * from the frontend folder when changing the KPI model.
 */
import { BASELINE_PROFILE } from '../data/baselines'
import { emptyProfile, type ProfileData } from '../types/profile'
import { buildKpiReport, scaleKwh } from './kpis'

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

function almostEqual(a: number, b: number, epsilon = 0.05) {
  return Math.abs(a - b) <= epsilon
}

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

const report = buildKpiReport(baseline)

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
  almostEqual(scaleKwh(report.weekly.consumptionKwh, 'monthly'), report.weekly.consumptionKwh * 4),
  'monthly = weekly * 4',
)

const noSolar: ProfileData = { ...baseline, hasSolar: 'no', panelCount: '', panelWatts: '' }
const potential = buildKpiReport(noSolar)
assert(potential.solarIsPotential, 'no solar should show potential')
assert(potential.weekly.generationKwh > report.weekly.generationKwh, 'typical 6.6 kW potential should exceed 4.8 kW south array')

const edited: ProfileData = { ...baseline, monthlyKwh: '800' }
const updated = buildKpiReport(edited)
assert(updated.weekly.consumptionKwh > report.weekly.consumptionKwh, 'editing usage should change the report')

console.log('kpi self-test passed', {
  weeklyKwh: report.weekly.consumptionKwh.toFixed(1),
  generation: report.weekly.generationKwh.toFixed(1),
  savings: report.weekly.savingsAud.toFixed(2),
  distributed: report.weekly.energyDistributedKwh.toFixed(1),
  recommended: report.recommended.plan.name,
})
