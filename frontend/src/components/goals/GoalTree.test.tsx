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
    [12, 40, 'sprout', 2],
    [42, 63, 'sapling', 8],
    [76, 10, 'tree', 15],
    [100, 100, 'full canopy', 20],
  ])('carbon %s and savings %s percent read as the %s stage', (carbon, savings, stage, step) => {
    render(<GoalTree carbonPercent={carbon} savingsPercent={savings} />)
    expect(art().getAttribute('aria-label')).toBe(
      `Your tree is at the ${stage} stage, step ${step} of 20. Carbon goal ${carbon} percent reached. Savings goal ${savings} percent reached.`,
    )
    expect(screen.getByText(`Stage: ${stage}`)).toBeTruthy()
  })

  it('shows full canopy only when the carbon goal is reached', () => {
    const { rerender } = render(<GoalTree carbonPercent={99.99} savingsPercent={100} />)
    expect(art().className).not.toContain('is-full')
    expect(art().getAttribute('aria-label')).toContain('tree stage, step 19')
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

describe('before there is enough data (AC5)', () => {
  it('shows the seed, no invented figures, and prompts to upload', () => {
    localStorage.setItem(
      GOALS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        goals: {
          savings: { target: 300, setOn: '2026-10-01T00:00:00.000Z' },
          carbon: { target: 500, setOn: '2026-10-01T00:00:00.000Z' },
        },
        completedGoals: [],
        months: [],
      }),
    )
    render(
      <GoalsView
        profile={{ ...emptyProfile(), ...BASELINE_PROFILE, lastUpdated: '2026-10-01T00:00:00.000Z' }}
        bundle={seedMethodologyBundle()}
        methodologyError=""
        onOpenProfile={vi.fn()}
        onStartSetup={vi.fn()}
        onLogoClick={vi.fn()}
      />,
    )
    expect(art().getAttribute('aria-label')).toContain('seed stage, step 0 of 20')
    const overview = screen.getByRole('region', { name: 'Your goals' })
    expect(within(overview).getAllByText('Your rate appears after your first complete month.')).toHaveLength(2)
    expect(within(overview).queryByText(/Estimated finish/)).toBeNull()
    const history = screen.getByRole('region', { name: 'Month-by-month history' })
    expect(within(history).getByRole('button', { name: 'Go to upload' })).toBeTruthy()
  })
})
