import { describe, expect, it } from 'vitest'
import { flowDotCount, flowStroke } from './flowScale'

describe('flowStroke', () => {
  it('keeps growing past 10 kWh, on every amount the same way', () => {
    const at6 = flowStroke(6)
    const at10 = flowStroke(10)
    const at20 = flowStroke(20)
    expect(at10).toBeGreaterThan(at6)
    expect(at20).toBeGreaterThan(at10)
    expect(at20 - at10).toBeGreaterThan(at10 - at6)
  })
})

describe('flowDotCount', () => {
  it('adds dots as the flow grows past 10 kWh', () => {
    expect(flowDotCount(20)).toBeGreaterThan(flowDotCount(10))
    expect(flowDotCount(0)).toBe(0)
  })
})
