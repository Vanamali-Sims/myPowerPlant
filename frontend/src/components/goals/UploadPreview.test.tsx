/**
 * @vitest-environment jsdom
 *
 * Screen tests for the estimate preview (US8.3 AC1 to AC4).
 *
 * Runs the real flow: saved goals, choose Tesla, read a file, Continue.
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { EMISSIONS_FACTOR_SOURCE, GOALS_STORAGE_KEY, TYPICAL_RATE_SOURCE } from '../../constants/goals'
import { BASELINE_PROFILE } from '../../data/baselines'
import { buildCalculationContext } from '../../lib/goals/calculate'
import { addDays } from '../../lib/goals/calendar'
import { formatGoalAud } from '../../lib/goals/goalFormat'
import { melbourneDayStart, melbourneWallTime } from '../../lib/goals/melbourneTime'
import { seedMethodologyBundle } from '../../lib/methodologyFixture'
import { emptyProfile, type ProfileData } from '../../types/profile'
import { GoalsView } from './GoalsView'

const bundle = seedMethodologyBundle()
const SET_ON = '2026-10-01T00:00:00.000Z'

function savedProfile(overrides: Partial<ProfileData> = {}): ProfileData {
  return { ...emptyProfile(), ...BASELINE_PROFILE, monthlyKwh: '', lastUpdated: SET_ON, ...overrides }
}

/** September 2026: 30 days × 96 intervals of 0.1 kWh out and 0.05 kWh in. */
function septemberCsv(withIntake = true): string {
  const header = withIntake
    ? 'interval_start,interval_minutes,battery_discharge_kwh,battery_charge_kwh'
    : 'interval_start,interval_minutes,battery_discharge_kwh'
  const rows = [header]
  const end = melbourneDayStart(addDays('2026-09-30', 1))
  for (let instant = melbourneDayStart('2026-09-01'); instant < end; instant += 15 * 60_000) {
    rows.push(`${melbourneWallTime(instant)},15,0.1${withIntake ? ',0.05' : ''}`)
  }
  return rows.join('\n')
}

function seedGoals(savings: number, carbon: number, ratePerKwh: number | null = null) {
  localStorage.setItem(
    GOALS_STORAGE_KEY,
    JSON.stringify({
      version: 2,
      goals: { savings: { target: savings, setOn: SET_ON }, carbon: { target: carbon, setOn: SET_ON } },
      completedGoals: [],
      months: [],
      baseline: {
        month: '2026-08',
        days: 31,
        monthly: { savings: 30, carbon: 20 },
        battery: { model: 'Tesla Powerwall 2', units: 1 },
        ratePerKwh,
        setOn: SET_ON,
      },
    }),
  )
}

async function openPreview(options: { withIntake?: boolean } = {}) {
  const user = userEvent.setup({ applyAccept: false })
  render(
    <GoalsView
      profile={savedProfile()}
      bundle={bundle}
      methodologyError=""
      onLogoClick={vi.fn()}
    />,
  )
  await user.click(screen.getByRole('radio', { name: 'Tesla' }))
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  await user.upload(input, new File([septemberCsv(options.withIntake ?? true)], 'sept.csv'))
  await user.click(screen.getByRole('button', { name: 'Read file' }))
  await user.click(await screen.findByRole('button', { name: 'Continue' }))
  const section = screen.getByRole('region', { name: 'Estimated savings and carbon' })
  return { user, section }
}

// Only discharge counts: 30 days × 96 × 0.1 = 288 kWh.
const ENERGY_KWH = 288
const typical = buildCalculationContext(null, bundle)

beforeEach(() => {
  localStorage.clear()
  seedGoals(300, 500)
})

afterEach(() => {
  cleanup()
})

describe('estimated savings and carbon after reading (AC1)', () => {
  it('shows both estimates, labelled, with the date range and day count, and takes focus', async () => {
    const { section } = await openPreview()
    expect(document.activeElement).toBe(within(section).getByRole('heading', { level: 2 }))
    const text = section.textContent ?? ''
    expect(text).toContain('1 September 2026 to 30 September 2026, 30 days not counted before.')
    expect(text).toContain(`Estimated savings${formatGoalAud(ENERGY_KWH * typical.rate)}Estimate`)
    expect(text).toContain(`Estimated carbon avoided${Math.round(ENERGY_KWH * typical.factor)} kg CO2eEstimate`)
    expect(within(section).getAllByText('Not a bill or metered result.')).toHaveLength(2)
  })
})

