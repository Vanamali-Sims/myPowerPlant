import { describe, expect, it } from 'vitest'
import { BASELINE_PROFILE } from '../../data/baselines'
import { emptyProfile, type ProfileData } from '../../types/profile'
import { seedMethodologyBundle } from '../methodologyFixture'
import { buildKpiReport, formatAud, formatKg, formatKwh, scaleAud, scaleKwh } from '../kpis'
import { buildChatReply } from './buildChatReply'
import { matchChatIntent } from './matchChat'

const bundle = seedMethodologyBundle()

function saved(overrides: Partial<ProfileData> = {}): ProfileData {
  return {
    ...emptyProfile(),
    ...BASELINE_PROFILE,
    fieldSources: {},
    lastUpdated: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('matchChatIntent', () => {
  it('maps common energy and plan phrases', () => {
    expect(matchChatIntent('What is my weekly picture?')).toBe('energy_picture')
    expect(matchChatIntent('Which appliances are driving my use?')).toBe('appliances')
    expect(matchChatIntent('Am I ahead or behind?')).toBe('balance')
    expect(matchChatIntent('Which plan is first?')).toBe('plan_first')
    expect(matchChatIntent('What are the reserve terms?')).toBe('plan_terms')
  })

  it('returns null for unknown sentences', () => {
    expect(matchChatIntent('tell me a joke')).toBeNull()
  })
})

describe('buildChatReply', () => {
  it('points to setup when there is no profile', () => {
    const reply = buildChatReply('energy_picture', {
      profile: emptyProfile(),
      hasProfile: false,
      bundle,
      methodologyError: '',
      timeframe: 'weekly',
    })
    expect(reply).toMatch(/profile/i)
    expect(reply).not.toMatch(/\d kWh/)
  })

  it('matches dashboard weekly figures for the energy picture', () => {
    const p = saved()
    const report = buildKpiReport(p, bundle)
    const reply = buildChatReply('energy_picture', {
      profile: p,
      hasProfile: true,
      bundle,
      methodologyError: '',
      timeframe: 'weekly',
    })
    expect(reply).toContain(formatKwh(report.weekly.consumptionKwh))
    expect(reply).toContain(formatKwh(report.weekly.generationKwh))
    expect(reply).toContain(formatKg(report.weekly.carbonAvoidedKg))
    if (report.weekly.generationKwh < report.weekly.consumptionKwh) {
      expect(reply).toMatch(/Net energy cost/)
    } else {
      expect(reply).toMatch(/Estimated savings/)
    }
  })

  it('names the first matched plan', () => {
    const p = saved({ batteryModel: 'Tesla Powerwall 2', postcode: '3101' })
    const reply = buildChatReply('plan_first', {
      profile: p,
      hasProfile: true,
      bundle,
      methodologyError: '',
      timeframe: 'weekly',
    })
    expect(reply).toMatch(/Top match:/)
    expect(reply).toMatch(/not a guaranteed return/i)
  })
})
