/**
 * Dev-time assertions for VPP suggestion matching. Run via
 * `npx tsx src/lib/vppSuggestions.selftest.ts` from frontend/.
 */
import { emptyProfile, type ProfileData } from '../types/profile'
import type { VppSuggestionPlan } from './methodologyApi'
import {
  EXAMPLE_KWH,
  compactCardFacts,
  householdControlScore,
  illustrativePayment,
  isTermStale,
  matchSuggestionPlans,
  planFitCopy,
  regionFromPostcode,
  reserveHeadroomKwh,
  safeProviderUrl,
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

assert(!isTermStale('2026-09-14', new Date('2026-09-14T00:00:00')), 'same-day terms are not stale')
assert(
  isTermStale('2026-01-01', new Date('2026-09-14T00:00:00')),
  'terms older than 90 days are stale',
)

const noticePlan: VppSuggestionPlan = {
  ...agl,
  id: 'notice-plan',
  brand: 'Origin Energy',
  terms: agl.terms.map((term) =>
    term.key === 'opt_out' ? { ...term, valueText: 'Give 20 business days’ notice to leave.' } : term,
  ),
}
assert(
  householdControlScore(agl) > householdControlScore(noticePlan),
  'leave-anytime must rank above a notice period, without using payment',
)

const facts = compactCardFacts(agl, 10.8)
assert(facts.some((fact) => fact.label === 'Opt Out' && fact.value === 'Anytime'), 'opt-out is a short chip')
assert(facts.some((fact) => fact.label === 'Reserve' && fact.value === '20% kept'), 'reserve is a short chip')
assert(
  facts.some((fact) => fact.label === 'Discharge Limit' && fact.value === '250 kWh/yr'),
  'event cap is a short chip',
)

const aglFit = planFitCopy(teslaVic, teslaMatch.matches[0])
assert(aglFit.why.some((line) => line.includes('Tesla Powerwall 2')), 'why names the household battery')
assert(aglFit.why.some((line) => /Victoria/.test(line)), 'why names the region')
assert(aglFit.why.some((line) => /leave at any time/i.test(line)), 'why mentions leave-anytime')
assert(
  aglFit.tradeoffs.some((line) => /cannot pick those times/i.test(line)),
  'trade-off states the provider controls dispatch',
)
assert(
  !/\$|saving|bonus|credit/i.test([...aglFit.why, ...aglFit.tradeoffs].join(' ')),
  'fit copy must not use payment figures',
)

const noticeFit = planFitCopy(teslaVic, {
  plan: noticePlan,
  reserveHeadroomKwh: 10.8,
})
assert(
  noticeFit.tradeoffs.some((line) => /notice period/i.test(line)),
  'notice plans list leaving delay as a trade-off',
)

// R20: outbound provider links must be gated by the domain allow-list.
assert(
  safeProviderUrl('https://www.agl.com.au/solar-batteries/batteries/virtual-power-plant') ===
    'https://www.agl.com.au/solar-batteries/batteries/virtual-power-plant',
  'an allow-listed https provider host is returned unchanged',
)
assert(
  safeProviderUrl('https://agl.com.au/') === 'https://agl.com.au/',
  'the bare allow-listed domain (no subdomain) is accepted',
)
assert(
  safeProviderUrl('https://evil.example.com/agl.com.au') === null,
  'a non-allow-listed host is rejected even when it mentions an allowed domain',
)
assert(
  safeProviderUrl('https://not-agl.com.au/') === null,
  'a lookalike host that merely ends with the allowed suffix without a dot boundary is rejected',
)
assert(
  safeProviderUrl('https://agl.com.au.evil.example/') === null,
  'an allow-listed domain used as a subdomain of an attacker host is rejected',
)
assert(
  safeProviderUrl('http://www.agl.com.au/') === null,
  'non-https provider links are rejected even on an allow-listed host',
)
assert(
  safeProviderUrl('javascript:alert(1)') === null,
  'a javascript: URL is rejected, not just filtered by host',
)
assert(safeProviderUrl('not a url') === null, 'a malformed URL is rejected without throwing')

console.log('vpp suggestion self-test passed')
