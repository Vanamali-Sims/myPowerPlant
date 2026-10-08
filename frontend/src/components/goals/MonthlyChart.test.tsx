/**
 * @vitest-environment jsdom
 *
 * Screen tests for the monthly progress graph (US8.5 AC2, AC5).
 *
 * jsdom has no layout, so ResizeObserver and matchMedia are stubbed and
 * elements report a fixed 640 × 280 box for the chart to measure.
 */
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { GoalKind, GoalEntry, MonthRecord } from '../../types/goals'
import { MonthlyChart } from './MonthlyChart'

const SET_ON = '2026-10-01T00:00:00.000Z'
const goals: Record<GoalKind, GoalEntry> = {
  savings: { target: 300, setOn: SET_ON },
  carbon: { target: 500, setOn: SET_ON },
}

function month(label: string, savings: number, carbon: number, daysCounted?: number): MonthRecord {
  const [year, index] = label.split('-').map(Number)
  const daysInMonth = new Date(Date.UTC(year, index, 0)).getUTCDate()
  const counted = daysCounted ?? daysInMonth
  return {
    month: label,
    daysInMonth,
    daysCounted: counted,
    coveredRanges: [[`${label}-01`, `${label}-${String(counted).padStart(2, '0')}`]],
    savingsAud: savings,
    carbonKg: carbon,
    dischargeKwh: 10,
    intakeKwh: 5,
    sourceId: 'tesla',
    updatedOn: SET_ON,
  }
}

const history = [month('2026-08', 60, 100), month('2026-09', 90, 150), month('2026-10', 30, 40, 12)]

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 640,
    bottom: 280,
    width: 640,
    height: 280,
    toJSON: () => ({}),
  })
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(640)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(280)
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(640)
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(280)
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function panel() {
  return document.querySelector('.goals-chart__panel') as HTMLElement
}

describe('monthly graph from history (AC2)', () => {
  it('shows the latest month in a visible panel with exact figures', () => {
    render(<MonthlyChart months={history} goals={goals} onGoToUpload={vi.fn()} />)
    expect(panel().getAttribute('aria-live')).toBe('polite')
    expect(panel().textContent).toContain('October 2026: Partial, 12 of 31 days')
    expect(panel().textContent).toContain('Estimated savings this month$30')
    expect(panel().textContent).toContain('Running total$180 of $300, 60 percent')
    expect(within(panel()).getByText('Estimate')).toBeTruthy()
  })

  it('switches between savings and carbon with aria-pressed', async () => {
    const user = userEvent.setup()
    render(<MonthlyChart months={history} goals={goals} onGoToUpload={vi.fn()} />)
    const savings = screen.getByRole('button', { name: 'Savings' })
    const carbon = screen.getByRole('button', { name: 'Carbon' })
    expect(savings.getAttribute('aria-pressed')).toBe('true')
    expect(carbon.getAttribute('aria-pressed')).toBe('false')
    await user.click(carbon)
    expect(carbon.getAttribute('aria-pressed')).toBe('true')
    expect(panel().textContent).toContain('Running total290 kg CO2e of 500 kg CO2e, 58 percent')
  })

  it('lets any month be chosen with the keyboard and shows its figures', async () => {
    const user = userEvent.setup()
    render(<MonthlyChart months={history} goals={goals} onGoToUpload={vi.fn()} />)
    const months = within(screen.getByRole('group', { name: 'Choose a month' })).getAllByRole('button')
    expect(months.map((button) => button.textContent)).toEqual(['Aug 2026', 'Sept 2026', 'Oct 2026 (Partial)'])
    months[0].focus()
    await user.keyboard('{Enter}')
    expect(months[0].getAttribute('aria-pressed')).toBe('true')
    expect(panel().textContent).toContain('August 2026')
    expect(panel().textContent).toContain('Running total$60 of $300, 20 percent')
    await user.tab()
    expect(document.activeElement).toBe(months[1])
  })

  it('moves the panel with the arrow keys inside the chart', async () => {
    render(<MonthlyChart months={history} goals={goals} onGoToUpload={vi.fn()} />)
    const surface = document.querySelector('svg.recharts-surface') as SVGSVGElement
    expect(surface.getAttribute('tabindex')).toBe('0')
    await act(async () => {
      surface.focus()
      fireEvent.focus(surface)
    })
    expect(panel().textContent).toContain('August 2026')
    await act(async () => {
      fireEvent.keyDown(surface, { key: 'ArrowRight' })
    })
    expect(panel().textContent).toContain('September 2026')
    await act(async () => {
      fireEvent.keyDown(surface, { key: 'ArrowRight' })
    })
    expect(panel().textContent).toContain('October 2026')
  })

  it('hatches and labels partial months in words', () => {
    const { container } = render(<MonthlyChart months={history} goals={goals} onGoToUpload={vi.fn()} />)
    expect(container.querySelector('pattern#goals-hatch')).not.toBeNull()
    const partial = container.querySelectorAll('.goals-chart__bar.is-partial')
    expect(partial.length).toBeGreaterThan(0)
    expect(container.querySelector('.goals-chart__partial-label')?.textContent).toBe('Partial')
  })

  it('draws the goal line with its value', () => {
    const { container } = render(<MonthlyChart months={history} goals={goals} onGoToUpload={vi.fn()} />)
    expect(container.querySelector('.goals-chart__goal-label')?.textContent).toBe('Goal $300')
    const surface = container.querySelector('svg.recharts-surface')
    expect(surface?.getAttribute('role')).toBe('application')
    expect(surface?.querySelector('title')?.textContent).toBe('Monthly savings and running total')
    expect(surface?.querySelector('desc')?.textContent).toContain('month-by-month table below')
  })
})

describe('before there is any history (AC5)', () => {
  it('prompts to upload instead of drawing an empty graph', async () => {
    const user = userEvent.setup()
    const onGoToUpload = vi.fn()
    render(<MonthlyChart months={[]} goals={goals} onGoToUpload={onGoToUpload} />)
    expect(screen.getByText('Your monthly graph appears after your first confirmed upload.')).toBeTruthy()
    expect(document.querySelector('.recharts-wrapper')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Go to upload' }))
    expect(onGoToUpload).toHaveBeenCalledOnce()
  })
})
