import { describe, expect, it } from 'vitest'
import { BASELINE_PROFILE } from '../../data/baselines'
import { emptyProfile, type ProfileData } from '../../types/profile'
import { seedMethodologyBundle } from '../methodologyFixture'
import type { MethodologyBundle, VppSuggestionPlan } from '../methodologyApi'
import { buildKpiReport, formatKg, formatKwh } from '../kpis'
import { applyProfilePatch } from './applyProfilePatch'
import { buildChatReply } from './buildChatReply'
import { buildProfileDisplayReply } from './buildProfileDisplayReply'
import { matchChat, matchChatIntent, parseNavigateTarget, parseTimeframe } from './matchChat'
import { parseProfilePatch } from './parseProfilePatch'

const bundle = seedMethodologyBundle()

const samplePlan: VppSuggestionPlan = {
  id: 'agl-byo-battery',
  brand: 'AGL Energy',
  name: 'AGL Bring Your Own Battery',
  href: 'https://www.agl.com.au/',
  illustrativeRatePerKwh: 1,
  approvedBatteries: ['Tesla Powerwall 2'],
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

const bundleWithPlans: MethodologyBundle = {
  ...bundle,
  vppSuggestionPlans: [samplePlan],
}

function saved(overrides: Partial<ProfileData> = {}): ProfileData {
  return {
    ...emptyProfile(),
    ...BASELINE_PROFILE,
    fieldSources: {},
    lastUpdated: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

function chatCtx(overrides: Partial<Parameters<typeof buildChatReply>[1]> = {}) {
  return {
    profile: emptyProfile(),
    hasProfile: false,
    bundle,
    methodologyError: '',
    timeframe: 'weekly' as const,
    eventType: 'discharge' as const,
    reminderPeriodDays: '7',
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
    expect(matchChatIntent('Which reminder days?')).toBe('reminder_days')
    expect(matchChatIntent('Download the calendar')).toBe('download_calendar')
  })

  it('maps navigation, timeframe, profile, and reset phrases', () => {
    expect(matchChat('Open reminders')?.intent).toBe('navigate')
    expect(parseNavigateTarget('go to dashboard')).toBe('dashboard')
    expect(matchChatIntent('Switch to daily view')).toBe('set_timeframe')
    expect(parseTimeframe('switch to weekly view')).toBe('weekly')
    expect(matchChatIntent('Show my profile')).toBe('profile_display')
    expect(matchChatIntent('Change my postcode to 3121')).toBe('set_profile')
    expect(matchChatIntent('Reset my profile')).toBe('reset_profile')
  })

  it('returns null for unknown sentences', () => {
    expect(matchChatIntent('tell me a joke')).toBeNull()
  })

  it('maps change rooms to a set_profile patch', () => {
    expect(matchChatIntent('change rooms to 5')).toBe('set_profile')
    const match = matchChat('change rooms to 5')
    expect(match?.intent).toBe('set_profile')
    if (match?.intent === 'set_profile') {
      expect(match.patch.rooms).toBe('5')
    }
  })
})

describe('applyProfilePatch', () => {
  it('rejects a non-Victorian postcode with the wizard message', () => {
    const result = applyProfilePatch(saved(), { postcode: '2000' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toMatch(/Victorian postcode/i)
  })

  it('accepts a valid postcode patch', () => {
    const result = applyProfilePatch(saved(), { postcode: '3121' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.profile.postcode).toBe('3121')
  })
})

describe('buildChatReply', () => {
  it('points to setup when there is no profile', () => {
    const reply = buildChatReply('energy_picture', chatCtx())
    expect(reply).toMatch(/profile/i)
    expect(reply).not.toMatch(/\d kWh/)
  })

  it('reports methodology failure without inventing figures', () => {
    const reply = buildChatReply(
      'energy_picture',
      chatCtx({ profile: saved(), hasProfile: true, methodologyError: 'Offline', bundle: null }),
    )
    expect(reply).toMatch(/could not be loaded/i)
    expect(reply).not.toMatch(/\d kWh/)
  })

  it('matches dashboard weekly figures for the energy picture', () => {
    const p = saved()
    const report = buildKpiReport(p, bundle)
    const reply = buildChatReply('energy_picture', chatCtx({ profile: p, hasProfile: true }))
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
    const p = saved()
    const reply = buildChatReply(
      'plan_first',
      chatCtx({ profile: p, hasProfile: true, bundle: bundleWithPlans }),
    )
    expect(reply).toMatch(/Top match:/)
    expect(reply).toMatch(/not a guaranteed return/i)
  })
})

describe('buildProfileDisplayReply', () => {
  it('uses profile screen labels only', () => {
    const p = saved({ postcode: '3121' })
    const reply = buildProfileDisplayReply(p)
    expect(reply).toContain('Postcode: 3121')
    expect(parseProfilePatch('show my profile')).toBeNull()
  })
})
