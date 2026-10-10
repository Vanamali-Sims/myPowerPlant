/**
 * @vitest-environment jsdom
 *
 * Screen tests for celebrating a reached goal (US8.6 AC1 to AC4).
 *
 * canvas-confetti is mocked so the tests can prove it is only ever used
 * through confetti.create with useWorker off, and never under reduced motion.
 * jsdom has no <dialog> showModal or close, so a stand-in is added here.
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { GOALS_STORAGE_KEY, TREE_FIGURE_SOURCE } from '../../constants/goals'
import { BASELINE_PROFILE } from '../../data/baselines'
import { addDays, addMonths, daysInMonth, monthOf } from '../../lib/goals/calendar'
import { formatDayLabel, formatMonthLabel } from '../../lib/goals/goalFormat'
import { melbourneDate, melbourneDayStart, melbourneWallTime } from '../../lib/goals/melbourneTime'
import { seedMethodologyBundle } from '../../lib/methodologyFixture'
import { emptyProfile } from '../../types/profile'
import { GoalsView } from './GoalsView'

const confetti = vi.hoisted(() => {
  const fire = Object.assign(
    vi.fn(() => Promise.resolve()),
    { reset: vi.fn() },
  )
  const defaultExport = Object.assign(vi.fn(), {
    create: vi.fn((_canvas?: HTMLCanvasElement, _options?: object) => fire),
  })
  return { fire, defaultExport }
})

vi.mock('canvas-confetti', () => ({ default: confetti.defaultExport }))

const bundle = seedMethodologyBundle()
const SET_ON = '2026-10-01T00:00:00.000Z'
const profile = { ...emptyProfile(), ...BASELINE_PROFILE, lastUpdated: SET_ON }
let reduce = false

function csvFor(from: string, to: string): string {
  const rows = ['interval_start,interval_minutes,battery_discharge_kwh,battery_charge_kwh']
  const end = melbourneDayStart(addDays(to, 1))
  for (let instant = melbourneDayStart(from); instant < end; instant += 15 * 60_000) {
    rows.push(`${melbourneWallTime(instant)},15,0.1,0.05`)
  }
  return rows.join('\n')
}

const BASELINE = {
  month: '2026-09',
  days: 30,
  monthly: { savings: 30, carbon: 20 },
  battery: { model: 'Tesla Powerwall 2', units: 1 },
  ratePerKwh: null,
  setOn: SET_ON,
}

function seedGoals(savings: number, carbon: number, months: unknown[] = []) {
  localStorage.setItem(
    GOALS_STORAGE_KEY,
    JSON.stringify({
      version: 2,
      goals: { savings: { target: savings, setOn: SET_ON }, carbon: { target: carbon, setOn: SET_ON } },
      completedGoals: [],
      months,
      baseline: BASELINE,
    }),
  )
}

function stored() {
  return JSON.parse(localStorage.getItem(GOALS_STORAGE_KEY) ?? 'null')
}

function renderView() {
  const utils = render(
    <GoalsView
      profile={profile}
      bundle={bundle}
      methodologyError=""
      onLogoClick={vi.fn()}
    />,
  )
  return { ...utils, user: userEvent.setup({ applyAccept: false }) }
}

async function confirmSeptember(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('radio', { name: 'Tesla' }))
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  await user.upload(input, new File([csvFor('2026-09-01', '2026-09-30')], 'sept.csv'))
  await user.click(screen.getByRole('button', { name: 'Read file' }))
  await user.click(await screen.findByRole('button', { name: 'Continue' }))
  await user.click(screen.getByRole('button', { name: 'Confirm and save' }))
}

function levelDialog() {
  return screen.queryByRole('dialog', { name: /You reached/ })
}

beforeAll(() => {
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
  reduce = false
  confetti.fire.mockClear()
  confetti.fire.reset.mockClear()
  confetti.defaultExport.mockClear()
  confetti.defaultExport.create.mockClear()
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('reduced-motion') ? reduce : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
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

describe('level-up message when a goal is reached (AC1)', () => {
  it('names the goal and new level, with confetti from confetti.create only', async () => {
    seedGoals(10, 100000)
    const { user } = renderView()
    await confirmSeptember(user)
    const dialog = levelDialog()
    expect(dialog).not.toBeNull()
    expect(within(dialog as HTMLElement).getByRole('heading').textContent).toBe('You reached your savings goal')
    expect(dialog?.textContent).toContain('You are now at level 2.')
    expect(confetti.defaultExport.create).toHaveBeenCalledOnce()
    expect(confetti.defaultExport.create.mock.calls[0][1]).toEqual({
      resize: true,
      useWorker: false,
      disableForReducedMotion: true,
    })
    expect(confetti.defaultExport).not.toHaveBeenCalled()
    expect(confetti.fire).toHaveBeenCalled()
    const canvas = dialog?.querySelector('canvas')
    expect(canvas?.getAttribute('aria-hidden')).toBe('true')
    expect(canvas?.hasAttribute('tabindex')).toBe(false)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: "Let's take the next step" }))
  })

  it('gives one message when both goals are reached together', async () => {
    seedGoals(10, 10)
    const { user } = renderView()
    await confirmSeptember(user)
    expect(screen.getAllByRole('dialog', { name: /You reached/ })).toHaveLength(1)
    expect(levelDialog()?.textContent).toContain('You reached both goals')
    expect(levelDialog()?.textContent).toContain('level 3')
    expect(stored().completedGoals).toHaveLength(2)
  })

  it('shows no confetti at all under reduced motion', async () => {
    reduce = true
    seedGoals(10, 100000)
    const { user } = renderView()
    await confirmSeptember(user)
    expect(levelDialog()).not.toBeNull()
    expect(levelDialog()?.querySelector('canvas')).toBeNull()
    expect(confetti.defaultExport.create).not.toHaveBeenCalled()
    expect(confetti.fire).not.toHaveBeenCalled()
  })

  it('never celebrates goals reached by lowering them, and does not count them as levels', async () => {
    seedGoals(1000, 100000)
    const { user } = renderView()
    await confirmSeptember(user)
    expect(levelDialog()).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Edit goals' }))
    // Lower both goals to the bottom of their allowed ranges, which is below the totals.
    for (const label of ['Savings goal (AUD)', 'Carbon goal (kg CO2e)']) {
      const input = screen.getByLabelText(label)
      const described = (input.getAttribute('aria-describedby') ?? '')
        .split(' ')
        .map((id) => document.getElementById(id)?.textContent ?? '')
        .join(' ')
      const lowest = /Allowed range: \$?([\d,.]+)/.exec(described)?.[1].replace(/,/g, '') ?? '1'
      await user.clear(input)
      await user.type(input, lowest)
    }
    await user.click(screen.getByRole('button', { name: 'Save goals' }))
    expect(levelDialog()).toBeNull()
    expect(confetti.defaultExport.create).not.toHaveBeenCalled()
    expect(stored().completedGoals).toHaveLength(2)
    expect(stored().completedGoals.every((entry: { reachedByEdit?: boolean }) => entry.reachedByEdit)).toBe(true)
    expect(screen.getAllByText(/^Reached on /)).toHaveLength(2)
    await user.click(screen.getAllByRole('button', { name: 'View my achievement' })[0])
    expect(levelDialog()?.textContent).toContain('level 1')
    expect(levelDialog()?.querySelector('canvas')).toBeNull()
  })
})

describe('what was achieved (AC2)', () => {
  it('shows total savings, carbon, and the tree equivalent from the same totals as the page', async () => {
    seedGoals(10, 100000)
    const { user } = renderView()
    await confirmSeptember(user)
    const text = levelDialog()?.textContent ?? ''
    const [savingsBar, carbonBar] = screen.getAllByRole('progressbar')
    const savingsTotal = /^(\$[\d,.]+) of/.exec(savingsBar.getAttribute('aria-valuetext') ?? '')?.[1]
    const carbonTotal = /^([\d,.]+) kg of/.exec(carbonBar.getAttribute('aria-valuetext') ?? '')?.[1]
    expect(text).toContain(`Total estimated savings${savingsTotal}`)
    expect(text).toContain(`Total estimated carbon avoided${carbonTotal} kg CO2e`)
    expect(text).toMatch(/About the same as[\d.]+ trees/)
    expect(text).toContain(TREE_FIGURE_SOURCE)
    expect(within(levelDialog() as HTMLElement).getAllByText('Estimate')).toHaveLength(3)
  })
})

describe('taking the next step (AC3)', () => {
  it('opens setup for the reached goal with a higher target, keeping the reached goal on record', async () => {
    seedGoals(10, 100000)
    const { user } = renderView()
    await confirmSeptember(user)
    await user.click(screen.getByRole('button', { name: "Let's take the next step" }))
    expect(levelDialog()).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Set your next goal' }))
    expect(screen.getByText(/Has anything changed since then, such as more solar panels/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Keep using September 2026' }))
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Set your next goal' }))
    expect(screen.queryByLabelText('Carbon goal (kg CO2e)')).toBeNull()
    const savings = screen.getByLabelText('Savings goal (AUD)') as HTMLInputElement
    const total = stored().completedGoals[0].totalAtReach as number
    expect(Number(savings.value)).toBeGreaterThan(total)

    await user.clear(savings)
    await user.type(savings, String(Math.floor(total)))
    await user.click(screen.getByRole('button', { name: 'Save goals' }))
    expect(screen.getByRole('alert').textContent).toBe('This is below the allowed range.')

    await user.clear(savings)
    await user.type(savings, String(Math.floor(total) + 50))
    await user.click(screen.getByRole('button', { name: 'Save goals' }))
    expect(screen.getByText(/Your next goal is saved. Progress continues from your total so far./)).toBeTruthy()
    expect(stored().goals.savings.target).toBe(Math.floor(total) + 50)
    expect(stored().goals.savings.setOn).not.toBe(SET_ON)
    expect(stored().completedGoals).toHaveLength(1)
    const [savingsBar] = screen.getAllByRole('progressbar')
    expect(Number(savingsBar.getAttribute('aria-valuenow'))).toBeGreaterThan(0)
  })

  it('explains when the tree stage drops for a bigger carbon goal', async () => {
    seedGoals(100000, 10)
    const { user } = renderView()
    await confirmSeptember(user)
    await user.click(screen.getByRole('button', { name: "Let's take the next step" }))
    await user.click(screen.getByRole('button', { name: 'Keep using September 2026' }))
    await user.click(screen.getByRole('button', { name: 'Save goals' }))
    expect(screen.getByText(/Your tree is now at the .* stage, because your new carbon goal is bigger./)).toBeTruthy()
  })

  it('can read a more recent file for the next goal, which becomes the new baseline', async () => {
    const recent = addMonths(monthOf(melbourneDate(Date.now())), -1)
    const last = `${recent}-${String(daysInMonth(recent)).padStart(2, '0')}`
    seedGoals(10, 100000)
    const { user } = renderView()
    await confirmSeptember(user)
    await user.click(screen.getByRole('button', { name: "Let's take the next step" }))
    await user.click(screen.getByRole('button', { name: 'Upload a more recent file' }))
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Set your next goal' }))
    expect(screen.getByText('Step 1 of 2: your battery and a recent file')).toBeTruthy()

    await user.click(screen.getByRole('radio', { name: 'Tesla' }))
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, new File([csvFor(`${recent}-01`, last)], 'recent.csv'))
    await user.click(screen.getByRole('button', { name: 'Read file' }))
    await user.click(await screen.findByRole('button', { name: 'Continue' }))
    expect(screen.getByText(new RegExp(`^Based on ${formatMonthLabel(recent)}; your range may shift`))).toBeTruthy()

    const savings = screen.getByLabelText('Savings goal (AUD)') as HTMLInputElement
    const total = stored().completedGoals[0].totalAtReach as number
    expect(Number(savings.value)).toBeGreaterThan(total)
    await user.click(screen.getByRole('button', { name: 'Save goals' }))
    expect(screen.getByText(/Your next goal is saved./)).toBeTruthy()
    expect(stored().baseline.month).toBe(recent)
    expect(stored().months.some((record: { month: string }) => record.month === recent)).toBe(true)
  })
})

describe('dismissing and coming back (AC4)', () => {
  it('shows Reached with the date, never reopens, and replays without confetti', async () => {
    seedGoals(10, 100000)
    const { user } = renderView()
    await confirmSeptember(user)
    await user.click(within(levelDialog() as HTMLElement).getByRole('button', { name: 'Close' }))
    expect(levelDialog()).toBeNull()
    const today = formatDayLabel(melbourneDate(Date.now()))
    expect(screen.getByText(`Reached on ${today}`)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Set a new goal' })).toBeTruthy()

    cleanup()
    const again = renderView()
    expect(levelDialog()).toBeNull()
    confetti.defaultExport.create.mockClear()
    await again.user.click(screen.getByRole('button', { name: 'View my achievement' }))
    expect(levelDialog()).not.toBeNull()
    expect(levelDialog()?.querySelector('canvas')).toBeNull()
    expect(confetti.defaultExport.create).not.toHaveBeenCalled()
  })
})
