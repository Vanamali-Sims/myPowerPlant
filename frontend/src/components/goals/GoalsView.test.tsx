/**
 * @vitest-environment jsdom
 *
 * Screen tests for the Goals tab: the battery-file baseline, setting and
 * editing goals, and removing a month from the history.
 *
 * Rendered with the seeded methodology bundle, so no request is made. Files
 * are dated from today, so the baseline month is always a recent one.
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { EMISSIONS_FACTOR_SOURCE, GOALS_STORAGE_KEY } from '../../constants/goals'
import { GOAL_MESSAGES } from '../../constants/goalMessages'
import { BASELINE_PROFILE } from '../../data/baselines'
import { maxIntervalKwh } from '../../lib/goals/batteryLimits'
import { buildCalculationContext, calculateDay, profileRate } from '../../lib/goals/calculate'
import { addDays, addMonths, daysInMonth, monthOf } from '../../lib/goals/calendar'
import { formatMonthLabel } from '../../lib/goals/goalFormat'
import { pickBaseline, suggestGoals, type GoalSuggestions } from '../../lib/goals/goalSetup'
import { melbourneDate, melbourneDayStart, melbourneWallTime } from '../../lib/goals/melbourneTime'
import { readBatteryFile } from '../../lib/goals/readBatteryFile'
import { seedMethodologyBundle } from '../../lib/methodologyFixture'
import type { MonthRecord } from '../../types/goals'
import { emptyProfile, type ProfileData } from '../../types/profile'
import { GoalsView } from './GoalsView'

const bundle = seedMethodologyBundle()
const SET_ON = '2026-10-01T00:00:00.000Z'
const TODAY = melbourneDate(Date.now())
const RECENT = addMonths(monthOf(TODAY), -1)
const RECENT_FIRST = `${RECENT}-01`
const RECENT_LAST = `${RECENT}-${String(daysInMonth(RECENT)).padStart(2, '0')}`
const RECENT_LABEL = formatMonthLabel(RECENT)

function savedProfile(overrides: Partial<ProfileData> = {}): ProfileData {
  return { ...emptyProfile(), ...BASELINE_PROFILE, lastUpdated: SET_ON, ...overrides }
}

function csvFor(from: string, to: string): string {
  const rows = ['interval_start,interval_minutes,battery_discharge_kwh,battery_charge_kwh']
  const end = melbourneDayStart(addDays(to, 1))
  for (let instant = melbourneDayStart(from); instant < end; instant += 15 * 60_000) {
    rows.push(`${melbourneWallTime(instant)},15,0.1,0.05`)
  }
  return rows.join('\n')
}

type ViewOptions = {
  profile?: ProfileData
  bundleLoaded?: boolean
  methodologyError?: string
}

function renderView({ profile = savedProfile(), bundleLoaded = true, methodologyError = '' }: ViewOptions = {}) {
  const utils = render(
    <GoalsView
      profile={profile}
      bundle={bundleLoaded ? bundle : null}
      methodologyError={methodologyError}
      onLogoClick={vi.fn()}
    />,
  )
  return { ...utils, user: userEvent.setup({ applyAccept: false }) }
}

async function addFile(user: ReturnType<typeof userEvent.setup>, from = RECENT_FIRST, to = RECENT_LAST) {
  await user.click(screen.getByRole('radio', { name: 'Tesla' }))
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  await user.upload(input, new File([csvFor(from, to)], 'battery.csv'))
  await user.click(screen.getByRole('button', { name: 'Read file' }))
  await user.click(await screen.findByRole('button', { name: 'Continue' }))
}

function savingsInput() {
  return screen.getByLabelText('Savings goal (AUD)')
}

function carbonInput() {
  return screen.getByLabelText('Carbon goal (kg CO2e)')
}

function describedText(input: HTMLElement): string {
  return (input.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ')
}

function storedGoals() {
  const raw = localStorage.getItem(GOALS_STORAGE_KEY)
  return raw ? JSON.parse(raw) : null
}

function aud(value: number | undefined): string {
  return `$${(value ?? 0).toLocaleString('en-AU')}`
}

function month(overrides: Partial<MonthRecord> & { month: string }): MonthRecord {
  const days = daysInMonth(overrides.month)
  return {
    daysInMonth: days,
    daysCounted: days,
    coveredRanges: [[`${overrides.month}-01`, `${overrides.month}-${String(days).padStart(2, '0')}`]],
    savingsAud: 60,
    carbonKg: 40,
    dischargeKwh: 30,
    intakeKwh: 22,
    sourceId: 'tesla',
    updatedOn: SET_ON,
    ...overrides,
  }
}

const SEEDED_BASELINE = {
  month: '2026-09',
  days: 30,
  monthly: { savings: 30, carbon: 20 },
  battery: { model: 'Tesla Powerwall 2', units: 1 },
  ratePerKwh: null,
  setOn: SET_ON,
}

function seedStore(store: Record<string, unknown>) {
  localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(store))
}

let expected: { suggestions: GoalSuggestions; days: number }
let expectedAt40c: GoalSuggestions

beforeAll(async () => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '')
    }
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.removeAttribute('open')
    }
  }
  // Same reader and baseline rule the screen uses, on the same file.
  const profile = savedProfile()
  const read = await readBatteryFile(
    new File([csvFor(RECENT_FIRST, RECENT_LAST)], 'battery.csv'),
    'tesla',
    { maxIntervalKwh: maxIntervalKwh({ model: profile.batteryModel, units: profile.batteryUnits }, bundle) },
  )
  if (!read.ok) throw new Error('fixture file did not read')
  const pick = (rate: number | null) => {
    const context = buildCalculationContext(rate, bundle)
    const picked = pickBaseline(read.days.map((day) => calculateDay(day, context)), TODAY)
    if (!picked.ok) throw new Error('fixture file has no baseline')
    return picked
  }
  // The test profile has a bill and monthly usage, so its own rate is used.
  const fromProfile = pick(profileRate(profile))
  expected = { suggestions: suggestGoals(fromProfile.monthly), days: fromProfile.days.length }
  expectedAt40c = suggestGoals(pick(0.4).monthly)
})

beforeEach(() => {
  localStorage.clear()
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
  vi.restoreAllMocks()
})

describe('step 1: battery and a recent file', () => {
  it('works with no profile, asking for the battery before the file', async () => {
    const { user } = renderView({ profile: emptyProfile() })
    expect(screen.getByRole('heading', { name: 'Set your goals' })).toBeTruthy()
    expect(screen.getByText(/^Step 1 of 2:/)).toBeTruthy()
    expect(screen.getByText('Choose your battery model to add your file.')).toBeTruthy()
    expect(screen.queryByRole('region', { name: /Upload/ })).toBeNull()
    expect(screen.queryByLabelText('Savings goal (AUD)')).toBeNull()

    await user.click(screen.getByPlaceholderText('Search battery brand & model'))
    await user.click(screen.getByRole('option', { name: 'Tesla Powerwall 2' }))
    const upload = screen.getByRole('region', { name: 'Upload a recent battery file' })
    expect(within(upload).getByRole('radiogroup', { name: 'VPP provider' })).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Upload your battery file' })).toBeNull()
  })

  it('uses the battery and rate from the profile and goes straight to the upload', () => {
    renderView()
    expect(screen.getByText('Step 1 of 2: a recent battery file')).toBeTruthy()
    expect(screen.queryByPlaceholderText('Search battery brand & model')).toBeNull()
    expect(screen.queryByLabelText('Your electricity usage rate (optional)')).toBeNull()
    expect(
      screen.getByText(
        'Using your battery from your profile: Tesla Powerwall 2. Savings use your bill ÷ usage from your profile, about 33.3 c/kWh.',
      ),
    ).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Upload a recent battery file' })).toBeTruthy()
  })

  it('refuses a month with too few complete days and shows no goal fields', async () => {
    const { user } = renderView()
    await addFile(user, RECENT_FIRST, `${RECENT}-10`)
    expect(screen.getByRole('alert').textContent).toContain(GOAL_MESSAGES.baseline_too_few_days.title)
    expect(screen.queryByLabelText('Savings goal (AUD)')).toBeNull()
    expect(storedGoals()).toBeNull()
  })

  it('refuses a file with no recent days', async () => {
    const old = addMonths(monthOf(TODAY), -6)
    const { user } = renderView()
    await addFile(user, `${old}-01`, `${old}-20`)
    expect(screen.getByRole('alert').textContent).toContain(GOAL_MESSAGES.baseline_not_recent.title)
    expect(screen.queryByLabelText('Savings goal (AUD)')).toBeNull()
  })
})

describe('optional usage rate', () => {
  function rateInput() {
    return screen.getByLabelText('Your electricity usage rate (optional)')
  }

  const noBill = () => savedProfile({ monthlyBill: '' })

  it('says the typical Victorian rate is used while the rate is empty', () => {
    renderView({ profile: noBill() })
    expect(rateInput()).toHaveProperty('value', '')
    const cents = Math.round(bundle.methodology.defaultRetailRate * 1000) / 10
    expect(
      screen.getByText(
        `If you leave this empty, we use the typical Victorian rate of ${cents} c/kWh, so your savings are an estimate. Add your own rate for accurate tracking.`,
      ),
    ).toBeTruthy()
  })

  it('hides the upload until a rate that cannot be right is fixed or cleared', async () => {
    const { user } = renderView({ profile: noBill() })
    await user.type(rateInput(), '500')
    await user.tab()
    expect(screen.getByRole('alert').textContent).toContain('Enter your rate in cents per kWh, between 5 and 100')
    expect(screen.queryByRole('region', { name: 'Upload a recent battery file' })).toBeNull()
    expect(screen.getByText('Fix the rate, or leave it empty, to add your file.')).toBeTruthy()
    await user.clear(rateInput())
    expect(screen.getByRole('region', { name: 'Upload a recent battery file' })).toBeTruthy()
  })

  it('values the file at the rate entered and saves it with the baseline', async () => {
    const { user } = renderView({ profile: noBill() })
    await user.type(rateInput(), '40')
    expect(screen.queryByText(/If you leave this empty/)).toBeNull()
    await addFile(user)
    expect(savingsInput()).toHaveProperty('value', String(expectedAt40c.savings?.suggested))
    // Carbon does not depend on the rate.
    expect(carbonInput()).toHaveProperty('value', String(expected.suggestions.carbon?.suggested))
    await user.click(screen.getByRole('button', { name: 'Save goals' }))
    expect(storedGoals().baseline.ratePerKwh).toBe(0.4)
  })
})

describe('step 2: goals from the file', () => {
  it('names the month, warns about seasons, says the days will count, and fills in the suggestion', async () => {
    const { user } = renderView()
    await addFile(user)
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Set your goals' }))
    expect(screen.getByText('Step 2 of 2: choose your goals')).toBeTruthy()
    expect(
      screen.getByText(
        `Based on ${RECENT_LABEL}; your range may shift with the seasons. ${expected.days} days from ${RECENT_LABEL} will be added to your goal progress when you save your goals.`,
      ),
    ).toBeTruthy()
    expect(savingsInput()).toHaveProperty('value', String(expected.suggestions.savings?.suggested))
    expect(carbonInput()).toHaveProperty('value', String(expected.suggestions.carbon?.suggested))
    expect(describedText(savingsInput())).toBe(
      `Allowed range: ${aud(expected.suggestions.savings?.min)} to ${aud(expected.suggestions.savings?.max)}`,
    )
  })

  it('explains the range from 2 to 13 months of the file month', async () => {
    const { user } = renderView()
    await addFile(user)
    const toggle = screen.getByRole('button', { name: 'How is the allowed range calculated?' })
    await user.click(toggle)
    const text = document.getElementById(toggle.getAttribute('aria-controls') ?? '')?.textContent ?? ''
    expect(text).toContain(`Based on your battery file for ${RECENT_LABEL}`)
    expect(text).toContain('× 30.4 days')
    expect(text).toContain(`Lowest: 2 months = ${aud(expected.suggestions.savings?.min)}`)
    expect(text).toContain(`Filled in for you: 3 months = ${aud(expected.suggestions.savings?.suggested)}`)
    expect(text).toContain(`Highest: 13 months = ${aud(expected.suggestions.savings?.max)}`)
  })

  it('goes back to step 1 for a different file', async () => {
    const { user } = renderView()
    await addFile(user)
    await user.click(screen.getByRole('button', { name: 'Use a different file' }))
    expect(screen.getByText(/^Step 1 of 2:/)).toBeTruthy()
    expect(screen.queryByLabelText('Savings goal (AUD)')).toBeNull()
  })

  it('shows worked carbon examples with the factor source', async () => {
    const { user } = renderView()
    await addFile(user)
    const toggle = screen.getByRole('button', { name: 'How is carbon calculated?' })
    await user.click(toggle)
    const text = document.getElementById(toggle.getAttribute('aria-controls') ?? '')?.textContent ?? ''
    const factor = bundle.methodology.vicGridKgCo2PerKwh
    expect(text).toContain(`10 kWh × ${factor} =`)
    expect(text).toContain('close to your suggested carbon goal')
    expect(text).toContain(EMISSIONS_FACTOR_SOURCE.label)
  })
})

describe('goal validation', () => {
  it.each([
    ['', 'Enter a savings goal.'],
    ['0', 'Enter an amount above zero.'],
    ['ten', 'Enter a number only'],
    ['1', 'This is below the allowed range.'],
    ['999999', 'This is above the allowed range.'],
  ])('shows an error beside the field for %j and does not save', async (raw, message) => {
    const { user } = renderView()
    await addFile(user)
    await user.clear(savingsInput())
    if (raw) await user.type(savingsInput(), raw)
    await user.click(screen.getByRole('button', { name: 'Save goals' }))
    expect(screen.getByRole('alert').textContent).toContain(message)
    expect(savingsInput().getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(savingsInput())
    expect(storedGoals()).toBeNull()
  })
})

describe('saving goals with the baseline', () => {
  it('saves goals, the baseline, and the file month as progress in one write', async () => {
    const { user } = renderView()
    await addFile(user)
    await user.click(screen.getByRole('button', { name: 'Save goals' }))
    expect(
      screen.getByText(
        `Your goals are saved on this device. ${expected.days} days from ${RECENT_LABEL} were added to your goal progress.`,
      ),
    ).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Your goals' }))
    const [savingsBar] = screen.getAllByRole('progressbar')
    expect(Number(savingsBar.getAttribute('aria-valuenow'))).toBeGreaterThan(0)
    expect(Number(savingsBar.getAttribute('aria-valuenow'))).toBeLessThan(50)
    const upload = screen.getByRole('region', { name: 'Upload your battery file' })
    expect(within(upload).getByRole('radiogroup', { name: 'VPP provider' })).toBeTruthy()

    const stored = storedGoals()
    expect(stored.version).toBe(2)
    expect(stored.goals.savings.target).toBe(expected.suggestions.savings?.suggested)
    expect(stored.baseline.month).toBe(RECENT)
    expect(stored.baseline.days).toBe(expected.days)
    expect(stored.baseline.battery).toEqual({ model: 'Tesla Powerwall 2', units: 1 })
    // A profile rate is read live from the profile, so it is not copied into goals.
    expect(stored.baseline.ratePerKwh).toBeNull()
    expect(stored.months.map((record: MonthRecord) => record.month)).toEqual([RECENT])
    expect(stored.completedGoals).toEqual([])
  })

  it('shows a message and keeps the form when the device refuses the write', async () => {
    const { user } = renderView()
    await addFile(user)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    await user.click(screen.getByRole('button', { name: 'Save goals' }))
    vi.restoreAllMocks()
    expect(screen.getByRole('alert').textContent).toContain(GOAL_MESSAGES.write_failed.title)
    expect(screen.getByRole('heading', { name: 'Set your goals' })).toBeTruthy()
    expect(storedGoals()).toBeNull()
  })
})

describe('editing goals', () => {
  it('uses the saved baseline without asking for a file, and leaves history alone', async () => {
    const saved = month({ month: '2026-09' })
    seedStore({
      version: 2,
      goals: { savings: { target: 90, setOn: SET_ON }, carbon: { target: 60, setOn: SET_ON } },
      completedGoals: [],
      months: [saved],
      baseline: SEEDED_BASELINE,
    })
    const { user } = renderView({ profile: emptyProfile() })
    await user.click(screen.getByRole('button', { name: 'Edit goals' }))
    expect(screen.queryByText(/Step 1 of 2/)).toBeNull()
    expect(screen.getByText('Based on September 2026; your range may shift with the seasons.')).toBeTruthy()
    expect(describedText(savingsInput())).toBe('Allowed range: $60 to $390')
    await user.clear(savingsInput())
    await user.type(savingsInput(), '390')
    await user.click(screen.getByRole('button', { name: 'Save goals' }))
    expect(screen.getByText('Your goals are updated.')).toBeTruthy()
    const stored = storedGoals()
    expect(stored.goals.savings).toEqual({ target: 390, setOn: SET_ON })
    expect(stored.months).toEqual([saved])
    expect(stored.baseline).toEqual(SEEDED_BASELINE)
  })

  it('asks for a file first when goals were saved before baselines existed', async () => {
    seedStore({
      version: 1,
      goals: { savings: { target: 300, setOn: SET_ON }, carbon: { target: 500, setOn: SET_ON } },
      completedGoals: [],
      months: [],
    })
    const { user } = renderView()
    await user.click(screen.getByRole('button', { name: 'Edit goals' }))
    expect(screen.getByRole('heading', { name: 'Edit your goals' })).toBeTruthy()
    expect(screen.getByText(/^Step 1 of 2:/)).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Upload your battery file' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('heading', { name: 'Your goals' })).toBeTruthy()
  })
})

describe('removing a month from the history', () => {
  function seedTwoMonths() {
    seedStore({
      version: 2,
      goals: { savings: { target: 300, setOn: SET_ON }, carbon: { target: 500, setOn: SET_ON } },
      completedGoals: [],
      months: [month({ month: '2026-08' }), month({ month: '2026-09' })],
      baseline: SEEDED_BASELINE,
    })
  }

  it('asks first, and Cancel keeps the month', async () => {
    seedTwoMonths()
    const { user } = renderView()
    await user.click(screen.getByRole('button', { name: 'Remove August 2026' }))
    const dialog = screen.getByRole('dialog', { name: 'Remove August 2026 from your history?' })
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Cancel' }))
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(storedGoals().months).toHaveLength(2)
  })

  it('removes only that month and updates the totals', async () => {
    seedTwoMonths()
    const { user } = renderView()
    const [before] = screen.getAllByRole('progressbar')
    expect(before.getAttribute('aria-valuetext')).toMatch(/^\$120 of \$300/)
    await user.click(screen.getByRole('button', { name: 'Remove August 2026' }))
    const dialog = screen.getByRole('dialog', { name: 'Remove August 2026 from your history?' })
    await user.click(within(dialog).getByRole('button', { name: 'Remove August 2026' }))
    expect(
      screen.getByText('August 2026 was removed from your history. Goals you already reached stay on record.'),
    ).toBeTruthy()
    expect(storedGoals().months.map((record: MonthRecord) => record.month)).toEqual(['2026-09'])
    const [after] = screen.getAllByRole('progressbar')
    expect(after.getAttribute('aria-valuetext')).toMatch(/^\$60 of \$300/)
    const history = screen.getByRole('table', { name: /Estimated savings and carbon avoided by month/ })
    expect(within(history).queryByText('August 2026')).toBeNull()
  })
})

describe('estimate data unavailable', () => {
  it('says estimates are unavailable and shows no form or guess', () => {
    renderView({ bundleLoaded: false, methodologyError: 'Could not reach the API.' })
    expect(screen.getByRole('alert').textContent).toContain('Estimates are unavailable right now')
    expect(screen.queryByLabelText('Savings goal (AUD)')).toBeNull()
    expect(screen.queryByPlaceholderText('Search battery brand & model')).toBeNull()
  })
})