describe('same calculation rules, explained (AC2)', () => {
  it('opens the steps with the factor and rate sources', async () => {
    const { user, section } = await openPreview()
    const toggle = within(section).getByRole('button', { name: 'How was this calculated?' })
    await user.click(toggle)
    const panel = document.getElementById(toggle.getAttribute('aria-controls') ?? '')
    const text = panel?.textContent ?? ''
    expect(text).toContain('Battery energy counted = discharge only.')
    expect(text).toContain(`× ${bundle.methodology.vicGridKgCo2PerKwh} =`)
    expect(text).toContain(`Emissions factor: ${EMISSIONS_FACTOR_SOURCE.label}`)
    expect(text).toContain(`Typical rate: ${TYPICAL_RATE_SOURCE.label}`)
    expect(text).toContain(`Last verified: ${TYPICAL_RATE_SOURCE.lastVerified}`)
  })

  it('says the typical Victorian rate is used when no rate was entered', async () => {
    const { section } = await openPreview()
    const rate = bundle.methodology.defaultRetailRate.toFixed(2)
    expect(section.textContent).toContain(
      `Savings use the typical Victorian rate (about $${rate} per kWh), because no rate was entered.`,
    )
  })

  it('uses and labels the rate the person entered', async () => {
    seedGoals(300, 500, 0.4)
    const { section } = await openPreview()
    expect(section.textContent).toContain('Savings use your usage rate ($0.40 per kWh).')
    expect(section.textContent).toContain(`Estimated savings${formatGoalAud(ENERGY_KWH * 0.4)}Estimate`)
  })
})

describe('only discharge counts (AC3)', () => {
  it('shows discharge as the energy counted and says intake is not counted', async () => {
    const { section } = await openPreview()
    const text = section.querySelector('.goals-preview__breakdown')?.textContent ?? ''
    expect(text).toBe('Discharge (energy given out)288 kWh')
    expect(section.textContent).toContain('Only energy your battery gave out is counted. Energy it took in is not.')
  })

  it('gives the same figures whether or not the file has an intake column', async () => {
    const { section } = await openPreview({ withIntake: false })
    expect(section.textContent).toContain(`Estimated savings${formatGoalAud(ENERGY_KWH * typical.rate)}Estimate`)
  })
})

describe('progress against goals if confirmed (AC4)', () => {
  it('shows figure and percentage per goal, not saved yet, with Confirm and Cancel', async () => {
    const { section } = await openPreview()
    const savings = ENERGY_KWH * typical.rate
    const bars = within(section).getAllByRole('progressbar')
    expect(bars).toHaveLength(2)
    expect(bars[0].getAttribute('aria-valuetext')).toBe(
      `${formatGoalAud(savings)} of $300, ${Math.floor((savings / 300) * 100)} percent`,
    )
    expect(within(section).getByText('Not saved yet')).toBeTruthy()
    expect(within(section).getByRole('button', { name: 'Confirm and save' })).toBeTruthy()
    expect(within(section).getByRole('button', { name: 'Cancel' })).toBeTruthy()
  })

  it('caps the bar at 100 but keeps the real figure in the text', async () => {
    seedGoals(10, 10)
    const { section } = await openPreview()
    const [savingsBar, carbonBar] = within(section).getAllByRole('progressbar')
    expect(savingsBar.getAttribute('aria-valuenow')).toBe('100')
    expect(carbonBar.getAttribute('aria-valuenow')).toBe('100')
    const realPercent = Number(/(\d[\d,]*) percent/.exec(carbonBar.getAttribute('aria-valuetext') ?? '')?.[1].replace(/,/g, ''))
    expect(realPercent).toBeGreaterThan(100)
  })

  it('saves nothing on Cancel and says so', async () => {
    const before = localStorage.getItem(GOALS_STORAGE_KEY)
    const { user, section } = await openPreview()
    await user.click(within(section).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('region', { name: 'Estimated savings and carbon' })).toBeNull()
    expect(screen.getByText('Nothing was saved.')).toBeTruthy()
    expect(localStorage.getItem(GOALS_STORAGE_KEY)).toBe(before)
  })
})
