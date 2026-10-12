/**
 * @vitest-environment jsdom
 *
 * Screen tests for the Get Reminded page: next best day, the forecast chart,
 * the recommended days with switches, and "Download selected".
 *
 * The methodology data and weather forecast are mocked, and the calendar
 * download is a spy, so nothing leaves the test.
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { BASELINE_PROFILE } from '../../data/baselines'
import { seedMethodologyBundle } from '../../lib/methodologyFixture'
import { loadReminders } from '../../lib/reminderStorage'
import type { ForecastPoint, SolarInputs } from '../../lib/solarForecast'
import { emptyProfile, type ProfileData } from '../../types/profile'
import type { EventType } from '../../types/reminders'
import { RemindersView } from './RemindersView'

const bundle = seedMethodologyBundle()

const mocks = vi.hoisted(() => ({
  fetchSolarForecast: vi.fn(),
  downloadIcsFile: vi.fn(),
}))

vi.mock('../../lib/methodologyApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/methodologyApi')>()),
  fetchMethodology: () => Promise.resolve({ ok: true, data: bundle }),
}))

vi.mock('../../lib/solarForecast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/solarForecast')>()),
  fetchSolarForecast: mocks.fetchSolarForecast,
}))

vi.mock('../../lib/calendarExport', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/calendarExport')>()),
  downloadIcsFile: mocks.downloadIcsFile,
}))

const profile: ProfileData = { ...emptyProfile(), ...BASELINE_PROFILE, reservePercent: '20' }

/** The page's typical day for this profile, from the same methodology figures. */
function typicalDay(inputs: SolarInputs): number {
  return (
    inputs.systemKw *
    bundle.methodology.melbournePeakSunHours *
    bundle.methodology.solarPerformanceRatio *
    inputs.orientationFactor
  )
}

const DATES = ['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16']
// Multiples of a typical day: Sat, Sun, Tue, Thu clear the 20% reserve margin; Mon falls 20% under.
const MULTIPLES = [1.46, 1.53, 0.7, 1.39, 1.08, 1.42, 1.01]

beforeEach(() => {
  localStorage.clear()
  mocks.downloadIcsFile.mockReset()
  mocks.fetchSolarForecast.mockReset()
  mocks.fetchSolarForecast.mockImplementation((inputs: SolarInputs) => {
    const typical = typicalDay(inputs)
    const daily: ForecastPoint[] = DATES.map((date, index) => ({
      date,
      label: new Date(`${date}T00:00:00`).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric' }),
      kwh: typical * MULTIPLES[index],
    }))
    return Promise.resolve({ hourlyToday: [], daily, placeLabel: '' })
  })
})

afterEach(() => {
  cleanup()
})

function Harness({ initial = 'discharge' as EventType, data = profile }) {
  const [eventType, setEventType] = useState<EventType>(initial)
  const [period, setPeriod] = useState('7')
  return (
    <RemindersView
      profile={data}
      onLogoClick={vi.fn()}
      eventType={eventType}
      onEventType={setEventType}
      reminderPeriodDays={period}
      onReminderPeriodDays={setPeriod}
    />
  )
}

async function renderPage(data = profile) {
  render(<Harness data={data} />)
  await screen.findByRole('heading', { name: 'Remind me' })
  return userEvent.setup()
}

function days() {
  return within(screen.getByRole('list')).getAllByRole('listitem')
}

describe('Get Reminded page', () => {
  it('shows the next best day, the chart, and each recommended day against the target', async () => {
    await renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'Get Reminded' })).toBeTruthy()
    expect(screen.getByText('Know when to share or keep.')).toBeTruthy()
    expect(screen.getByLabelText('Reminder period')).toHaveProperty('value', '7')
    expect(screen.getByRole('radio', { name: 'Discharge' }).getAttribute('aria-checked')).toBe('true')

    expect(screen.getByRole('heading', { level: 2, name: 'Saturday, 10 October' })).toBeTruthy()
    expect(screen.getByText(/forecast · 46% above a typical day$/)).toBeTruthy()
    expect(screen.getByRole('img', { name: /Predicted solar generation/ }).getAttribute('aria-label')).toMatch(
      /Target [\d.]+ kWh/,
    )

    expect(screen.getByRole('img', { name: /Predicted solar generation/ }).textContent).toContain('kWh/day')
    expect(screen.getByText('Here are the 4 recommended days.')).toBeTruthy()
    expect(days()).toHaveLength(4)
    expect(days()[0].textContent).toContain('SAT10')
    expect(days()[0].textContent).toContain('+22% above target')
  })

  it('downloads only the selected days and remembers them on this device', async () => {
    const user = await renderPage()
    const download = screen.getByRole('button', { name: 'Download selected' })
    expect(download).toHaveProperty('disabled', true)

    await user.click(screen.getByRole('switch', { name: 'Remind me on Saturday, 10 October' }))
    await user.click(screen.getByRole('switch', { name: 'Remind me on Sunday, 11 October' }))
    expect(screen.getByRole('switch', { name: 'Remind me on Saturday, 10 October' }).getAttribute('aria-checked')).toBe(
      'true',
    )
    expect(download.textContent).toBe('Download selected - 2')
    await user.click(download)

    expect(mocks.downloadIcsFile).toHaveBeenCalledOnce()
    expect(mocks.downloadIcsFile.mock.calls[0][1]).toContain('BEGIN:VCALENDAR')
    expect(loadReminders().map((row) => row.date)).toEqual(['2026-10-10', '2026-10-11'])
    expect(screen.getByText('2 days saved to your calendar file.')).toBeTruthy()
  })

  it('downloads every recommended day with Download all, without selecting any', async () => {
    const user = await renderPage()
    await user.click(screen.getByRole('button', { name: 'Download all' }))
    expect(mocks.downloadIcsFile).toHaveBeenCalledOnce()
    expect(loadReminders()).toHaveLength(4)
    expect(screen.getAllByRole('switch').every((item) => item.getAttribute('aria-checked') === 'true')).toBe(true)
    expect(screen.getByText('4 days saved to your calendar file.')).toBeTruthy()
  })

  it('starts with downloaded days switched on, and switching one off takes it off the list', async () => {
    localStorage.setItem(
      'mypowerplant.reminders',
      JSON.stringify([{ date: '2026-10-13', eventType: 'discharge', savedOn: '2026-10-09T00:00:00.000Z' }]),
    )
    const user = await renderPage()
    const tuesday = screen.getByRole('switch', { name: 'Remind me on Tuesday, 13 October' })
    expect(tuesday.getAttribute('aria-checked')).toBe('true')
    await user.click(tuesday)
    expect(tuesday.getAttribute('aria-checked')).toBe('false')
    expect(loadReminders()).toEqual([])
  })

  it('switches to opt-out days below the target', async () => {
    const user = await renderPage()
    await user.click(screen.getByRole('radio', { name: 'Opt-out' }))
    expect(days()).toHaveLength(1)
    expect(screen.getByText('Here is the 1 recommended day.')).toBeTruthy()
    expect(days()[0].textContent).toContain('MON12')
    expect(days()[0].textContent).toMatch(/−\d+% below target/)
  })

  it('takes the system from the profile, with a typical panel rating when none was given', async () => {
    await renderPage({ ...profile, panelWatts: '' })
    const inputs = mocks.fetchSolarForecast.mock.calls[0][0] as SolarInputs
    expect(inputs.systemKw).toBeCloseTo((12 * 300) / 1000, 10)
    expect(screen.getByText(/Open-Meteo forecast for Kew/)).toBeTruthy()
  })
})
