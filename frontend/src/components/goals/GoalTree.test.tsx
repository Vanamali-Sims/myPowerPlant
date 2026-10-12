/**
 * @vitest-environment jsdom
 *
 * Screen tests for the goal tree and the page before any history (US8.5 AC1, AC5).
 *
 * matchMedia is stubbed so each test can choose whether reduced motion is on.
 */
import { act, cleanup, render, renderHook, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { GOALS_STORAGE_KEY } from '../../constants/goals'
import { BASELINE_PROFILE } from '../../data/baselines'
import { seedMethodologyBundle } from '../../lib/methodologyFixture'
import { useReducedMotion } from '../../lib/useReducedMotion'
import { emptyProfile } from '../../types/profile'
import { GoalTree } from './GoalTree'
import { GoalsView } from './GoalsView'

let reduce = true
const listeners = new Set<() => void>()

beforeEach(() => {
  reduce = true
  listeners.clear()
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      get matches() {
        return reduce
      },
      media: query,
      addEventListener: (_: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
    })),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  localStorage.clear()
})

function art() {
  return screen.getByRole('img')
}

describe('the tree shows both goals (AC1)', () => {
  it.each([
    [0, 0, 'seed', 0],
    [12, 40, 'seed', 2],
    [25, 40, 'sprout', 5],
    [42, 63, 'sapling', 8],
    [76, 10, 'young tree', 15],
    [100, 100, 'harvest', 20],
  ])('carbon %s and savings %s percent read as the %s stage', (carbon, savings, stage, step) => {
    render(<GoalTree carbonPercent={carbon} savingsPercent={savings} />)
    expect(art().getAttribute('aria-label')).toBe(
      `Your tree is at the ${stage} stage, step ${step} of 20. Carbon goal ${carbon} percent reached. Savings goal ${savings} percent reached.`,
    )
    expect(screen.getByText(`Stage: ${stage}`)).toBeTruthy()
  })

  it('reaches harvest only when the carbon goal is reached', () => {
    const { rerender } = render(<GoalTree carbonPercent={99.99} savingsPercent={100} />)
    expect(art().className).not.toContain('is-full')
    expect(art().getAttribute('aria-label')).toContain('young tree stage, step 19')
    rerender(<GoalTree carbonPercent={100} savingsPercent={0} />)
    expect(art().className).toContain('is-full')
  })

  it('adds a foliage cluster at every step and one fruit per 5 percent of savings', () => {
    const { rerender, container } = render(<GoalTree carbonPercent={10} savingsPercent={0} />)
    const leaves = () => container.querySelectorAll('.goal-tree__leaves').length
    const before = leaves()
    rerender(<GoalTree carbonPercent={15} savingsPercent={0} />)
    expect(leaves()).toBe(before + 1)
    rerender(<GoalTree carbonPercent={15} savingsPercent={25} />)
    expect(container.querySelectorAll('.goal-tree__fruit')).toHaveLength(5)
    expect(container.querySelectorAll('.goal-tree__fruit--ripening')).toHaveLength(0)
  })

  it('shows one ripening fruit while the next 5 percent of savings is part way', () => {
    const { container } = render(<GoalTree carbonPercent={15} savingsPercent={27} />)
    expect(container.querySelectorAll('.goal-tree__fruit')).toHaveLength(6)
    expect(container.querySelectorAll('.goal-tree__fruit--ripening')).toHaveLength(1)
  })

  it('can leave out the caption when the page shows the stage elsewhere', () => {
    render(<GoalTree carbonPercent={15} savingsPercent={27} showCaption={false} />)
    expect(screen.queryByText(/^Stage:/)).toBeNull()
  })

  it('keeps the picture itself hidden from screen readers, with the label on the wrapper', () => {
    const { container } = render(<GoalTree carbonPercent={50} savingsPercent={50} />)
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
  })
})

