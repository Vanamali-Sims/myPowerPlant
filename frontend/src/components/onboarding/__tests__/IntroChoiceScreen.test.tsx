/**
 * @vitest-environment jsdom
 *
 * Screen tests for Screens 1 and 2: the brand intro over the "Which describes
 * you?" choice, and the story intro over the explore home. Timers are faked so
 * the intros can be stepped through.
 */
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../../App'
import { loadJourney } from '../../../lib/journeyStorage'
import { markTutorialSeen } from '../../../lib/tutorialStorage'
import { EXPLORE_INTRO_MS } from '../ExploreIntro'
import { IntroChoiceScreen } from '../IntroChoiceScreen'

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
    expect(overlay?.getAttribute('aria-label')).toContain('A platform that helps you get more from your VPP.')
    expect(document.querySelector('.ic-split')?.hasAttribute('inert')).toBe(true)
  })

  it('shows the logo and spells out the wordmark letter by letter', () => {
    renderScreen()
    const letters = Array.from(document.querySelectorAll('.bi-letter'), (node) => node.textContent)
    expect(letters.join('')).toBe('MyPowerPlant')
    expect(intro()?.querySelector('.bi-logo .ic-logo-img')).not.toBeNull()
  })

  it('has one logo on screen: the header logo waits until the intro’s logo has landed on it', () => {
    renderScreen()
    const mark = () => document.querySelector('.ic-header .ic-mark') as HTMLElement
    expect(mark().classList.contains('is-awaiting-intro')).toBe(true)
    act(() => vi.advanceTimersByTime(7_000))
    expect(mark().classList.contains('is-awaiting-intro')).toBe(true)
    act(() => vi.advanceTimersByTime(200))
    expect(mark().classList.contains('is-awaiting-intro')).toBe(false)
  })

  it('shows the header logo once a skipped intro clears', () => {
    renderScreen()
    const mark = () => document.querySelector('.ic-header .ic-mark') as HTMLElement
    fireEvent.keyDown(intro() as HTMLElement, { key: 'Escape' })
    expect(mark().classList.contains('is-awaiting-intro')).toBe(true)
    act(() => vi.advanceTimersByTime(1_100))
    expect(mark().classList.contains('is-awaiting-intro')).toBe(false)
  })

  it('shows the header logo at once when there is no intro', () => {
    renderScreen(false)
    expect(document.querySelector('.ic-header .ic-mark')?.classList.contains('is-awaiting-intro')).toBe(false)
  })

  it('ends after 7.1 seconds, then hands focus to the choice', () => {
    const { onIntroDone } = renderScreen()
    act(() => vi.advanceTimersByTime(7_000))
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

    const improve = screen.getByRole('button', { name: /Improve my\s*VPP experience/ })
    expect(within(improve).getByText('Already in VPP')).toBeTruthy()
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

  function story() {
    return screen.queryByRole('button', { name: /^How a VPP works/ })
  }

  it('does not play the explore story over the improve home after a reset', () => {
    // jsdom has no modal dialogs; the Path dialog only needs open and close.
    if (!HTMLDialogElement.prototype.showModal) {
      HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
        this.setAttribute('open', '')
      }
      HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
        this.removeAttribute('open')
      }
    }
    markTutorialSeen('explore', 'done')
    skipIntro()
    fireEvent.click(screen.getByRole('button', { name: /Get started\s*with VPPs/ }))
    act(() => vi.advanceTimersByTime(EXPLORE_INTRO_MS + 100))
    expect(story()).toBeNull()

    // Switch to improve, then reset everything from Path.
    const rail = () => within(screen.getByRole('complementary', { name: 'App' }))
    fireEvent.click(rail().getByRole('button', { name: 'Path' }))
    fireEvent.click(screen.getByRole('button', { name: 'Switch to improving my VPP setup' }))
    act(() => vi.advanceTimersByTime(100))
    expect(story()).toBeNull()
    fireEvent.click(rail().getByRole('button', { name: 'Path' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reset everything on this device' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reset all data' }))

    // Back on the choice screen: skip the brand intro and choose improve.
    fireEvent.keyDown(intro() as HTMLElement, { key: 'Escape' })
    act(() => vi.advanceTimersByTime(1_100))
    fireEvent.click(screen.getByRole('button', { name: /Improve my\s*VPP experience/ }))
    act(() => vi.advanceTimersByTime(100))
    expect(story()).toBeNull()
  })

  it('opens Screen 2.1 from the left card, with the story intro playing over it', () => {
    skipIntro()
    fireEvent.click(screen.getByRole('button', { name: /Get started\s*with VPPs/ }))
    expect(loadJourney()).toBe('matt')
    const overlay = story()
    expect(overlay).not.toBeNull()
    expect(document.activeElement).toBe(overlay)
    expect(overlay?.getAttribute('aria-label')).toContain('Every rooftop catches the sun')
    expect(overlay?.getAttribute('aria-label')).toContain('Share at peak times. Get paid back')
    expect(document.querySelector('.app-under-intro')?.hasAttribute('inert')).toBe(true)

    fireEvent.keyDown(overlay as HTMLElement, { key: 'Escape' })
    act(() => vi.advanceTimersByTime(1_100))
    expect(story()).toBeNull()
    const heading = screen.getByRole('heading', { level: 1, name: /Your battery could be/ })
    expect(document.activeElement).toBe(heading)

    // The first-visit tutorial takes over from the story, then hands focus back.
    // One frame finds the targets, the next places the dialog.
    act(() => vi.advanceTimersByTime(20))
    act(() => vi.advanceTimersByTime(20))
    const tutorial = screen.getByRole('dialog', { name: 'Path' })
    expect(document.querySelector('.app-under-intro')?.hasAttribute('inert')).toBe(true)
    fireEvent.keyDown(tutorial, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Path' })).toBeNull()
    expect(document.activeElement).toBe(heading)
    expect(document.querySelector('.app-under-intro')?.hasAttribute('inert')).toBe(false)
  })

  it('ends the story intro on its own, at 3.5 seconds a caption', () => {
    expect(EXPLORE_INTRO_MS).toBe(15_255)
    skipIntro()
    fireEvent.click(screen.getByRole('button', { name: /Get started\s*with VPPs/ }))
    const captions = Array.from(document.querySelectorAll<HTMLElement>('.ic-caption'))
    const starts = captions.map((caption) => parseFloat(caption.style.animationDelay))
    expect(starts.slice(1).map((start, index) => Number((start - starts[index]).toFixed(2)))).toEqual([3.5, 3.5, 3.5])
    act(() => vi.advanceTimersByTime(EXPLORE_INTRO_MS - 100))
    expect(story()).not.toBeNull()
    act(() => vi.advanceTimersByTime(200))
    expect(story()).toBeNull()
  })

  it('plays the story once, not again when coming back to the explore home', () => {
    markTutorialSeen('explore', 'done')
    skipIntro()
    fireEvent.click(screen.getByRole('button', { name: /Get started\s*with VPPs/ }))
    act(() => vi.advanceTimersByTime(EXPLORE_INTRO_MS + 100))
    expect(story()).toBeNull()

    const rail = within(screen.getByRole('complementary', { name: 'App' }))
    fireEvent.click(rail.getByRole('button', { name: 'Dashboard' }))
    fireEvent.click(rail.getByRole('button', { name: 'Home' }))
    act(() => vi.advanceTimersByTime(1_000))
    expect(screen.getByRole('heading', { level: 1, name: /Your battery could be/ })).toBeTruthy()
    expect(story()).toBeNull()
  })

  it('opens Screen 3.1 from the right card, with no story intro', () => {
    skipIntro()
    fireEvent.click(screen.getByRole('button', { name: /Improve my\s*VPP experience/ }))
    expect(screen.getByRole('heading', { level: 1, name: 'Unlock the full potential of your VPP.' })).toBeTruthy()
    expect(story()).toBeNull()
    expect(loadJourney()).toBe('rain')
  })
})
