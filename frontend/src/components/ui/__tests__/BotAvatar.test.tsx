/**
 * @vitest-environment jsdom
 *
 * The assistant robot's face: blinking every 4 to 8 seconds, no blinking with
 * reduced motion, and smiling. Timers and Math.random are controlled.
 */
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { BLINK_MAX_MS, BLINK_MIN_MS, BLINK_MS, BotAvatar } from '../BotAvatar'

let reduce = false

beforeEach(() => {
  reduce = false
  vi.useFakeTimers()
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('reduced-motion') ? reduce : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function face(container: HTMLElement) {
  return container.querySelector('svg')?.getAttribute('data-face')
}

describe('BotAvatar', () => {
  it('blinks briefly at a random point between 4 and 8 seconds, then again', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const { container } = render(<BotAvatar blink />)
    const wait = BLINK_MIN_MS + 0.5 * (BLINK_MAX_MS - BLINK_MIN_MS)
    expect(face(container)).toBe('resting')

    act(() => vi.advanceTimersByTime(wait - 1))
    expect(face(container)).toBe('resting')
    act(() => vi.advanceTimersByTime(1))
    expect(face(container)).toBe('blinking')
    act(() => vi.advanceTimersByTime(BLINK_MS))
    expect(face(container)).toBe('resting')

    act(() => vi.advanceTimersByTime(wait))
    expect(face(container)).toBe('blinking')
  })

  it('never waits less than 4 or more than 8 seconds', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const early = render(<BotAvatar blink />)
    act(() => vi.advanceTimersByTime(BLINK_MIN_MS))
    expect(face(early.container)).toBe('blinking')
    early.unmount()

    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    const late = render(<BotAvatar blink />)
    act(() => vi.advanceTimersByTime(BLINK_MAX_MS - 2))
    expect(face(late.container)).toBe('resting')
    act(() => vi.advanceTimersByTime(2))
    expect(face(late.container)).toBe('blinking')
  })

  it('does not blink with reduced motion', () => {
    reduce = true
    const { container } = render(<BotAvatar blink />)
    act(() => vi.advanceTimersByTime(BLINK_MAX_MS * 3))
    expect(face(container)).toBe('resting')
  })

  it('does not blink unless asked', () => {
    const { container } = render(<BotAvatar />)
    act(() => vi.advanceTimersByTime(BLINK_MAX_MS * 3))
    expect(face(container)).toBe('resting')
  })

  it('smiles instead of blinking', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const { container } = render(<BotAvatar blink smiling />)
    expect(face(container)).toBe('smiling')
    act(() => vi.advanceTimersByTime(BLINK_MIN_MS))
    expect(face(container)).toBe('smiling')
  })
})
