/**
 * Unit tests for reached goals (US8.6 AC1 to AC3).
 */
import { describe, expect, it } from 'vitest'

import { KG_CO2_PER_TREE } from '../../../constants/goals'
import { emptyGoalsStore, type GoalsStore } from '../../../types/goals'
import { level, newlyReached, nextGoalRange, reachedEntry, recordReached, treeEquivalent } from '../achievements'

const SET_ON = '2026-10-01T00:00:00.000Z'

function store(savings = 300, carbon = 500): GoalsStore {
  return {
    ...emptyGoalsStore(),
    goals: { savings: { target: savings, setOn: SET_ON }, carbon: { target: carbon, setOn: SET_ON } },
  }
}

describe('newly reached goals (AC1)', () => {
  it('finds goals at or over 100 percent with no completed entry', () => {
    expect(newlyReached(store(), { savings: 299.99, carbon: 10 })).toEqual([])
    expect(newlyReached(store(), { savings: 300, carbon: 10 })).toEqual(['savings'])
    expect(newlyReached(store(), { savings: 400, carbon: 600 })).toEqual(['savings', 'carbon'])
  })

  it('never reports a goal twice', () => {
    const reached = recordReached(store(), ['savings'], { savings: 320, carbon: 0 }, '2026-10-08')
    expect(newlyReached(reached, { savings: 900, carbon: 0 })).toEqual([])
    expect(reachedEntry(reached, 'savings')).toMatchObject({
      kind: 'savings',
      target: 300,
      setOn: SET_ON,
      reachedOn: '2026-10-08',
      totalAtReach: 320,
    })
  })

  it('treats a goal set after reaching one as a new goal', () => {
    const reached = recordReached(store(), ['savings'], { savings: 320, carbon: 0 }, '2026-10-08')
    const next = { ...reached, goals: { ...reached.goals, savings: { target: 700, setOn: '2026-10-09T00:00:00.000Z' } } }
    expect(reachedEntry(next, 'savings')).toBeNull()
    expect(next.completedGoals).toHaveLength(1)
    expect(newlyReached(next, { savings: 700, carbon: 0 })).toEqual(['savings'])
  })
})

describe('levels', () => {
  it('is completed goals plus one, and goals reached by lowering them do not count', () => {
    let current = store()
    expect(level(current)).toBe(1)
    current = recordReached(current, ['savings', 'carbon'], { savings: 300, carbon: 500 }, '2026-10-08')
    expect(level(current)).toBe(3)
    const lowered = recordReached(store(), ['carbon'], { savings: 0, carbon: 600 }, '2026-10-08', true)
    expect(lowered.completedGoals[0].reachedByEdit).toBe(true)
    expect(level(lowered)).toBe(1)
  })
})

describe('what was achieved and what comes next (AC2, AC3)', () => {
  it('converts carbon to an approximate number of trees', () => {
    expect(treeEquivalent(KG_CO2_PER_TREE * 2)).toBeCloseTo(2, 10)
  })

  it('keeps every next goal above the total so far', () => {
    const range = nextGoalRange(312.4, { min: 63, suggested: 187, max: 745 })
    expect(range.min).toBe(313)
    expect(range.min).toBeGreaterThan(312.4)
    expect(range.suggested).toBe(500)
    expect(range.max).toBe(1058)
  })
})