describe('reduced motion (AC5)', () => {
  it('follows the system setting and treats an unknown setting as reduced', () => {
    reduce = false
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
    act(() => {
      reduce = true
      listeners.forEach((listener) => listener())
    })
    expect(result.current).toBe(true)
    vi.unstubAllGlobals()
    vi.stubGlobal('matchMedia', undefined)
    const unknown = renderHook(() => useReducedMotion())
    expect(unknown.result.current).toBe(true)
  })

  it('shows the final state at once with no transition when motion is reduced', async () => {
    const snapshot = (root: HTMLElement) =>
      Array.from(root.querySelectorAll('.goal-tree__leaves, .goal-tree__trunk')).map((node) =>
        ['cx', 'cy', 'r', 'd'].map((name) => node.getAttribute(name)).join(' '),
      )
    const settled = render(<GoalTree carbonPercent={50} savingsPercent={0} />)
    const expected = snapshot(settled.container)
    settled.unmount()

    const { rerender, container } = render(<GoalTree carbonPercent={10} savingsPercent={0} />)
    rerender(<GoalTree carbonPercent={50} savingsPercent={0} />)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    expect(snapshot(container)).toEqual(expected)
  })
})

function renderGoals(months: unknown[] = []) {
  localStorage.setItem(
    GOALS_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      goals: {
        savings: { target: 300, setOn: '2026-10-01T00:00:00.000Z' },
        carbon: { target: 500, setOn: '2026-10-01T00:00:00.000Z' },
      },
      completedGoals: [],
      months,
    }),
  )
  render(
    <GoalsView
      profile={{ ...emptyProfile(), ...BASELINE_PROFILE, lastUpdated: '2026-10-01T00:00:00.000Z' }}
      bundle={seedMethodologyBundle()}
      methodologyError=""
      onLogoClick={vi.fn()}
    />,
  )
}

describe('before there is enough data (AC5)', () => {
  it('shows the seed, no invented figures, and prompts to upload', () => {
    renderGoals()
    expect(art().getAttribute('aria-label')).toContain('seed stage, step 0 of 20')
    const overview = screen.getByRole('region', { name: 'Your goals' })
    expect(within(overview).getAllByText('After 1 full month')).toHaveLength(2)
    expect(within(overview).getAllByText('After 2 full months')).toHaveLength(2)
    const history = screen.getByRole('region', { name: 'Progress history' })
    expect(within(history).getByRole('button', { name: 'Upload a file' })).toBeTruthy()
  })

  it('asks for a CSV under the title, and explains the tree inside the green card', () => {
    renderGoals()
    expect(
      screen.getByText('Upload your battery CSV to see your progress. Nothing counts until a file is added.'),
    ).toBeTruthy()
    const overview = screen.getByRole('region', { name: 'Your goals' })
    expect(overview.textContent).toContain(
      'Each orange is 5% of your savings goal.The tree grows with every 5% of your carbon goal.',
    )
  })
})

describe('goal cards and stage timeline', () => {
  const september = {
    month: '2026-09',
    daysInMonth: 30,
    daysCounted: 30,
    coveredRanges: [['2026-09-01', '2026-09-30']],
    savingsAud: 87,
    carbonKg: 230,
    dischargeKwh: 300,
    intakeKwh: null,
    sourceId: 'tesla',
    updatedOn: '2026-10-01T00:00:00.000Z',
  }

  it('shows each goal with its ring, figures, pace, oranges, and stage', () => {
    renderGoals([september])
    const savings = screen.getByRole('article', { name: 'Savings goal' })
    expect(within(savings).getByRole('progressbar').getAttribute('aria-valuenow')).toBe('29')
    expect(savings.textContent).toContain('$87')
    expect(savings.textContent).toContain('of $300')
    expect(savings.textContent).toContain('5 oranges · 1 ripening')
    expect(savings.textContent).toContain('~29% / month')
    const carbon = screen.getByRole('article', { name: 'Carbon goal' })
    expect(carbon.textContent).toContain('230 kg')
    expect(carbon.textContent).toContain('of 500 kg CO₂e')
    expect(carbon.textContent).toContain('Stage 3 of 5 · Sapling')
  })

  it('asks for the latest CSV once some months are counted', () => {
    renderGoals([september])
    expect(
      screen.getByText('Upload your latest battery CSV each month to keep your progress up to date.'),
    ).toBeTruthy()
  })

  it('marks the current stage on the timeline with each stage’s kilograms', () => {
    renderGoals([september])
    const stages = within(screen.getByRole('list', { name: 'Tree stages' })).getAllByRole('listitem')
    expect(stages.map((stage) => stage.textContent)).toEqual([
      'Seed0 kg',
      'Sprout100 kg',
      'Sapling200 kg',
      'Young tree300 kg',
      'Harvest500 kg',
    ])
    expect(stages[2].getAttribute('aria-current')).toBe('step')
    expect(screen.getByText('Today · 230 kg')).toBeTruthy()
  })
})
