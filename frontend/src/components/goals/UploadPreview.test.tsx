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

function seedGoals(savings: number, carbon: number) {
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

async function openPreview(options: { profile?: ProfileData; withIntake?: boolean } = {}) {
  const user = userEvent.setup({ applyAccept: false })
  render(
    <GoalsView
      profile={options.profile ?? savedProfile()}
      bundle={bundle}
      methodologyError=""
      onOpenProfile={vi.fn()}
      onStartSetup={vi.fn()}
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

// 30 days × 96 × (0.1 + 0.05) = 432 kWh of battery energy.
const ENERGY_KWH = 432

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
    const context = buildCalculationContext(savedProfile(), bundle)
    const text = section.textContent ?? ''
    expect(text).toContain('1 September 2026 to 30 September 2026, 30 days.')
    expect(text).toContain(`Estimated savings${formatGoalAud(ENERGY_KWH * context.rate)}Estimate`)
    expect(text).toContain(`Estimated carbon avoided${Math.round(ENERGY_KWH * context.factor)} kg CO2eEstimate`)
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
    expect(text).toContain('Battery energy = discharge + intake.')
    expect(text).toContain(`× ${bundle.methodology.vicGridKgCo2PerKwh} =`)
    expect(text).toContain(`Emissions factor: ${EMISSIONS_FACTOR_SOURCE.label}`)
    expect(text).toContain(`Typical rate: ${TYPICAL_RATE_SOURCE.label}`)
    expect(text).toContain(`Last verified: ${TYPICAL_RATE_SOURCE.lastVerified}`)
  })

  it('labels the typical rate with the number from the methodology data', async () => {
    const { section } = await openPreview()
    const rate = bundle.methodology.defaultRetailRate.toFixed(2)
    expect(section.textContent).toContain(
      `Savings use an estimated rate (about $${rate} per kWh, typical for Victoria).`,
    )
  })

  it("labels the household's own rate when the report marks it from_you", async () => {
    const own = savedProfile({
      monthlyBill: '200',
      monthlyKwh: '500',
      fieldSources: { monthlyBill: 'user', monthlyKwh: 'user' },
    })
    const { section } = await openPreview({ profile: own })
    expect(section.textContent).toContain("Savings use your household's rate ($0.40 per kWh).")
  })
})

describe('all battery activity counts (AC3)', () => {
  it('breaks battery energy into discharge, intake, and total', async () => {
    const { section } = await openPreview()
    const text = section.querySelector('.goals-preview__breakdown')?.textContent ?? ''
    expect(text).toContain('Discharge (energy given out)288 kWh')
    expect(text).toContain('Intake (energy taken in)144 kWh')
    expect(text).toContain('Total battery energy432 kWh')
  })

  it('says intake is missing when the file has no intake column, without filling it', async () => {
    const { section } = await openPreview({ withIntake: false })
    const text = section.querySelector('.goals-preview__breakdown')?.textContent ?? ''
    expect(text).toContain('Intake (energy taken in)Not in your file')
    expect(text).toContain('Total battery energy288 kWh')
    expect(section.textContent).toContain('intake is missing and only discharge is counted')
  })
})

describe('progress against goals if confirmed (AC4)', () => {
  it('shows figure and percentage per goal, not saved yet, with Confirm and Cancel', async () => {
    const { section } = await openPreview()
    const context = buildCalculationContext(savedProfile(), bundle)
    const savings = ENERGY_KWH * context.rate
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
