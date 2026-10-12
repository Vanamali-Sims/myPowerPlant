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

vi.mock('../../../lib/bills/readBillFile', () => ({
  readBillFile: vi.fn(async () => ({
    ok: true,
    facts: {
      retailerId: 'powershop',
      retailerLabel: 'Powershop',
      postcode: '3101',
      periodDays: 31,
      periodUsageKwh: 364,
      periodChargeAud: 132.73,
      monthlyKwh: '357',
      monthlyBill: '130',
      hadOpeningBalance: false,
      parserId: 'powershop-v2',
    },
  })),
}))

import App from '../../../App'
import { GOALS_STORAGE_KEY } from '../../../constants/goals'
import { BASELINE_PROFILE } from '../../../data/baselines'
import { loadGoals } from '../../../lib/goals/goalsStorage'
import { finishImproveProfile, vppProviderOptions } from '../../../lib/improveProfile'
import { readBillFile } from '../../../lib/bills/readBillFile'
import { saveJourney } from '../../../lib/journeyStorage'
import { seedMethodologyBundle } from '../../../lib/methodologyFixture'
import { loadProfile, saveProfile } from '../../../lib/profileStorage'
import { addReminders, loadReminders } from '../../../lib/reminderStorage'
import { emptyProfile, type ProfileData } from '../../../types/profile'
import { WhatIfView } from '../../whatif/WhatIfView'
import { ImproveProfileView } from '../ImproveProfileView'

const bundle = seedMethodologyBundle()
const SET_ON = '2026-10-01T00:00:00.000Z'

function ready(overrides: Partial<ProfileData> = {}): ProfileData {
  const { fieldSources: fieldSourceOverrides, ...rest } = overrides
  return finishImproveProfile({
    ...emptyProfile(),
    ...BASELINE_PROFILE,
    vppProvider: 'Tesla Energy Plan',
    fieldSources: {
      postcode: 'bill',
      monthlyKwh: 'bill',
      monthlyBill: 'bill',
      provider: 'bill',
      ...fieldSourceOverrides,
    },
    ...rest,
  })
}

async function uploadBillPdf(user: ReturnType<typeof userEvent.setup>) {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')
  expect(input).toBeTruthy()
  await user.upload(input!, new File(['%PDF'], 'powershop.pdf', { type: 'application/pdf' }))
}

function renderApp() {
  saveJourney('rain')
  render(<App />)
  return userEvent.setup()
}

