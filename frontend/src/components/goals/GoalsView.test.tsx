/**
 * @vitest-environment jsdom
 *
 * Screen tests for the Goals tab (US8.1 AC2 to AC6).
 *
 * Rendered with the seeded methodology bundle, so no request is made.
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { EMISSIONS_FACTOR_SOURCE, GOALS_STORAGE_KEY } from '../../constants/goals'
import { REASON_MESSAGES } from '../../constants/goalMessages'
import { BASELINE_PROFILE } from '../../data/baselines'
import { suggestGoals } from '../../lib/goals/goalSetup'
import { seedMethodologyBundle } from '../../lib/methodologyFixture'
import type { MonthRecord } from '../../types/goals'
import { emptyProfile, type ProfileData } from '../../types/profile'
import { GoalsView } from './GoalsView'

const bundle = seedMethodologyBundle()
const SET_ON = '2026-10-01T00:00:00.000Z'

function savedProfile(overrides: Partial<ProfileData> = {}): ProfileData {
  return { ...emptyProfile(), ...BASELINE_PROFILE, lastUpdated: SET_ON, ...overrides }
}

type ViewOptions = {
  profile?: ProfileData
  bundleLoaded?: boolean
  methodologyError?: string
}

function renderView({ profile = savedProfile(), bundleLoaded = true, methodologyError = '' }: ViewOptions = {}) {
  const handlers = { onOpenProfile: vi.fn(), onStartSetup: vi.fn(), onLogoClick: vi.fn() }
  const utils = render(
    <GoalsView
      profile={profile}
      bundle={bundleLoaded ? bundle : null}
      methodologyError={methodologyError}
      {...handlers}
    />,
  )
  return { ...utils, ...handlers, user: userEvent.setup() }
}

function savingsInput() {
  return screen.getByLabelText('Savings goal (AUD)')
}

function carbonInput() {
  return screen.getByLabelText('Carbon goal (kg CO2e)')
}

function storedGoals() {
  const raw = localStorage.getItem(GOALS_STORAGE_KEY)
  return raw ? JSON.parse(raw) : null
}

const suggestions = suggestGoals(savedProfile(), bundle)

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
})

describe('first visit with a saved profile (AC2)', () => {
  it('shows both goal fields with labels, the suggestion filled in, and only the allowed range', () => {
    renderView()
    expect(screen.getByRole('heading', { name: 'Set your goals' })).toBeTruthy()
    expect(savingsInput()).toHaveProperty('value', String(suggestions.savings?.suggested))
    expect(carbonInput()).toHaveProperty('value', String(suggestions.carbon?.suggested))
    const described = (savingsInput().getAttribute('aria-describedby') ?? '')
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ')
    expect(described).toBe(
      `Allowed range: $${suggestions.savings?.min.toLocaleString('en-AU')} to $${suggestions.savings?.max.toLocaleString('en-AU')}`,
    )
    expect(screen.queryByText(/How much you would like your battery/)).toBeNull()
  })

  it('explains how the allowed range is worked out, labelled as an estimate', async () => {
    const { user } = renderView()
    const buttons = screen.getAllByRole('button', { name: /How is/ })
    expect(buttons.map((button) => button.textContent)).toEqual([
      'How is the allowed range calculated?',
      'How is carbon calculated?',
    ])
    const toggle = buttons[0]
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    await user.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    const panel = document.getElementById(toggle.getAttribute('aria-controls') ?? '')
    const text = panel?.textContent ?? ''
    expect(text).toContain('Based on your profile estimate')
    expect(text).toContain('Estimate')
    expect(text).toContain(`Lowest: 1 month = $${suggestions.savings?.min.toLocaleString('en-AU')}`)
    expect(text).toContain(
      `Filled in for you: 3 months = $${suggestions.savings?.suggested.toLocaleString('en-AU')}`,
    )
    expect(text).toContain(`Highest: 12 months = $${suggestions.savings?.max.toLocaleString('en-AU')}`)
    expect(text).toContain('not from your battery files')
    await user.click(toggle)
    expect(document.getElementById(toggle.getAttribute('aria-controls') ?? '')).toBeNull()
  })

  it('keeps the upload area locked with a note', () => {
    renderView()
    const upload = screen.getByRole('region', { name: 'Upload your battery file' })
    expect(within(upload).getByText('Upload unlocks after both goals are saved.')).toBeTruthy()
  })
})

describe('worked carbon examples (AC3)', () => {
  it('opens a disclosure with worked examples, the factor source, and one near the suggestion', async () => {
    const { user } = renderView()
    const toggle = screen.getByRole('button', { name: 'How is carbon calculated?' })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    await user.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    const panel = document.getElementById(toggle.getAttribute('aria-controls') ?? '')
    expect(panel).not.toBeNull()
    const text = panel?.textContent ?? ''
    const factor = bundle.methodology.vicGridKgCo2PerKwh
    expect(text).toContain(`10 kWh × ${factor} =`)
    expect(text).toContain(`100 kWh × ${factor} =`)
    expect(text).toContain('close to your suggested carbon goal')
    expect(text).toContain(EMISSIONS_FACTOR_SOURCE.label)
    expect(text).toContain(`Last verified: ${EMISSIONS_FACTOR_SOURCE.lastVerified}`)
  })
})

describe('goal validation (AC4)', () => {
  it.each([
    ['', 'Enter a savings goal.'],
    ['0', 'Enter an amount above zero.'],
    ['-10', 'Enter an amount above zero.'],
    ['ten', 'Enter a number only'],
    ['999999', 'This is above the allowed range.'],
  ])('shows an error beside the field for %j and does not save', async (raw, message) => {
    const { user } = renderView()
    await user.clear(savingsInput())
    if (raw) await user.type(savingsInput(), raw)
    await user.click(screen.getByRole('button', { name: 'Save goals' }))
    const error = screen.getByRole('alert', { name: '' })
    expect(error.textContent).toContain(message)
    expect(error.textContent).not.toContain('Allowed range')
    const described = (savingsInput().getAttribute('aria-describedby') ?? '')
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ')
    expect(described).toContain('Allowed range:')
    expect(savingsInput().getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(savingsInput())
    expect(storedGoals()).toBeNull()
  })

  it('keeps the text typed so nothing is lost while it is fixed', async () => {
    const { user } = renderView()
    await user.clear(savingsInput())
    await user.type(savingsInput(), '250x')
    await user.tab()
    expect(savingsInput()).toHaveProperty('value', '250x')
    expect(screen.getByRole('alert').textContent).toContain('Enter a number only')
    await user.type(savingsInput(), '{Backspace}')
    expect(savingsInput()).toHaveProperty('value', '250')
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('saving, remembering, and editing goals (AC5)', () => {
  it('saves both goals, confirms, shows zero progress, and unlocks upload', async () => {
    const { user } = renderView()
    await user.click(screen.getByRole('button', { name: 'Save goals' }))
    expect(screen.getByText('Your goals are saved on this device.').closest('[role="status"]')).not.toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Your goals' }))
    const bars = screen.getAllByRole('progressbar')
    expect(bars).toHaveLength(2)
    expect(bars[0].getAttribute('aria-valuenow')).toBe('0')
    expect(bars[0].getAttribute('aria-valuetext')).toMatch(/^\$0 of \$[\d,]+, 0 percent$/)
    const upload = screen.getByRole('region', { name: 'Upload your battery file' })
    expect(within(upload).queryByText('Upload unlocks after both goals are saved.')).toBeNull()
    expect(within(upload).getByRole('radiogroup', { name: 'VPP provider' })).toBeTruthy()
    const stored = storedGoals()
    expect(stored.version).toBe(1)
    expect(stored.goals.savings.target).toBe(suggestions.savings?.suggested)
    expect(stored.goals.carbon.target).toBe(suggestions.carbon?.suggested)
  })

  it('shows saved goals again on return without any sign-in', async () => {
    const first = renderView()
    await first.user.click(screen.getByRole('button', { name: 'Save goals' }))
    first.unmount()
    renderView()
    expect(screen.getByRole('heading', { name: 'Your goals' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Set your goals' })).toBeNull()
  })

  it('edits a goal and its percentage without touching history or totals', async () => {
    const month: MonthRecord = {
      month: '2026-09',
      daysInMonth: 30,
      daysCounted: 30,
      coveredRanges: [['2026-09-01', '2026-09-30']],
      savingsAud: 60,
      carbonKg: 40,
      dischargeKwh: 30,
      intakeKwh: 22,
      sourceId: 'generic',
      updatedOn: SET_ON,
    }
    const savingsTarget = suggestions.savings?.suggested ?? 0
    const carbonTarget = suggestions.carbon?.suggested ?? 0
    localStorage.setItem(
      GOALS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        goals: {
          savings: { target: savingsTarget, setOn: SET_ON },
          carbon: { target: carbonTarget, setOn: SET_ON },
        },
        completedGoals: [],
        months: [month],
      }),
    )
    const { user } = renderView()
    const newTarget = suggestions.savings?.max ?? 0
    await user.click(screen.getByRole('button', { name: 'Edit goals' }))
    await user.clear(savingsInput())
    await user.type(savingsInput(), String(newTarget))
    await user.click(screen.getByRole('button', { name: 'Save goals' }))
    expect(screen.getByText('Your goals are updated.').closest('[role="status"]')).not.toBeNull()
    const [savingsBar] = screen.getAllByRole('progressbar')
    expect(savingsBar.getAttribute('aria-valuenow')).toBe(String(Math.round((60 / newTarget) * 100)))
    const stored = storedGoals()
    expect(stored.goals.savings.target).toBe(newTarget)
    expect(stored.goals.savings.setOn).toBe(SET_ON)
    expect(stored.months).toEqual([month])
  })

  it('keeps the original goals when editing is cancelled', async () => {
    const first = renderView()
    await first.user.click(screen.getByRole('button', { name: 'Save goals' }))
    const before = localStorage.getItem(GOALS_STORAGE_KEY)
    await first.user.click(screen.getByRole('button', { name: 'Edit goals' }))
    await first.user.clear(savingsInput())
    await first.user.type(savingsInput(), '5')
    await first.user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(localStorage.getItem(GOALS_STORAGE_KEY)).toBe(before)
    expect(screen.getByRole('heading', { name: 'Your goals' })).toBeTruthy()
  })

  it('shows a message and keeps the form when the device refuses the write', async () => {
    const { user } = renderView()
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    await user.click(screen.getByRole('button', { name: 'Save goals' }))
    spy.mockRestore()
    expect(screen.getByRole('alert').textContent).toBe(REASON_MESSAGES.write_failed)
    expect(screen.getByRole('heading', { name: 'Set your goals' })).toBeTruthy()
  })
})

describe('incomplete profile (AC6)', () => {
  it('lists what is missing, offers Profile, and shows no suggestion', async () => {
    const { user, onOpenProfile } = renderView({ profile: savedProfile({ monthlyBill: '' }) })
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('Average monthly electricity bill')
    expect(screen.queryByLabelText('Savings goal (AUD)')).toBeNull()
    expect(screen.queryByText(/Suggested/)).toBeNull()
    const button = within(alert).getByRole('button', { name: 'Go to Profile' })
    while (document.activeElement !== button) await user.tab()
    await user.keyboard('{Enter}')
    expect(onOpenProfile).toHaveBeenCalledOnce()
  })

  it('sends someone with no profile to setup', async () => {
    const { user, onStartSetup } = renderView({ profile: emptyProfile() })
    await user.click(screen.getByRole('button', { name: 'Set up your profile' }))
    expect(onStartSetup).toHaveBeenCalledOnce()
  })
})

describe('estimate data unavailable', () => {
  it('says estimates are unavailable and shows no form or guess', () => {
    renderView({ bundleLoaded: false, methodologyError: 'Could not reach the API.' })
    expect(screen.getByRole('alert').textContent).toContain('Estimates are unavailable right now')
    expect(screen.queryByLabelText('Savings goal (AUD)')).toBeNull()
  })
})
