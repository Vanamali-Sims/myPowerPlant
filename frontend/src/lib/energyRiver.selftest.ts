/**
 * Dev-time assertions for the energy-balance model. Run via
 * `npx tsx src/lib/energyRiver.selftest.ts` from the frontend folder.
 */
import { BASELINE_PROFILE } from '../data/baselines'
import { emptyProfile, type ProfileData } from '../types/profile'
import { buildEnergyRiver, formatShare, riverForkStage, riverPeriod } from './energyRiver'
import { buildKpiReport } from './kpis'
import { seedMethodologyBundle } from './methodologyFixture'

function assert(condition: unknown, message: string): asserts condition {
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

const data = seedMethodologyBundle()
const jan = new Date('2026-01-15T00:00:00')
const report = buildKpiReport(baseline, data, jan)
const feedIn = data.methodology.defaultFeedInRate

const surplusProfile: ProfileData = { ...baseline, monthlyKwh: '40' }
const surplusReport = buildKpiReport(surplusProfile, data, jan)
const surplus = buildEnergyRiver({
  report: surplusReport,
  timeframe: 'weekly',
  feedInRate: feedIn,
})
assert(surplus.fork === 'surplus', 'a small billed load against solar should be leftover')
assert(surplus.forkKwh > 0, 'surplus homes expose leftover kWh')
assert(
  almostEqual(surplus.forkValueAud, surplus.forkKwh * surplusReport.recommended.plan.exportRate),
  'surplus dollars are leftover × the sample VPP export rate',
)
assert(
  almostEqual(surplus.feedInValueAud, surplus.forkKwh * feedIn),
  'feed-in comparison is leftover × the standard feed-in rate',
)
assert(
  almostEqual(surplus.share, surplus.forkKwh / surplus.generatedKwh),
  'surplus share is leftover ÷ generation',
)
assert(surplus.coveredKwh === surplus.usedKwh, 'surplus covered kWh is the house use')

const deficitProfile: ProfileData = { ...baseline, monthlyKwh: '800' }
const deficitReport = buildKpiReport(deficitProfile, data, jan)
const deficit = buildEnergyRiver({
  report: deficitReport,
  timeframe: 'weekly',
  feedInRate: feedIn,
})
assert(deficit.fork === 'deficit', 'a large billed load should be a shortfall')
assert(deficit.forkKwh > 0, 'deficit homes expose a gap in kWh')
assert(
  almostEqual(deficit.forkValueAud, deficit.forkKwh * deficitReport.retailRate),
  'deficit dollars are the gap × the retail rate',
)
assert(
  almostEqual(deficit.share, deficit.forkKwh / deficit.usedKwh),
  'deficit share is the gap ÷ use',
)
assert(deficit.coveredKwh === deficit.generatedKwh, 'deficit covered kWh is the roof output')
assert(formatShare(0.54) === '54%', 'share formats as a whole percent')
assert(riverPeriod('weekly') === 'This week', 'weekly eyebrow is This week')
assert(
  almostEqual(surplus.annualValueAud, surplus.forkValueAud * 52),
  'annual savings are weekly VPP dollars × 52 on weekly view',
)

const evenGen = report.weekly.generationKwh
const balancedProfile: ProfileData = {
  ...baseline,
  monthlyKwh: String(evenGen * 4),
}
const balancedReport = buildKpiReport(balancedProfile, data, jan)
const balanced = buildEnergyRiver({
  report: balancedReport,
  timeframe: 'weekly',
  feedInRate: feedIn,
})
assert(balanced.fork === 'balanced', 'matching generation and use should break even')
assert(balanced.forkKwh === 0, 'break-even has no leftover or gap')
assert(balanced.forkValueAud === 0, 'break-even has no VPP dollar on the fork')
assert(balanced.share === 0, 'break-even has no VPP share')

const daily = buildEnergyRiver({ report: surplusReport, timeframe: 'daily', feedInRate: feedIn })
assert(almostEqual(daily.generatedKwh, surplus.generatedKwh / 7), 'daily generation is weekly ÷ 7')
assert(almostEqual(daily.forkKwh, surplus.forkKwh / 7), 'daily leftover is weekly ÷ 7')
assert(almostEqual(daily.annualValueAud, surplus.annualValueAud), 'annual savings ignore the timeframe toggle')

assert(riverForkStage('surplus').eyebrow === 'Possible discharge', 'surplus third stage is discharge')
assert(riverForkStage('deficit').eyebrow === 'Possible borrow', 'deficit third stage is borrow')

const fromReport = buildEnergyRiver({ report, timeframe: 'weekly', feedInRate: feedIn })
assert(fromReport.coveredKwh === Math.min(fromReport.generatedKwh, fromReport.usedKwh), 'covered is the overlap')

console.log('energy-river self-test passed', {
  baselineFork: fromReport.fork,
  surplusKwh: surplus.forkKwh.toFixed(1),
  deficitKwh: deficit.forkKwh.toFixed(1),
  surplusAud: surplus.forkValueAud.toFixed(2),
})
