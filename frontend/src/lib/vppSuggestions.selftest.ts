/**
 * Dev-time assertions for VPP suggestion matching. Run via
 * `npx tsx src/lib/vppSuggestions.selftest.ts` from frontend/.
 */
import { emptyProfile, type ProfileData } from '../types/profile'
import type { VppSuggestionPlan } from './methodologyApi'
import {
  EXAMPLE_KWH,
  illustrativePayment,
  matchSuggestionPlans,
  regionFromPostcode,
  reserveHeadroomKwh,
} from './vppSuggestions'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const models = [
  { name: 'Tesla Powerwall 2', usableKwh: 13.5, isDefault: false },
  { name: 'Sungrow SBR HV', usableKwh: 12.8, isDefault: false },
]

const agl: VppSuggestionPlan = {
  id: 'agl-byo-battery',
  brand: 'AGL Energy',
  name: 'AGL Bring Your Own Battery',
  href: 'https://www.agl.com.au/',
  illustrativeRatePerKwh: 1,
  approvedBatteries: ['Tesla Powerwall 2', 'Sungrow SBR HV'],
  eligibleRegions: ['VIC'],
  terms: [
    {
      key: 'reserve_min',
      valueText: '20% reserved for the home.',
      numericValue: 0.2,
      sourceLabel: 'SolarQuotes',
      lastVerified: '2026-09-14',
    },
    {
      key: 'event_cap',
      valueText: 'Capped at 250 kWh per year.',
      numericValue: null,
      sourceLabel: 'SolarQuotes',
      lastVerified: '2026-09-14',
    },
    {
      key: 'opt_out',
      valueText: 'Leave at any time.',
      numericValue: null,
      sourceLabel: 'SolarQuotes',
      lastVerified: '2026-09-14',
    },
    {
      key: 'payment',
      valueText: '$1 per kWh during eligible events.',
      numericValue: null,
      sourceLabel: 'SolarQuotes',
      lastVerified: '2026-09-14',
    },
  ],
}

const diamond: VppSuggestionPlan = {
  ...agl,
  id: 'diamond-wattbank',
  brand: 'Diamond Energy',
  name: 'WATTBANK',
  approvedBatteries: ['Sungrow SBR HV'],
  illustrativeRatePerKwh: 0.3,
}

const teslaVic: ProfileData = {
  ...emptyProfile(),
  postcode: '3101',
  batteryModel: 'Tesla Powerwall 2',
  batteryUnits: 1,
  lastUpdated: '2026-09-14T00:00:00.000Z',
}

assert(regionFromPostcode('3101') === 'VIC', 'Kew is VIC')
assert(regionFromPostcode('2000') === null, 'Sydney is not VIC')

const teslaMatch = matchSuggestionPlans(teslaVic, [agl, diamond], models)
assert(teslaMatch.matches.length === 1, 'Tesla must not see Diamond')
assert(teslaMatch.matches[0].plan.id === 'agl-byo-battery', 'Tesla matches AGL')
assert(teslaMatch.emptyReason === null, 'Tesla Kew should match')

const unsure = matchSuggestionPlans(
  { ...teslaVic, batteryModel: 'Not sure' },
  [agl, diamond],
  models,
)
assert(unsure.matches.length === 0, 'Not sure must not list every plan')
assert(unsure.emptyReason === 'battery', 'Not sure is a battery miss')

const nsw = matchSuggestionPlans({ ...teslaVic, postcode: '2000' }, [agl], models)
assert(nsw.matches.length === 0 && nsw.emptyReason === 'region', 'NSW is excluded')

const headroom = reserveHeadroomKwh(teslaVic, agl, models)
assert(headroom != null && Math.abs(headroom - 13.5 * 0.8) < 0.01, 'headroom is 80% of 13.5')

assert(illustrativePayment(1, EXAMPLE_KWH) === 10, '10 kWh at $1 is $10')
assert(illustrativePayment(null, EXAMPLE_KWH) === null, 'no rate means no dollar example')

console.log('vpp suggestion self-test passed')
