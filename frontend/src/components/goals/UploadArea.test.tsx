/**
 * @vitest-environment jsdom
 *
 * Screen tests for uploading a battery file privately (US8.2 AC1 to AC4, AC6).
 *
 * fetch, XMLHttpRequest, and sendBeacon are watched through the whole flow to
 * show the file never leaves the browser.
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { GOALS_STORAGE_KEY } from '../../constants/goals'
import { REASON_MESSAGES } from '../../constants/goalMessages'
import { BASELINE_PROFILE } from '../../data/baselines'
import { addDays } from '../../lib/goals/calendar'
import { melbourneDayStart, melbourneWallTime } from '../../lib/goals/melbourneTime'
import { seedMethodologyBundle } from '../../lib/methodologyFixture'
import { emptyProfile } from '../../types/profile'
import { GoalsView } from './GoalsView'
import { UploadArea } from './UploadArea'

const HEADER = 'interval_start,interval_minutes,battery_discharge_kwh,battery_charge_kwh'
const LIMITS = { maxIntervalKwh: 13.5 }

function monthCsv(from = '2026-09-01', to = '2026-09-30'): string {
  const rows = [HEADER]
  const end = melbourneDayStart(addDays(to, 1))
  for (let instant = melbourneDayStart(from); instant < end; instant += 15 * 60_000) {
    rows.push(`${melbourneWallTime(instant)},15,0.1,0.05`)
  }
  return rows.join('\n')
}

function csvFile(text = monthCsv(), name = 'september.csv'): File {
  return new File([text], name, { type: 'text/csv' })
}

function renderArea(overrides: Partial<Parameters<typeof UploadArea>[0]> = {}) {
  const onContinue = vi.fn()
  const onGoToSetup = vi.fn()
  render(
    <UploadArea
      locked={false}
      canGoToSetup={false}
      onGoToSetup={onGoToSetup}
      limits={LIMITS}
      onContinue={onContinue}
      {...overrides}
    />,
  )
  return { onContinue, onGoToSetup, user: userEvent.setup({ applyAccept: false }) }
}

async function chooseTesla(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('radio', { name: 'Tesla' }))
}

function fileInput(): HTMLInputElement {
  const input = document.querySelector('input[type="file"]')
  if (!(input instanceof HTMLInputElement)) throw new Error('no file input')
  return input
}

const network = {
  fetch: vi.fn(),
  beacon: vi.fn(),
  xhrOpen: vi.fn(),
}

beforeEach(() => {
  localStorage.clear()
  network.fetch.mockReset()
  network.beacon.mockReset()
  network.xhrOpen.mockReset()
  vi.stubGlobal('fetch', network.fetch)
  Object.defineProperty(navigator, 'sendBeacon', { value: network.beacon, configurable: true })
  vi.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(network.xhrOpen)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  expect(network.fetch).not.toHaveBeenCalled()
  expect(network.beacon).not.toHaveBeenCalled()
  expect(network.xhrOpen).not.toHaveBeenCalled()
})

describe('upload before goals are saved (AC1)', () => {
  it('shows only the baseline upload for a recent file, not the progress upload', () => {
    render(
      <GoalsView
        profile={{ ...emptyProfile(), ...BASELINE_PROFILE, lastUpdated: '2026-10-01T00:00:00.000Z' }}
        bundle={seedMethodologyBundle()}
        methodologyError=""
        onLogoClick={vi.fn()}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Your goals' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Add your battery file' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Add your battery file' })).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Upload your battery file' })).toBeNull()
    expect(screen.queryByText('Upload unlocks after both goals are saved.')).toBeNull()
  })
})

describe('providers and how to get the file (AC2)', () => {
  it('offers Tesla and Amber with nothing chosen, and says the file stays on the device', () => {
    renderArea()
    const group = screen.getByRole('radiogroup', { name: 'VPP provider' })
    const radios = within(group).getAllByRole('radio')
    expect(radios.map((radio) => radio.textContent)).toEqual(['Tesla', 'Amber'])
    expect(radios.every((radio) => radio.getAttribute('aria-checked') === 'false')).toBe(true)
    expect(screen.getByText(/read on this device only/)).toBeTruthy()
    expect(screen.queryByText(/not confirmed/i)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Choose file' })).toBeNull()
  })

  it('shows the steps, template download, and columns in one disclosure', async () => {
    const { user } = renderArea()
    const toggle = screen.getByRole('button', { name: 'How to get your file' })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    await user.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    const panel = document.getElementById(toggle.getAttribute('aria-controls') ?? '')
    const text = panel?.textContent ?? ''
    expect(text).toContain('Go to your VPP provider app (Tesla or Amber) and download the CSV file.')
    expect(text).toContain('For the template we use, you can download it here.')
    expect(within(panel as HTMLElement).getByRole('button', { name: 'download it here' })).toBeTruthy()
    for (const name of ['interval_start', 'interval_minutes', 'battery_discharge_kwh']) {
      expect(text).toContain(`${name} (required)`)
    }
    expect(text).toContain('battery_charge_kwh (optional)')
  })

  it.each(['Tesla', 'Amber'])('lets a file be added once %s is chosen', async (label) => {
    const { user } = renderArea()
    await user.click(screen.getByRole('radio', { name: label }))
    expect(screen.getByRole('radio', { name: label }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('button', { name: 'Choose file' })).toBeTruthy()
  })
})

describe('choosing a file (AC3)', () => {
  it('shows the name and size and reads nothing until Read file', async () => {
    const textSpy = vi.spyOn(File.prototype, 'text')
    const { user } = renderArea()
    await chooseTesla(user)
    await user.upload(fileInput(), csvFile())
    expect(screen.getByText('september.csv')).toBeTruthy()
    expect(screen.getByText(/\(\d+(\.\d)? KB\)/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Read file' })).toBeTruthy()
    expect(textSpy).not.toHaveBeenCalled()
  })

  it('accepts a dropped file', async () => {
    const { user } = renderArea()
    await chooseTesla(user)
    const zone = document.querySelector('.goals-file__drop')
    if (!zone) throw new Error('no drop zone')
    fireEvent.dragOver(zone)
    fireEvent.drop(zone, { dataTransfer: { files: [csvFile(monthCsv(), 'dropped.csv')] } })
    expect(screen.getByText('dropped.csv')).toBeTruthy()
  })

  it('removes the file and returns focus to Choose file', async () => {
    const { user } = renderArea()
    await chooseTesla(user)
    await user.upload(fileInput(), csvFile())
    await user.click(screen.getByRole('button', { name: 'Remove' }))
    expect(screen.queryByText('september.csv')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Choose file' }))
  })
})

describe('reading in the browser and the summary (AC4, AC6)', () => {
  it('reads the file, announces it, and moves focus to the summary', async () => {
    const { user } = renderArea()
    await chooseTesla(user)
    await user.upload(fileInput(), csvFile())
    await user.click(screen.getByRole('button', { name: 'Read file' }))
    const heading = await screen.findByRole('heading', { name: 'File read' })
    expect(document.activeElement).toBe(heading)
    expect(screen.getByRole('status').textContent).toBe('Your file was read.')
    const facts = document.querySelector('.goals-summary__facts')?.textContent ?? ''
    expect(facts).toContain('Tesla')
    expect(facts).toContain('1 September 2026')
    expect(facts).toContain('30 September 2026')
    expect(facts).toContain('Complete days read30')
    expect(screen.getByText('Nothing has been added to your totals yet.')).toBeTruthy()
  })

  it('hands the days on with Continue and saves nothing', async () => {
    const { user, onContinue } = renderArea()
    await chooseTesla(user)
    await user.upload(fileInput(), csvFile())
    await user.click(screen.getByRole('button', { name: 'Read file' }))
    await user.click(await screen.findByRole('button', { name: 'Continue' }))
    expect(onContinue).toHaveBeenCalledOnce()
    expect(onContinue.mock.calls[0][0].days).toHaveLength(30)
    expect(localStorage.getItem(GOALS_STORAGE_KEY)).toBeNull()
  })

  it('cancels without saving and clears the file', async () => {
    const { user, onContinue } = renderArea()
    await chooseTesla(user)
    await user.upload(fileInput(), csvFile())
    await user.click(screen.getByRole('button', { name: 'Read file' }))
    await user.click(await screen.findByRole('button', { name: 'Cancel' }))
    expect(onContinue).not.toHaveBeenCalled()
    expect(screen.queryByRole('heading', { name: 'File read' })).toBeNull()
    expect(screen.getByRole('status').textContent).toBe('Nothing was saved.')
    expect(localStorage.getItem(GOALS_STORAGE_KEY)).toBeNull()
  })

  it.each([
    ['a file that is not a CSV', csvFile('x', 'battery.xlsx'), 'not_csv'],
    ['a file missing columns', csvFile('interval_start\n2026-09-01 00:00'), 'missing_columns'],
  ] as const)('explains %s and offers another file', async (_label, file, reason) => {
    const { user } = renderArea()
    await chooseTesla(user)
    await user.upload(fileInput(), file)
    await user.click(screen.getByRole('button', { name: 'Read file' }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(REASON_MESSAGES[reason])
    if (reason === 'missing_columns') {
      expect(alert.textContent).toContain('Missing: interval_minutes, battery_discharge_kwh.')
    }
    expect(alert.textContent).toContain('What to do next:')
    await user.click(within(alert).getByRole('button', { name: 'See how to get your file' }))
    const guide = screen.getByRole('button', { name: 'How to get your file' })
    expect(guide.getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(guide)
    await user.click(within(alert).getByRole('button', { name: 'Choose another file' }))
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Choose file' }))
  })

  it('does not read files when estimate data is unavailable', () => {
    renderArea({ limits: null })
    expect(screen.getByText(/Estimates are unavailable right now/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Choose file' })).toBeNull()
  })
})