function monthRecord(month: string, coveredRanges: [string, string][], savingsAud: number, carbonKg: number, updatedOn: string) {
  const [year, number] = month.split('-').map(Number)
  const dayOf = (date: string) => Number(date.slice(8))
  return {
    month,
    daysInMonth: new Date(Date.UTC(year, number, 0)).getUTCDate(),
    daysCounted: coveredRanges.reduce((sum, [start, end]) => sum + dayOf(end) - dayOf(start) + 1, 0),
    coveredRanges,
    savingsAud,
    carbonKg,
    dischargeKwh: 100,
    intakeKwh: null,
    sourceId: 'generic',
    updatedOn,
  }
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
  it('shows the hero, the rail with Home and Profile, the dashboard, and three feature cards', () => {
    renderApp()
    expect(screen.getByRole('heading', { level: 1, name: 'Unlock the full potential of your VPP.' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 1 }).querySelector('em')?.textContent).toBe('full potential')
    expect(rail().getByRole('button', { name: 'Home' }).getAttribute('aria-current')).toBe('page')
    expect(rail().getByRole('button', { name: 'Profile' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Access Features' })).toBeTruthy()
    expect(screen.getByText('Get started in just 2 minutes.')).toBeTruthy()

    const dashboard = within(screen.getByRole('region', { name: 'Your dashboard' }))
    expect(dashboard.queryByText('Sample')).toBeNull()
    expect(dashboard.getByText('Next discharge day')).toBeTruthy()
    expect(dashboard.getByText('Add your setup')).toBeTruthy()
    expect(dashboard.getByText('Last CSV uploaded')).toBeTruthy()
    expect(dashboard.getByText('None yet')).toBeTruthy()
    expect(dashboard.getByText('Set a savings and a carbon goal to grow your tree.')).toBeTruthy()
    expect(dashboard.getByText('Add your setup to fill in your dashboard.')).toBeTruthy()

    for (const name of [
      'Open What if: test a scenario',
      'Open Goals: set and track goals',
      'Open Reminders: never miss an event',
    ]) {
      expect(screen.getByRole('link', { name })).toBeTruthy()
    }
    expect(screen.getByRole('heading', { level: 2, name: 'Enhance VPP experience through these features.' })).toBeTruthy()
  })

  it('fills the dashboard from saved goals and the last battery CSV', () => {
    saveProfile(ready(), 'improve')
    localStorage.setItem(
      GOALS_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        goals: { savings: { target: 745, setOn: SET_ON }, carbon: { target: 1149, setOn: SET_ON } },
        completedGoals: [],
        months: [
          monthRecord('2026-08', [['2026-08-01', '2026-08-31']], 120, 300, '2026-09-02T01:00:00.000Z'),
          monthRecord('2026-09', [['2026-09-01', '2026-09-28']], 99, 229, '2026-10-08T01:00:00.000Z'),
        ],
        baseline: null,
      }),
    )
    renderApp()
    const dashboard = within(screen.getByRole('region', { name: 'Your dashboard' }))
    expect(dashboard.getByText('1 Sep – 28 Sep')).toBeTruthy()
    expect(dashboard.getByText('Uploaded Thu 8 Oct')).toBeTruthy()
    expect(dashboard.getByText('$219')).toBeTruthy()
    expect(dashboard.getByText('529 kg')).toBeTruthy()
    expect(dashboard.getByText('Your tree · Sapling')).toBeTruthy()
    expect(dashboard.queryByRole('button', { name: 'Add my setup' })).toBeNull()
  })

  it('opens the setup form from Add my setup', async () => {
    const user = renderApp()
    await user.click(screen.getByRole('button', { name: 'Add my setup' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Your home and VPP' })).toBeTruthy()
  })

  it('says Complete profile when some answers are already there', () => {
    saveProfile({
      ...emptyProfile(),
      ...BASELINE_PROFILE,
      lastUpdated: SET_ON,
      fieldSources: { postcode: 'user', monthlyKwh: 'user' },
    })
    renderApp()
    expect(screen.getByRole('button', { name: 'Complete profile' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Access Features' })).toBeNull()
  })
})

describe('access-features form', () => {
  // Types into every field of the form, so it gets more time when the whole suite runs at once.
  it('opens before a feature when answers are missing, then lands on that feature', async () => {
    const user = renderApp()
    await user.click(screen.getByRole('link', { name: 'Open Goals: set and track goals' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Your home and VPP' })).toBeTruthy()

    await uploadBillPdf(user)
    expect(readBillFile).toHaveBeenCalled()
    await user.type(screen.getByLabelText('Panel count'), '12')
    await user.selectOptions(screen.getByLabelText('Panel direction'), 'N')
    await user.click(screen.getByPlaceholderText('Search battery models'))
    await user.click(screen.getByRole('option', { name: 'Tesla Powerwall 2' }))
    await user.type(screen.getByLabelText('People in home'), '3')
    await user.selectOptions(screen.getByLabelText('Which VPP joined'), 'Not listed')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    // Goals loads lazily, which can take a moment when the whole suite runs at once.
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Grow your savings. Grow your tree.' }, { timeout: 5000 }),
    ).toBeTruthy()
    const saved = loadProfile()
    expect(saved).toMatchObject({ monthlyKwh: '357', postcode: '3101', hasSolar: 'yes' })
    expect(saved.improveUpdated).not.toBeNull()
    expect(saved.lastUpdated).toBeNull()
  }, 15_000)

  it('says in a pop-up when it uses answers from the explore form, and asks only for what is missing', async () => {
    saveProfile({
      ...emptyProfile(),
      ...BASELINE_PROFILE,
      lastUpdated: SET_ON,
      fieldSources: { postcode: 'user', monthlyKwh: 'user' },
    })
    const user = renderApp()
    await user.click(screen.getByRole('button', { name: 'Complete profile' }))
    const dialog = screen.getByRole('dialog', { name: 'We used your earlier answers' })
    expect(dialog.textContent).toContain('explore form')
    await user.click(within(dialog).getByRole('button', { name: 'Got it' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Your home and VPP' })).toBeTruthy()
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

  it('picks the VPP on What if', async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()
    render(
      <WhatIfView
        profile={ready({ vppProvider: '' })}
        hasProfile
        bundle={bundle}
        methodologyError=""
        onSaveProfile={onSave}
        onStartSetup={vi.fn()}
        onLogoClick={vi.fn()}
        hideSetupNavigation
      />,
    )
    await user.click(screen.getByPlaceholderText('Search VPP providers'))
    const brands = vppProviderOptions(bundle)
    await user.click(screen.getByRole('option', { name: brands[0] }))
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
    const household = screen.getByRole('region', { name: 'From your bill' })
    expect(within(household).getByText('3101')).toBeTruthy()
    await user.click(within(household).getByRole('button', { name: 'Edit' }))
    expect(within(household).getByRole('heading', { name: 'Upload your electricity bill' })).toBeTruthy()
    await uploadBillPdf(user)
    await user.click(within(household).getByRole('button', { name: 'Save' }))
    expect(onSave).toHaveBeenCalledOnce()
    expect(onSave.mock.calls[0][0]).toMatchObject({ monthlyKwh: '357' })
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
    expect(screen.getByRole('button', { name: 'Access Features' })).toBeTruthy()
    const after = loadProfile()
    expect(after).toMatchObject({
      vppProvider: 'Tesla Energy Plan',
      postcode: '',
      monthlyKwh: '',
      batteryModel: '',
      improveUpdated: null,
    })
    expect(localStorage.getItem(GOALS_STORAGE_KEY)).toBeNull()
    expect(loadReminders()).toEqual([])
  })

  it('keeps answers saved by the explore form when improve only added a VPP', async () => {
    const explore = saveProfile({
      ...emptyProfile(),
      ...BASELINE_PROFILE,
      lastUpdated: '2026-10-01T00:00:00.000Z',
      fieldSources: { postcode: 'user', monthlyKwh: 'user' },
    })
    saveProfile({ ...explore, vppProvider: 'Tesla Energy Plan' }, 'improve')
    await resetFromProfile()
    expect(loadProfile()).toMatchObject({
      vppProvider: 'Tesla Energy Plan',
      postcode: '3101',
      monthlyKwh: '540',
      improveUpdated: null,
    })
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
