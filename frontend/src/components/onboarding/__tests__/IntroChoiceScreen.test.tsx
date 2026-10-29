/**
 * @vitest-environment jsdom
 *
 * Screen tests for Screens 1 and 2: the brand intro over the path-choice
 * split, and the story intro over the explore home. Timers are faked so
 * the intros can be stepped through.
 */
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../../App'
import { loadJourney } from '../../../lib/journeyStorage'
import { markTutorialSeen } from '../../../lib/tutorialStorage'
import { BOLT_HELLO_DISPLAY_MS } from '../../../constants/onboarding'
import { EXPLORE_INTRO_MS } from '../ExploreIntro'
import { IntroChoiceScreen } from '../IntroChoiceScreen'

let reduce = false

beforeEach(() => {
  reduce = false
  localStorage.clear()
  sessionStorage.clear()
  vi.useFakeTimers()
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
      matches: query.includes('reduced-motion')
        ? reduce
        : query.includes('max-width: 767px')
          ? false
          : query.includes('hover')
            ? true
            : false,
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
  return screen.getByRole('heading', { level: 1, name: 'Choose a path' })
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
    expect(screen.getByText(/Hi, I'm Bolt/)).toBeTruthy()
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

describe('Screen 2: path choice', () => {
  it('sends the left card to getting started and the right card to improving a setup', () => {
    const { onExplore, onImprove } = renderScreen(false)
    const explore = screen.getByRole('button', { name: /Get started\s*with VPPs/ })
    expect(within(explore).getByText('NEW TO VPPs')).toBeTruthy()
    fireEvent.click(explore)
    expect(onExplore).toHaveBeenCalledOnce()

    const improve = screen.getByRole('button', { name: /Unlock my full\s*VPP potential/ })
    expect(within(improve).getByText('Already in VPP')).toBeTruthy()
    fireEvent.click(improve)
    expect(onImprove).toHaveBeenCalledOnce()
  })

  it('introduces Bolt after the logo, then he speaks a call to action on each side', () => {
    renderScreen(false)
    act(() => vi.advanceTimersByTime(0))
    expect(screen.getByText(/Hi, I'm Bolt — I'll be showing you around/)).toBeTruthy()

    fireEvent.pointerEnter(screen.getByRole('button', { name: /Get started\s*with VPPs/ }))
    act(() => vi.advanceTimersByTime(150))
    expect(screen.getByText("Let's see how a VPP can help you save.")).toBeTruthy()
    expect(screen.getByRole('button', { name: /Explore getting started/ })).toBeTruthy()

    fireEvent.pointerEnter(screen.getByRole('button', { name: /Unlock my full\s*VPP potential/ }))
    act(() => vi.advanceTimersByTime(150))
    expect(screen.getByText("Let's maximise what your VPP can offer before the next peak.")).toBeTruthy()
    expect(screen.getByRole('button', { name: /Improve my setup/ })).toBeTruthy()
  })

  it('keeps Bolt hidden while the intro is still playing', () => {
    renderScreen()
    expect(screen.queryByText(/Hi, I'm Bolt/)).toBeNull()
    expect(document.querySelector('.ic-bolt-layer')).toBeNull()
  })

  it('resets Bolt when replaying the intro without showing the hello again', () => {
    renderScreen(false)
    fireEvent.pointerEnter(screen.getByRole('button', { name: /Get started\s*with VPPs/ }))
    act(() => vi.advanceTimersByTime(150))
    expect(screen.getByText("Let's see how a VPP can help you save.")).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Replay intro' }))
    expect(screen.queryByText("Let's see how a VPP can help you save.")).toBeNull()
    fireEvent.keyDown(intro() as HTMLElement, { key: 'Escape' })
    act(() => vi.advanceTimersByTime(1_100))
    expect(screen.queryByText(/Hi, I'm Bolt — I'll be showing you around/)).toBeNull()
    expect(document.querySelector('.ic-bolt-layer')).toBeNull()
  })

  it('hides the centre hello after a few seconds on first visit', () => {
    renderScreen(false)
    act(() => vi.advanceTimersByTime(0))
    expect(screen.getByText(/Hi, I'm Bolt — I'll be showing you around/)).toBeTruthy()
    act(() => vi.advanceTimersByTime(BOLT_HELLO_DISPLAY_MS))
    expect(screen.queryByText(/Hi, I'm Bolt — I'll be showing you around/)).toBeNull()
    expect(document.querySelector('.ic-bolt-layer')).toBeNull()
  })

  it('does not show the centre hello when it was already seen this session', () => {
    sessionStorage.setItem('mypowerplant.boltHello', '1')
    renderScreen(false)
    expect(screen.queryByText(/Hi, I'm Bolt — I'll be showing you around/)).toBeNull()
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
    fireEvent.click(rail().getByRole('button', { name: 'Role' }))
    fireEvent.click(screen.getByRole('button', { name: 'Switch to improving my VPP setup' }))
    act(() => vi.advanceTimersByTime(100))
    expect(story()).toBeNull()
    fireEvent.click(rail().getByRole('button', { name: 'Role' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reset everything on this device' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reset all data' }))

    // Back on the choice screen: skip the brand intro and choose improve.
    fireEvent.keyDown(intro() as HTMLElement, { key: 'Escape' })
    act(() => vi.advanceTimersByTime(1_100))
    fireEvent.click(screen.getByRole('button', { name: /Unlock my full\s*VPP potential/ }))
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

    // Explore tutorial waits until setup is saved on the dashboard, not on welcome.
    act(() => vi.advanceTimersByTime(20))
    act(() => vi.advanceTimersByTime(20))
    expect(screen.queryByRole('dialog', { name: 'Role' })).toBeNull()
    expect(document.activeElement).toBe(heading)
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
    fireEvent.click(screen.getByRole('button', { name: /Unlock my full\s*VPP potential/ }))
    expect(screen.getByRole('heading', { level: 1, name: 'Unlock the full potential of your VPP.' })).toBeTruthy()
    expect(story()).toBeNull()
    expect(loadJourney()).toBe('rain')
  })
})
