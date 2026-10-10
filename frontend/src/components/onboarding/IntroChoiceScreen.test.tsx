/**
 * @vitest-environment jsdom
 *
 * Screen tests for Screens 1 and 2: the intro over the "Which describes you?"
 * choice. Timers are faked so the 24.6 second intro can be stepped through.
 */
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../App'
import { loadJourney } from '../../lib/journeyStorage'
import { IntroChoiceScreen } from './IntroChoiceScreen'

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
})

function renderScreen(playIntro = true) {
  const handlers = { onIntroDone: vi.fn(), onExplore: vi.fn(), onImprove: vi.fn() }
  render(<IntroChoiceScreen playIntro={playIntro} {...handlers} />)
  return handlers
}

function intro() {
  return screen.queryByRole('button', { name: /^MyPowerPlant introduction/ })
}

function heading() {
  return screen.getByRole('heading', { level: 1, name: 'Which describes you?' })
}

describe('Screen 1: the intro', () => {
  it('plays over the choice, takes focus, and keeps the choice out of reach', () => {
    renderScreen()
    const overlay = intro()
    expect(overlay).not.toBeNull()
    expect(document.activeElement).toBe(overlay)
    expect(overlay?.getAttribute('aria-label')).toContain('Every rooftop catches the sun')
    expect(overlay?.getAttribute('aria-label')).toContain('Share at peak times. Get paid back')
    expect(document.querySelector('.ic-split')?.hasAttribute('inert')).toBe(true)
  })

  it('ends after 24.6 seconds, then hands focus to the choice', () => {
    const { onIntroDone } = renderScreen()
    act(() => vi.advanceTimersByTime(24_500))
    expect(intro()).not.toBeNull()
    act(() => vi.advanceTimersByTime(200))
    expect(intro()).toBeNull()
    expect(onIntroDone).toHaveBeenCalledOnce()
    expect(document.activeElement).toBe(heading())
    expect(document.querySelector('.ic-split')?.hasAttribute('inert')).toBe(false)
  })

  it.each([
    ['a click', (node: HTMLElement) => fireEvent.click(node)],
    ['Enter', (node: HTMLElement) => fireEvent.keyDown(node, { key: 'Enter' })],
    ['Space', (node: HTMLElement) => fireEvent.keyDown(node, { key: ' ' })],
    ['Escape', (node: HTMLElement) => fireEvent.keyDown(node, { key: 'Escape' })],
  ])('skips on %s, clearing within about a second', (_label, act_) => {
    const { onIntroDone } = renderScreen()
    act_(intro() as HTMLElement)
    expect(intro()?.className).toContain('is-skipping')
    act(() => vi.advanceTimersByTime(1_100))
    expect(intro()).toBeNull()
    expect(onIntroDone).toHaveBeenCalledOnce()
    expect(document.activeElement).toBe(heading())
  })

  it('does not play under reduced motion, and offers no replay', () => {
    reduce = true
    const { onIntroDone } = renderScreen()
    expect(intro()).toBeNull()
    act(() => vi.advanceTimersByTime(0))
    expect(onIntroDone).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: 'Replay intro' })).toBeNull()
  })

  it('can be replayed from the choice', () => {
    renderScreen(false)
    expect(intro()).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Replay intro' }))
    expect(intro()).not.toBeNull()
  })
})

describe('Screen 2: Which describes you?', () => {
  it('sends the left card to getting started and the right card to improving a setup', () => {
    const { onExplore, onImprove } = renderScreen(false)
    const explore = screen.getByRole('button', { name: /Get started\s*with VPPs/ })
    expect(within(explore).getByText('New to VPPs')).toBeTruthy()
    expect(explore.textContent).toContain('Explore getting started')
    fireEvent.click(explore)
    expect(onExplore).toHaveBeenCalledOnce()

    const improve = screen.getByRole('button', { name: /Improve my\s*VPP setup/ })
    expect(within(improve).getByText('Already have a battery')).toBeTruthy()
    fireEvent.click(improve)
    expect(onImprove).toHaveBeenCalledOnce()
  })
})

describe('first visit in the app', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline in tests'))))
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
  })

  function skipIntro() {
    render(<App />)
    fireEvent.keyDown(intro() as HTMLElement, { key: 'Escape' })
    act(() => vi.advanceTimersByTime(1_100))
  }

  it('opens Screen 2.1 from the left card', () => {
    skipIntro()
    fireEvent.click(screen.getByRole('button', { name: /Get started\s*with VPPs/ }))
    expect(screen.getByRole('heading', { level: 1, name: /Your battery could be/ })).toBeTruthy()
    expect(loadJourney()).toBe('matt')
  })

  it('opens Screen 3.1 from the right card', () => {
    skipIntro()
    fireEvent.click(screen.getByRole('button', { name: /Improve my\s*VPP setup/ }))
    expect(screen.getByRole('heading', { level: 1, name: 'Use your VPP setup more efficiently.' })).toBeTruthy()
    expect(loadJourney()).toBe('rain')
  })
})
