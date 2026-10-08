/**
 * Unit tests for the monthly graph's axis scale (US8.5 AC2).
 */
import { describe, expect, it } from 'vitest'

import { niceTop } from './chartScale'

describe('niceTop', () => {
  it.each([
    [300, 320],
    [261, 320],
    [500, 600],
    [180, 200],
    [1149, 1600],
    [42, 60],
    [7.5, 8],
  ])('puts %s under a tidy top of %s with room above', (value, top) => {
    expect(niceTop(value)).toBe(top)
    expect(niceTop(value)).toBeGreaterThanOrEqual(value * 1.05)
  })

  it('never returns zero, so an empty axis still draws', () => {
    expect(niceTop(0)).toBe(1)
  })
})
