/**
 * @vitest-environment jsdom
 *
 * Unit tests for the improve-setup questions, and for the one shared profile
 * that both flows save to with their own timestamp.
 */
import { beforeEach, describe, expect, it } from 'vitest'

import { BASELINE_PROFILE } from '../data/baselines'
import { emptyProfile, type ProfileData } from '../types/profile'
import { seedMethodologyBundle } from './methodologyFixture'
import {
  VPP_NOT_LISTED,
  finishImproveProfile,
  resetImproveAnswers,
  vppProviderOptions,
  hasImproveAnswers,
  isImproveReady,
  prefilledFromExplore,
  validateImproveStep,
} from './improveProfile'
import { loadProfile, saveProfile } from './profileStorage'

function complete(overrides: Partial<ProfileData> = {}): ProfileData {
  return { ...emptyProfile(), ...BASELINE_PROFILE, vppProvider: 'Tesla Energy Plan', ...overrides }
}

beforeEach(() => {
  localStorage.clear()
})

describe('required questions', () => {
  it('is ready when all eight required answers are valid', () => {
    expect(isImproveReady(complete())).toBe(true)
  })

  it.each([
    ['vppProvider', 'home', { vppProvider: '' }],
    ['postcode', 'home', { postcode: '2000' }],
    ['people', 'home', { people: '' }],
    ['monthlyKwh', 'home', { monthlyKwh: '' }],
    ['panelCount', 'solar', { panelCount: '' }],
    ['solarDirection', 'solar', { solarDirection: '' }],
    ['batteryModel', 'battery', { batteryModel: '' }],
    ['reservePercent', 'battery', { reservePercent: '95' }],
  ] as const)('needs %s', (field, step, overrides) => {
    const profile = complete(overrides as Partial<ProfileData>)
    expect(validateImproveStep(step, profile)[field]).toBeTruthy()
    expect(isImproveReady(profile)).toBe(false)
  })

  it('lets bill, panel rating, and battery units stay empty, but checks them when given', () => {
    expect(isImproveReady(complete({ monthlyBill: '', panelWatts: '' }))).toBe(true)
    expect(validateImproveStep('home', complete({ monthlyBill: '999999' })).monthlyBill).toBeTruthy()
    expect(validateImproveStep('solar', complete({ panelWatts: '5' })).panelWatts).toBeTruthy()
  })
})

describe('answers from the explore form', () => {
  it('counts as prefilled when the explore form saved answers and the improve form has not', () => {
    const explore = { ...complete({ vppProvider: '' }), lastUpdated: '2026-10-01T00:00:00.000Z' }
    expect(hasImproveAnswers(explore)).toBe(true)
    expect(isImproveReady(explore)).toBe(false)
    expect(prefilledFromExplore(explore)).toBe(true)
    expect(prefilledFromExplore({ ...explore, improveUpdated: '2026-10-02T00:00:00.000Z' })).toBe(false)
    expect(prefilledFromExplore(emptyProfile())).toBe(false)
  })

  it('turns solar on and marks the asked answers as the person’s own', () => {
    const finished = finishImproveProfile(complete({ hasSolar: '' }))
    expect(finished.hasSolar).toBe('yes')
    expect(finished.fieldSources.vppProvider).toBe('user')
    expect(finished.fieldSources.monthlyKwh).toBe('user')
  })
})

describe('one profile, a timestamp per flow', () => {
  it('stamps only the saving flow, and keeps the VPP provider', () => {
    const improve = saveProfile(complete(), 'improve')
    expect(improve.improveUpdated).not.toBeNull()
    expect(improve.lastUpdated).toBeNull()
    const explore = saveProfile({ ...improve, people: '4' })
    expect(explore.lastUpdated).not.toBeNull()
    expect(explore.improveUpdated).toBe(improve.improveUpdated)
    expect(loadProfile()).toMatchObject({ people: '4', vppProvider: 'Tesla Energy Plan' })
  })

  it('caps a long VPP provider name and strips control characters', () => {
    const saved = saveProfile(complete({ vppProvider: `  ${'x'.repeat(80)}\u0000 ` }), 'improve')
    expect(saved.vppProvider).toBe('x'.repeat(60))
  })
})

describe('VPP list and reset', () => {
  it('lists each Plans brand once, A to Z, and nothing before plans load', () => {
    const brands = vppProviderOptions(seedMethodologyBundle())
    expect(brands).toEqual([...new Set(brands)].sort((a, b) => a.localeCompare(b)))
    expect(brands).not.toContain(VPP_NOT_LISTED)
    expect(vppProviderOptions(null)).toEqual([])
  })

  it('clears every improve answer when the explore form was never saved', () => {
    const reset = resetImproveAnswers({ ...complete(), improveUpdated: '2026-10-02T00:00:00.000Z' })
    expect(reset).toMatchObject({ vppProvider: '', postcode: '', panelCount: '', batteryModel: '', improveUpdated: null })
    expect(hasImproveAnswers(reset)).toBe(false)
  })

  it('keeps the explore answers and clears only the VPP when the explore form was saved', () => {
    const reset = resetImproveAnswers({
      ...complete(),
      lastUpdated: '2026-10-01T00:00:00.000Z',
      improveUpdated: '2026-10-02T00:00:00.000Z',
    })
    expect(reset).toMatchObject({ vppProvider: '', postcode: '3101', improveUpdated: null })
    expect(prefilledFromExplore(reset)).toBe(true)
  })
})
