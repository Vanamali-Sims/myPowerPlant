/**
 * @vitest-environment jsdom
 *
 * Screen tests for invalid rows, missing days, files already counted, and
 * revised data (US8.7 AC2 to AC5).
 *
 * Rule for every case: nothing is added unless confirmed, and a cancelled,
 * failed, or rejected upload leaves saved data exactly as it was. Reduced
 * motion is on so no confetti runs, and jsdom gets a <dialog> stand-in.
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { GOALS_STORAGE_KEY } from '../../constants/goals'
import { GOAL_MESSAGES } from '../../constants/goalMessages'
import { BASELINE_PROFILE } from '../../data/baselines'
import { addDays } from '../../lib/goals/calendar'
import { formatDayLabel } from '../../lib/goals/goalFormat'
import { melbourneDate, melbourneDayStart, melbourneWallTime } from '../../lib/goals/melbourneTime'
import { seedMethodologyBundle } from '../../lib/methodologyFixture'
import { emptyProfile } from '../../types/profile'
import { GoalsView } from './GoalsView'

const bundle = seedMethodologyBundle()
const SET_ON = '2026-10-01T00:00:00.000Z'
const profile = { ...emptyProfile(), ...BASELINE_PROFILE, lastUpdated: SET_ON }
const HEADER = 'interval_start,interval_minutes,battery_discharge_kwh,battery_charge_kwh'

function rows(from: string, to: string, discharge = 0.1): string[] {
  const out: string[] = []
  const end = melbourneDayStart(addDays(to, 1))
  for (let instant = melbourneDayStart(from); instant < end; instant += 15 * 60_000) {
    out.push(`${melbourneWallTime(instant)},15,${discharge},0.05`)
  }
  return out
}

function csv(from: string, to: string, discharge = 0.1): string {
  return [HEADER, ...rows(from, to, discharge)].join('\n')
}

function seedGoals(savings = 100000, carbon = 100000) {
  localStorage.setItem(
    GOALS_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      goals: { savings: { target: savings, setOn: SET_ON }, carbon: { target: carbon, setOn: SET_ON } },
      completedGoals: [],
      months: [],
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
      onOpenProfile={vi.fn()}
      onStartSetup={vi.fn()}
      onLogoClick={vi.fn()}
    />,
  )
  return userEvent.setup({ applyAccept: false })
}

async function read(user: ReturnType<typeof userEvent.setup>, text: string) {
  const tesla = screen.getByRole('radio', { name: 'Tesla' })
  if (tesla.getAttribute('aria-checked') !== 'true') await user.click(tesla)
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  await user.upload(input, new File([text], 'battery.csv'))
  await user.click(screen.getByRole('button', { name: 'Read file' }))
}

async function continueTo(user: ReturnType<typeof userEvent.setup>, label = 'Continue') {
  await user.click(await screen.findByRole('button', { name: label }))
}

async function uploadAndConfirm(user: ReturnType<typeof userEvent.setup>, text: string) {
  await read(user, text)
  await continueTo(user)
  await user.click(screen.getByRole('button', { name: 'Confirm and save' }))
}

function message(code: keyof typeof GOAL_MESSAGES) {
  return document.querySelector(`[data-code="${code}"]`) as HTMLElement | null
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
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: true,
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
  vi.restoreAllMocks()
})

describe('invalid values in the file (AC2)', () => {
  function withBadRows(count: number): string {
    const lines = [HEADER, ...rows('2026-09-01', '2026-09-03')]
    for (let i = 0; i < count; i += 1) lines[2 + i] = lines[2 + i].replace(',0.1,', ',-1,')
    return lines.join('\n')
  }

  it('lists the first five problems with a count, and can show the rest', async () => {
    const user = renderView()
    await read(user, withBadRows(8))
    const warning = message('invalid_rows')
    expect(warning?.getAttribute('role')).toBe('status')
    expect(warning?.textContent).toContain('8 rows have problems:')
    expect(within(warning as HTMLElement).getAllByRole('listitem').filter((item) => item.textContent?.startsWith('Line'))).toHaveLength(5)
    expect(warning?.textContent).toContain('Line 3, 1 September 2026: A battery value is below zero.')
    const more = within(warning as HTMLElement).getByRole('button', { name: 'Show 3 more' })
    expect(more.getAttribute('aria-expanded')).toBe('false')
    await user.click(more)
    expect(within(warning as HTMLElement).getAllByRole('listitem').filter((item) => item.textContent?.startsWith('Line'))).toHaveLength(8)
    expect(warning?.textContent).toContain('Days left out (1): 1 September 2026.')
  })

  it('continues with only fully valid days and guesses nothing', async () => {
    const user = renderView()
    await read(user, withBadRows(2))
    await continueTo(user, 'Continue with valid days')
    const preview = screen.getByRole('region', { name: 'Estimated savings and carbon' })
    expect(preview.textContent).toContain('2 September 2026 to 3 September 2026, 2 days not counted before.')
    await user.click(screen.getByRole('button', { name: 'Confirm and save' }))
    expect(stored().months[0].coveredRanges).toEqual([['2026-09-02', '2026-09-03']])
  })

  it('can be cancelled with nothing saved', async () => {
    const before = localStorage.getItem(GOALS_STORAGE_KEY)
    const user = renderView()
    await read(user, withBadRows(2))
    await user.click(await screen.findByRole('button', { name: 'Cancel' }))
    expect(localStorage.getItem(GOALS_STORAGE_KEY)).toBe(before)
  })
})

describe('missing days and gaps (AC3)', () => {
  it('names missing days, leaves them uncounted, and shows the month as partial', async () => {
    const user = renderView()
    await uploadAndConfirm(user, csv('2026-09-01', '2026-09-20'))
    await read(user, csv('2026-09-25', '2026-09-30'))
    await continueTo(user)
    const gap = message('missing_days')
    expect(gap?.textContent).toContain('21 September 2026 to 24 September 2026')
    expect(gap?.textContent).toContain(GOAL_MESSAGES.missing_days.nextStep)
    await user.click(screen.getByRole('button', { name: 'Confirm and save' }))
    expect(stored().months[0].daysCounted).toBe(26)
    expect(screen.getByText('Partial, 26 of 30 days')).toBeTruthy()
  })

  it('accepts an older file that fills the gap', async () => {
    const user = renderView()
    await uploadAndConfirm(user, csv('2026-09-01', '2026-09-10'))
    await uploadAndConfirm(user, csv('2026-09-20', '2026-09-30'))
    await read(user, csv('2026-09-11', '2026-09-19'))
    await continueTo(user)
    expect(message('missing_days')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Confirm and save' }))
    expect(stored().months[0].coveredRanges).toEqual([['2026-09-01', '2026-09-30']])
  })
})

describe('file already counted (AC4)', () => {
  it('says so with the date range and offers no Confirm', async () => {
    const user = renderView()
    await uploadAndConfirm(user, csv('2026-09-01', '2026-09-10'))
    const before = localStorage.getItem(GOALS_STORAGE_KEY)
    await read(user, csv('2026-09-01', '2026-09-10'))
    await continueTo(user)
    const info = message('already_counted')
    expect(info?.getAttribute('role')).toBe('status')
    expect(info?.textContent).toContain('1 September 2026 to 10 September 2026 is already in your history.')
    expect(screen.queryByRole('button', { name: 'Confirm and save' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(localStorage.getItem(GOALS_STORAGE_KEY)).toBe(before)
  })
})

describe('revised data for days already counted (AC5)', () => {
  it('shows saved and new figures side by side and keeps saved figures by default', async () => {
    const user = renderView()
    await uploadAndConfirm(user, csv('2026-09-01', '2026-09-20'))
    const savedDischarge = stored().months[0].dischargeKwh as number
    await read(user, csv('2026-09-01', '2026-09-30', 0.2))
    await continueTo(user)
    const revised = message('possibly_revised')
    expect(revised?.getAttribute('role')).toBe('status')
    const table = within(revised as HTMLElement).getByRole('table', { name: /September 2026, the same 20 days/ })
    const discharge = within(table).getByRole('row', { name: /Discharge/ })
    expect(discharge.textContent).toBe('Discharge192 kWh384 kWh')
    await user.click(screen.getByRole('button', { name: 'Confirm and save' }))
    const month = stored().months[0]
    expect(month.revisedOn).toBeUndefined()
    expect(month.daysCounted).toBe(30)
    expect(month.dischargeKwh).toBeCloseTo(savedDischarge + 10 * 96 * 0.2, 6)
  })

  it('needs an extra confirmation, then replaces and marks the month revised', async () => {
    const user = renderView()
    await uploadAndConfirm(user, csv('2026-09-01', '2026-09-20'))
    await read(user, csv('2026-09-01', '2026-09-30', 0.2))
    await continueTo(user)
    await user.click(screen.getByRole('button', { name: 'Replace with the new figures' }))
    expect(stored().months[0].dischargeKwh).toBeCloseTo(192, 6)
    const confirm = screen.getByText(/Replace the saved figures for September 2026/)
    expect(document.activeElement).toBe(confirm)
    await user.click(screen.getByRole('button', { name: 'Keep my saved figures' }))
    expect(screen.getByRole('button', { name: 'Replace with the new figures' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Replace with the new figures' }))
    await user.click(screen.getByRole('button', { name: 'Yes, replace them' }))
    const month = stored().months[0]
    const today = melbourneDate(Date.now())
    expect(month).toMatchObject({ daysCounted: 30, revisedOn: today })
    expect(month.dischargeKwh).toBeCloseTo(30 * 96 * 0.2, 6)
    expect(screen.getByText(`Revised ${formatDayLabel(today)}`)).toBeTruthy()
    expect(screen.getByText('Saved. The figures for September 2026 were replaced with the new figures.')).toBeTruthy()
  })

  it('offers Replace even when every day is already counted', async () => {
    const user = renderView()
    await uploadAndConfirm(user, csv('2026-09-01', '2026-09-10'))
    await read(user, csv('2026-09-01', '2026-09-10', 0.3))
    await continueTo(user)
    expect(screen.getByRole('heading', { name: 'No new days in this file' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Confirm and save' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Replace with the new figures' }))
    await user.click(screen.getByRole('button', { name: 'Yes, replace them' }))
    expect(stored().months[0].dischargeKwh).toBeCloseTo(10 * 96 * 0.3, 6)
  })

  it('never removes a reached goal, and celebrates a goal it newly reaches', async () => {
    seedGoals(100000, 400)
    const user = renderView()
    await uploadAndConfirm(user, csv('2026-09-01', '2026-09-20'))
    expect(stored().completedGoals).toEqual([])
    await read(user, csv('2026-09-01', '2026-09-20', 0.4))
    await continueTo(user)
    await user.click(screen.getByRole('button', { name: 'Replace with the new figures' }))
    await user.click(screen.getByRole('button', { name: 'Yes, replace them' }))
    expect(stored().completedGoals).toHaveLength(1)
    expect(screen.getByRole('dialog', { name: 'You reached your carbon goal' })).toBeTruthy()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }))

    await read(user, csv('2026-09-01', '2026-09-20', 0.1))
    await continueTo(user)
    await user.click(screen.getByRole('button', { name: 'Replace with the new figures' }))
    await user.click(screen.getByRole('button', { name: 'Yes, replace them' }))
    expect(stored().completedGoals).toHaveLength(1)
    expect(screen.queryByRole('dialog', { name: /You reached/ })).toBeNull()
  })

  it('says it cannot check a month the file only partly covers', async () => {
    const user = renderView()
    await uploadAndConfirm(user, csv('2026-09-01', '2026-09-20'))
    await read(user, csv('2026-09-15', '2026-09-30', 0.2))
    await continueTo(user)
    expect(message('possibly_revised')).toBeNull()
    expect(message('revision_unchecked')?.textContent).toContain('September 2026.')
  })

  it('keeps everything as it was when the replace cannot be saved', async () => {
    const user = renderView()
    await uploadAndConfirm(user, csv('2026-09-01', '2026-09-20'))
    await read(user, csv('2026-09-01', '2026-09-30', 0.2))
    await continueTo(user)
    const before = localStorage.getItem(GOALS_STORAGE_KEY)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full')
    })
    await user.click(screen.getByRole('button', { name: 'Replace with the new figures' }))
    await user.click(screen.getByRole('button', { name: 'Yes, replace them' }))
    vi.restoreAllMocks()
    expect(localStorage.getItem(GOALS_STORAGE_KEY)).toBe(before)
    expect(message('write_failed')?.getAttribute('role')).toBe('alert')
    expect(screen.getByRole('region', { name: 'Estimated savings and carbon' })).toBeTruthy()
  })
})
