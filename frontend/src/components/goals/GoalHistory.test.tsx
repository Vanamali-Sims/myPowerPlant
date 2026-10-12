/**
 * @vitest-environment jsdom
 *
 * Screen tests for saving confirmed history and clearing it (US8.4 AC1 to AC5),
 * through the upload dialog and the progress history.
 *
 * jsdom has no <dialog> showModal or close, so a small stand-in is added for
 * this file only.
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { GOALS_STORAGE_KEY } from '../../constants/goals'
import { GOAL_MESSAGES } from '../../constants/goalMessages'
import { PROFILE_STORAGE_KEY } from '../../constants/storage'
import { BASELINE_PROFILE } from '../../data/baselines'
import { addDays } from '../../lib/goals/calendar'
import { melbourneDayStart, melbourneWallTime } from '../../lib/goals/melbourneTime'
import { seedMethodologyBundle } from '../../lib/methodologyFixture'
import { emptyProfile } from '../../types/profile'
import { GoalsView } from './GoalsView'
import { updateGoals, uploadCsv, uploadDialog } from './uploadTestUtils'

const bundle = seedMethodologyBundle()
const SET_ON = '2026-10-01T00:00:00.000Z'
const profile = { ...emptyProfile(), ...BASELINE_PROFILE, lastUpdated: SET_ON }

function csvFor(from: string, to: string): string {
  const rows = ['interval_start,interval_minutes,battery_discharge_kwh,battery_charge_kwh']
  const end = melbourneDayStart(addDays(to, 1))
  for (let instant = melbourneDayStart(from); instant < end; instant += 15 * 60_000) {
    rows.push(`${melbourneWallTime(instant)},15,0.1,0.05`)
  }
  return rows.join('\n')
}

function seedGoals(months: unknown[] = []) {
  localStorage.setItem(
    GOALS_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      goals: { savings: { target: 300, setOn: SET_ON }, carbon: { target: 500, setOn: SET_ON } },
      completedGoals: [],
      months,
    }),
  )
}

function stored() {
  return JSON.parse(localStorage.getItem(GOALS_STORAGE_KEY) ?? 'null')
}

function renderView() {
  render(
    <GoalsView
      profile={profile}
      bundle={bundle}
      methodologyError=""
      onLogoClick={vi.fn()}
    />,
  )
  return userEvent.setup({ applyAccept: false })
}

async function upload(user: ReturnType<typeof userEvent.setup>, from: string, to: string) {
  return uploadCsv(user, csvFor(from, to))
}

function historyTable() {
  return screen.getByRole('table', { name: /Estimated savings and carbon avoided by month/ })
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
  seedGoals()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('confirm before anything is saved (AC1)', () => {
  it('adds the days in one write and shows updated progress', async () => {
    const user = renderView()
    await upload(user, '2026-09-01', '2026-09-30')
    const spy = vi.spyOn(Storage.prototype, 'setItem')
    await updateGoals(user)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Saved. 30 days were added to your history.')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Your goals' }))
    const [savingsBar] = screen.getAllByRole('progressbar')
    expect(Number(savingsBar.getAttribute('aria-valuenow'))).toBeGreaterThan(0)
    expect(stored().months).toHaveLength(1)
    expect(stored().months[0]).toMatchObject({ month: '2026-09', daysCounted: 30, sourceId: 'tesla' })
  })

  it('keeps the dialog open with a message when the write fails', async () => {
    const user = renderView()
    await upload(user, '2026-09-01', '2026-09-30')
    const before = localStorage.getItem(GOALS_STORAGE_KEY)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full')
    })
    await updateGoals(user)
    const alert = within(uploadDialog()).getByRole('alert')
    expect(alert.textContent).toContain(GOAL_MESSAGES.write_failed.title)
    expect(alert.textContent).toContain(GOAL_MESSAGES.write_failed.nextStep)
    vi.restoreAllMocks()
    expect(localStorage.getItem(GOALS_STORAGE_KEY)).toBe(before)
  })

  it('saves nothing on Cancel and says so', async () => {
    const user = renderView()
    const before = localStorage.getItem(GOALS_STORAGE_KEY)
    await upload(user, '2026-09-01', '2026-09-30')
    await user.click(within(uploadDialog()).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText('Nothing was saved.')).toBeTruthy()
    expect(localStorage.getItem(GOALS_STORAGE_KEY)).toBe(before)
  })
})

describe('history is remembered on this device (AC2)', () => {
  it('shows saved history again after a fresh load', async () => {
    const user = renderView()
    await upload(user, '2026-09-01', '2026-09-30')
    await updateGoals(user)
    cleanup()
    renderView()
    expect(within(historyTable()).getByRole('rowheader', { name: 'Sept 2026' })).toBeTruthy()
  })

  it('treats corrupt stored data as empty without breaking the tab', () => {
    localStorage.setItem(GOALS_STORAGE_KEY, '{"version":1,"goals":')
    renderView()
    expect(screen.getByRole('heading', { name: 'Your goals' })).toBeTruthy()
  })
})

describe('each upload adds only new days (AC3)', () => {
  it('reports skipped days and adds only the rest', async () => {
    const user = renderView()
    await upload(user, '2026-09-01', '2026-09-15')
    await updateGoals(user)
    const dialog = await upload(user, '2026-09-10', '2026-09-30')
    expect(dialog.textContent).toContain('15 days not counted before, 6 days already counted and skipped.')
    await updateGoals(user)
    expect(stored().months[0].daysCounted).toBe(30)
  })

  it('says what the file will add before saving, and when it completes a month', async () => {
    const user = renderView()
    await upload(user, '2026-09-01', '2026-09-15')
    await updateGoals(user)
    const dialog = await upload(user, '2026-09-16', '2026-09-30')
    expect(dialog.textContent).toContain('✓ Tesla file detected · 16 September 2026 to 30 September 2026 · 15 days')
    const summary = within(dialog).getByRole('region', { name: 'This file will add' })
    expect(summary.textContent).toMatch(/\+\$[\d.,]+Savings → \$[\d.,]+ \(\d+%\)/)
    expect(summary.textContent).toMatch(/\+[\d.,]+ kgCarbon → [\d.,]+ kg \(\d+%\)/)
    expect(summary.textContent).toContain('September becomes a full month.')
  })

  it('offers no update when every day is already counted', async () => {
    const user = renderView()
    await upload(user, '2026-09-01', '2026-09-30')
    await updateGoals(user)
    const dialog = await upload(user, '2026-09-01', '2026-09-30')
    expect(dialog.textContent).toContain(GOAL_MESSAGES.already_counted.title)
    expect(within(dialog).getByRole('button', { name: 'Update my goals' })).toHaveProperty('disabled', true)
    expect(dialog.textContent).not.toContain(GOAL_MESSAGES.estimates_unavailable.title)
  })
})

describe('progress history (AC4)', () => {
  it('shows an empty state before any upload', () => {
    renderView()
    const section = screen.getByRole('region', { name: 'Progress history' })
    expect(within(section).getByText('No months counted yet.')).toBeTruthy()
    expect(within(section).queryByRole('table')).toBeNull()
  })

  it('lists a partial month in words and completes it with a later upload', async () => {
    const user = renderView()
    await upload(user, '2026-09-01', '2026-09-12')
    await updateGoals(user)
    const table = historyTable()
    const headers = within(table).getAllByRole('columnheader').map((cell) => cell.textContent)
    expect(headers).toEqual(['Month', 'Days counted', 'Saved', 'Carbon avoided', 'Running total', 'Actions'])
    expect(within(table).getByText('12 of 30 · Partial')).toBeTruthy()
    expect(screen.getByText(/1 month tracked · .* counted to 12 September 2026/)).toBeTruthy()

    await upload(user, '2026-09-13', '2026-09-30')
    await updateGoals(user)
    expect(within(historyTable()).getByText('30 of 30')).toBeTruthy()
    expect(within(historyTable()).queryByText(/Partial/)).toBeNull()
  })

  it('can hide and show the history', async () => {
    const user = renderView()
    const toggle = screen.getByRole('button', { name: 'Hide' })
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    await user.click(toggle)
    expect(screen.getByRole('button', { name: 'Show' }).getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText('No months counted yet.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Upload a file' })).toBeNull()
  })
})

describe('clear my goals and history (AC5)', () => {
  it('asks first, and Escape or Cancel keeps everything', async () => {
    seedGoals([])
    const user = renderView()
    const before = localStorage.getItem(GOALS_STORAGE_KEY)
    await user.click(screen.getByRole('button', { name: 'Clear goals and history' }))
    const dialog = screen.getByRole('dialog', { name: 'Clear your goals and history?' })
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Cancel' }))
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    expect(screen.queryByRole('dialog')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Clear goals and history' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    expect(localStorage.getItem(GOALS_STORAGE_KEY)).toBe(before)
  })

  it('removes only the goals key and returns to first-visit setup', async () => {
    localStorage.setItem(PROFILE_STORAGE_KEY, '{"postcode":"3101"}')
    const user = renderView()
    await upload(user, '2026-09-01', '2026-09-30')
    await updateGoals(user)
    await user.click(screen.getByRole('button', { name: 'Clear goals and history' }))
    await user.click(
      within(screen.getByRole('dialog', { name: 'Clear your goals and history?' })).getByRole('button', {
        name: 'Clear goals and history',
      }),
    )
    expect(localStorage.getItem(GOALS_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(PROFILE_STORAGE_KEY)).toBe('{"postcode":"3101"}')
    expect(screen.getByText('Your goals and history were cleared from this device.')).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Your goals' }))
    expect(screen.queryByRole('region', { name: 'Progress history' })).toBeNull()
  })
})
