import { describe, expect, it } from 'vitest'

import { BASELINE_PROFILE } from '../../data/baselines'
import { emptyProfile, type ProfileData } from '../../types/profile'
import { seedMethodologyBundle } from '../methodologyFixture'
import { bestSolarDirection, buildWhatIfSuggestions } from './whatIfSuggestions'

const bundle = seedMethodologyBundle()

function profile(overrides: Partial<ProfileData> = {}): ProfileData {
  return {
    ...emptyProfile(),
    ...BASELINE_PROFILE,
    fieldSources: {},
    lastUpdated: null,
    ...overrides,
  }
}

describe('bestSolarDirection', () => {
  it('picks the strongest compiled direction', () => {
    expect(bestSolarDirection(bundle.orientationFactors)).toBe('N')
  })
})

describe('buildWhatIfSuggestions', () => {
  it('recommends pointing south-facing panels north', () => {
    const suggestions = buildWhatIfSuggestions(profile({ solarDirection: 'S' }), bundle)
    const direction = suggestions.find((item) => item.id === 'direction')
    expect(direction?.apply.direction).toBe('N')
    expect(direction?.tab).toBe('solar')
  })

  it('skips direction when the draft is already on the strongest heading', () => {
    const suggestions = buildWhatIfSuggestions(profile({ solarDirection: 'N' }), bundle)
    expect(suggestions.some((item) => item.id === 'direction')).toBe(false)
  })

  it('recommends one more panel when solar is on', () => {
    const suggestions = buildWhatIfSuggestions(profile({ panelCount: '12' }), bundle)
    const panel = suggestions.find((item) => item.id === 'panel')
    expect(panel?.apply.panelCount).toBe('13')
  })

  it('recommends a listed battery when the current model has no VPP match', () => {
    const suggestions = buildWhatIfSuggestions(profile({ batteryModel: 'Not sure' }), bundle)
    const battery = suggestions.find((item) => item.id === 'battery')
    expect(battery?.apply.battery).toBeTruthy()
    expect(battery?.tab).toBe('battery')
  })

  it('does not suggest appliance cuts when billed monthly kWh is set', () => {
    const suggestions = buildWhatIfSuggestions(
      profile({ dishwasherCyclesPerWeek: '10', washerCyclesPerWeek: '10', monthlyKwh: '540' }),
      bundle,
    )
    expect(suggestions.some((item) => item.id === 'dishwasher' || item.id === 'washer')).toBe(false)
  })
})
