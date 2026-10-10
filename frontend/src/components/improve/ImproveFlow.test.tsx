/**
 * @vitest-environment jsdom
 *
 * Screen tests for the improve-setup flow: home, the access-features form,
 * answers shared with the explore flow, the improve-flow profile, and the
 * What if household changes.
 *
 * App renders with fetch stubbed to fail, so nothing leaves the test. Views
 * that need methodology data are rendered on their own with the seeded bundle.
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../App'
import { GOALS_STORAGE_KEY } from '../../constants/goals'
import { BASELINE_PROFILE } from '../../data/baselines'
import { loadGoals } from '../../lib/goals/goalsStorage'
import { vppProviderOptions } from '../../lib/improveProfile'
import { saveJourney } from '../../lib/journeyStorage'
import { seedMethodologyBundle } from '../../lib/methodologyFixture'
import { loadProfile, saveProfile } from '../../lib/profileStorage'
import { addReminders, loadReminders } from '../../lib/reminderStorage'
import { emptyProfile, type ProfileData } from '../../types/profile'
import { WhatIfView } from '../whatif/WhatIfView'
import { ImproveProfileView } from './ImproveProfileView'

const bundle = seedMethodologyBundle()
const SET_ON = '2026-10-01T00:00:00.000Z'

function ready(overrides: Partial<ProfileData> = {}): ProfileData {
  return { ...emptyProfile(), ...BASELINE_PROFILE, vppProvider: 'Tesla Energy Plan', ...overrides }
}

function renderApp() {
  saveJourney('rain')
  render(<App />)
  return userEvent.setup()
}

function rail() {
  return within(screen.getByRole('complementary', { name: 'App' }))
}

beforeAll(() => {
  // What if draws its energy flow with SVG path lengths, which jsdom does not measure.
  if (!('getTotalLength' in SVGElement.prototype)) {
    Object.defineProperty(SVGElement.prototype, 'getTotalLength', { value: () => 100, configurable: true })
    Object.defineProperty(SVGElement.prototype, 'getPointAtLength', {
      value: () => ({ x: 0, y: 0 }),
      configurable: true,
    })
  }
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '')
    }
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.removeAttribute('open')
    }
  }
})

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline in tests'))))
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  )
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('improve home', () => {
  it('shows the hero, the rail with Home and Profile, and three feature cards', () => {
    renderApp()
    expect(screen.getByRole('heading', { level: 1, name: 'Use your VPP setup more efficiently.' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 1 }).querySelector('em')?.textContent).toBe('more efficiently.')
    expect(rail().getByRole('button', { name: 'Home' }).getAttribute('aria-current')).toBe('page')
    expect(rail().getByRole('button', { name: 'Profile' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Access features' })).toBeTruthy()
    for (const name of ['What if', 'Goals', 'Reminders']) {
      expect(screen.getByRole('button', { name: `Try it: ${name}` })).toBeTruthy()
    }
    expect(screen.getAllByText('Not added yet')).toHaveLength(4)
  })

  it('says Complete profile when some answers are already there', () => {
    saveProfile(ready({ vppProvider: '' }))
    renderApp()
    expect(screen.getByRole('button', { name: 'Complete profile' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Access features' })).toBeNull()
  })
})

describe('access-features form', () => {
  // Types into every field of the form, so it gets more time when the whole suite runs at once.
  it('opens before a feature when answers are missing, then lands on that feature', async () => {
    const user = renderApp()
    await user.click(screen.getByRole('button', { name: 'Try it: Goals' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Your home and VPP' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByText('Please enter the VPP you have joined.')).toBeTruthy()

    await user.type(screen.getByLabelText('Which VPP have you joined?'), 'Tesla Energy Plan')
    await user.type(screen.getByLabelText('What is your postcode?'), '3101')
    await user.type(screen.getByLabelText('How many people live in your house?'), '3')
    await user.type(screen.getByLabelText('Average electricity usage for a month'), '540')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Your solar panels' })).toBeTruthy()
    await user.type(screen.getByLabelText('How many solar panels do you have?'), '12')
    await user.click(screen.getByRole('radio', { name: 'N' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Your battery' })).toBeTruthy()
    await user.click(screen.getByPlaceholderText('Search battery brand & model'))
    await user.click(screen.getByRole('option', { name: 'Tesla Powerwall 2' }))
    await user.click(screen.getByRole('button', { name: 'Save and continue' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Goals' })).toBeTruthy()
    const saved = loadProfile()
    expect(saved).toMatchObject({ vppProvider: 'Tesla Energy Plan', monthlyKwh: '540', hasSolar: 'yes' })
    expect(saved.improveUpdated).not.toBeNull()
    expect(saved.lastUpdated).toBeNull()
  }, 15_000)

  it('says in a pop-up when it uses answers from the explore form, and asks only for what is missing', async () => {
    saveProfile(ready({ vppProvider: '' }))
    const user = renderApp()
    await user.click(screen.getByRole('button', { name: 'Complete profile' }))
    const dialog = screen.getByRole('dialog', { name: 'We used your earlier answers' })
    expect(dialog.textContent).toContain('Simulate my savings form')
    await user.click(within(dialog).getByRole('button', { name: 'Got it' }))
    expect(screen.getByLabelText('What is your postcode?')).toHaveProperty('value', '3101')
    expect(screen.getByLabelText('Which VPP have you joined?')).toHaveProperty('value', '')
  })

  it('opens features straight away once the answers are complete', async () => {
    saveProfile(ready(), 'improve')
    const user = renderApp()
    await user.click(rail().getByRole('button', { name: 'Reminders' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Get Reminded' })).toBeTruthy()
  })
})

describe('answers shared between flows', () => {
  it('keeps the answers when switching to the explore flow', async () => {
    saveProfile(ready(), 'improve')
    const user = renderApp()
    await user.click(rail().getByRole('button', { name: 'Path' }))
    await user.click(screen.getByRole('button', { name: 'Switch to exploring VPPs' }))
    expect(loadProfile()).toMatchObject({ vppProvider: 'Tesla Energy Plan', postcode: '3101' })
  })
})

describe('improve-flow profile', () => {
  function renderProfile(profile = ready()) {
    const onSave = vi.fn()
    const onReset = vi.fn()
    render(
      <ImproveProfileView profile={profile} bundle={bundle} onSave={onSave} onReset={onReset} onLogoClick={vi.fn()} />,
    )
    return { onSave, onReset, user: userEvent.setup() }
  }

  it('picks the VPP from the Plans list', async () => {
    const { onSave, user } = renderProfile(ready({ vppProvider: '' }))
    const household = screen.getByRole('region', { name: 'Your home and VPP' })
    await user.click(within(household).getByRole('button', { name: 'Edit' }))
    await user.click(within(household).getByPlaceholderText('Search VPP providers'))
    const brands = vppProviderOptions(bundle)
    expect(brands.length).toBeGreaterThan(0)
    for (const brand of brands) expect(within(household).getByRole('option', { name: brand })).toBeTruthy()
    expect(within(household).getByRole('option', { name: 'Not listed' })).toBeTruthy()
    await user.click(within(household).getByRole('option', { name: brands[0] }))
    await user.click(within(household).getByRole('button', { name: 'Save' }))
    expect(onSave.mock.calls[0][0]).toMatchObject({ vppProvider: brands[0] })
  })

  it('asks before resetting, and Cancel keeps everything', async () => {
    const { onReset, user } = renderProfile()
    await user.click(screen.getByRole('button', { name: 'Reset Profile' }))
    expect(screen.getByText(/This clears your setup answers, your goals and history/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onReset).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Reset Profile' }))
    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(onReset).toHaveBeenCalledOnce()
  })

  it('shows the answers and saves an edited section', async () => {
    const { onSave, user } = renderProfile()
    const household = screen.getByRole('region', { name: 'Your home and VPP' })
    expect(within(household).getByText('Tesla Energy Plan')).toBeTruthy()
    await user.click(within(household).getByRole('button', { name: 'Edit' }))
    const people = within(household).getByLabelText('How many people live in your house?')
    await user.clear(people)
    await user.type(people, '5')
    await user.click(within(household).getByRole('button', { name: 'Save' }))
    expect(onSave).toHaveBeenCalledOnce()
    expect(onSave.mock.calls[0][0]).toMatchObject({ people: '5' })
  })

  it('edits the What if baseline and checks it first', async () => {
    const { onSave, user } = renderProfile()
    const baseline = screen.getByRole('region', { name: 'What if baseline' })
    await user.click(within(baseline).getByRole('button', { name: 'Edit' }))
    const panels = within(baseline).getByLabelText('How many solar panels do you have?')
    await user.clear(panels)
    await user.click(within(baseline).getByRole('button', { name: 'Save' }))
    expect(onSave).not.toHaveBeenCalled()
    await user.type(panels, '20')
    await user.click(within(baseline).getByRole('button', { name: 'Save' }))
    expect(onSave.mock.calls[0][0]).toMatchObject({ panelCount: '20' })
  })

  it('shows goal progress and edits goals in place, saving to the Goals store', async () => {
    localStorage.setItem(
      GOALS_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        goals: { savings: { target: 90, setOn: SET_ON }, carbon: { target: 60, setOn: SET_ON } },
        completedGoals: [],
        months: [],
        baseline: {
          month: '2026-09',
          days: 30,
          monthly: { savings: 30, carbon: 20 },
          battery: { model: 'Tesla Powerwall 2', units: 1 },
          ratePerKwh: null,
          setOn: SET_ON,
        },
      }),
    )
    const { user } = renderProfile()
    const goals = screen.getByRole('region', { name: 'Your goals' })
    expect(within(goals).getAllByRole('progressbar')).toHaveLength(2)
    await user.click(within(goals).getByRole('button', { name: 'Edit goals' }))
    const savings = within(goals).getByLabelText('Savings goal (AUD)')
    await user.clear(savings)
    await user.type(savings, '120')
    await user.click(within(goals).getByRole('button', { name: 'Save goals' }))
    expect(screen.getByText('Your goals are updated. The Goals tab shows the change.')).toBeTruthy()
    expect(loadGoals().goals.savings).toEqual({ target: 120, setOn: SET_ON })
  })

  it('lists downloaded reminders and can remove one', async () => {
    addReminders([
      { date: '2026-10-20', eventType: 'discharge' },
      { date: '2026-10-22', eventType: 'opt_out' },
    ])
    const { user } = renderProfile()
    const reminders = screen.getByRole('region', { name: 'Reminders you downloaded' })
    expect(within(reminders).getAllByRole('listitem')).toHaveLength(2)
    expect(reminders.textContent).toContain('Discharge event')
    await user.click(within(reminders).getByRole('button', { name: /^Remove Opt-out event/ }))
    expect(within(reminders).getAllByRole('listitem')).toHaveLength(1)
    expect(loadReminders()).toHaveLength(1)
  })
})

describe('resetting the improve profile', () => {
  function seedGoals() {
    localStorage.setItem(
      GOALS_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        goals: { savings: { target: 90, setOn: SET_ON }, carbon: { target: 60, setOn: SET_ON } },
        completedGoals: [],
        months: [],
        baseline: null,
      }),
    )
  }

  async function resetFromProfile() {
    const user = renderApp()
    await user.click(rail().getByRole('button', { name: 'Profile' }))
    await user.click(screen.getByRole('button', { name: 'Reset Profile' }))
    await user.click(screen.getByRole('button', { name: 'Reset' }))
    return user
  }

  it('clears the improve answers, goals, and reminders, and returns home', async () => {
    saveProfile(ready(), 'improve')
    seedGoals()
    addReminders([{ date: '2026-10-20', eventType: 'discharge' }])
    await resetFromProfile()
    expect(screen.getByText('Your improve profile was reset.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Access features' })).toBeTruthy()
    const after = loadProfile()
    expect(after).toMatchObject({ vppProvider: '', postcode: '', monthlyKwh: '', batteryModel: '', improveUpdated: null })
    expect(localStorage.getItem(GOALS_STORAGE_KEY)).toBeNull()
    expect(loadReminders()).toEqual([])
  })

  it('keeps answers saved by the explore form and clears only the VPP', async () => {
    const explore = saveProfile(ready({ vppProvider: '' }))
    saveProfile({ ...explore, vppProvider: 'Tesla Energy Plan' }, 'improve')
    await resetFromProfile()
    expect(loadProfile()).toMatchObject({ vppProvider: '', postcode: '3101', monthlyKwh: '540', improveUpdated: null })
    expect(loadProfile().lastUpdated).toBe(explore.lastUpdated)
    expect(screen.getByRole('button', { name: 'Complete profile' })).toBeTruthy()
  })
})

describe('What if household changes', () => {
  it('lets dishwasher cycles go below today and moves the monthly usage', async () => {
    const onSave = vi.fn()
    const profile = { ...ready(), lastUpdated: SET_ON }
    render(
      <WhatIfView
        profile={profile}
        hasProfile
        bundle={bundle}
        methodologyError=""
        onSaveProfile={onSave}
        onStartSetup={vi.fn()}
        onLogoClick={vi.fn()}
      />,
    )
    const user = userEvent.setup()
    const decrease = screen.getByRole('button', { name: 'Decrease Dishwasher cycles a week, more or fewer' })
    await user.click(decrease)
    await user.click(decrease)
    const row = decrease.closest('.whatif-row') as HTMLElement
    expect(row.querySelector('output')?.textContent).toBe('-2')
    await user.click(screen.getByRole('button', { name: /Use this setup/ }))
    const saved = onSave.mock.calls[0][0] as ProfileData
    expect(Number(saved.monthlyKwh)).toBeLessThan(540)
    expect(saved.dishwasherCyclesPerWeek).toBe(profile.dishwasherCyclesPerWeek)
  })
})
