/**
 * @vitest-environment jsdom
 *
 * Navigation test for the Goals tab (US8.1 AC1).
 *
 * Renders the whole App. fetch is stubbed to fail so no request leaves the
 * test, and the browser APIs jsdom lacks are given inert stand-ins.
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../../App'
import { RAIN_NAV } from '../../../constants/navigation'
import { BASELINE_PROFILE } from '../../../data/baselines'
import { finishImproveProfile } from '../../../lib/improveProfile'
import { saveJourney } from '../../../lib/journeyStorage'
import { markTutorialSeen } from '../../../lib/tutorialStorage'
import { saveProfile } from '../../../lib/profileStorage'
import { emptyProfile } from '../../../types/profile'

beforeAll(() => {
  if (!('getTotalLength' in SVGElement.prototype)) {
    Object.defineProperty(SVGElement.prototype, 'getTotalLength', { value: () => 100, configurable: true })
  }
})

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline in tests'))))
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  )
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Goals tab', () => {
  it('lists Goals between What if and Reminders in the Rain rail', () => {
    const ids = RAIN_NAV.map((item) => item.id)
    expect(ids).toEqual(['home', 'whatif', 'goals', 'reminders'])
  })

  it('has a text label and opens the Goals page as the current page', async () => {
    const user = userEvent.setup()
    saveJourney('rain')
    saveProfile(
      finishImproveProfile({
        ...emptyProfile(),
        ...BASELINE_PROFILE,
        vppProvider: 'Tesla Energy Plan',
        fieldSources: {
          postcode: 'bill',
          monthlyKwh: 'bill',
          monthlyBill: 'bill',
          provider: 'bill',
        },
      }),
      'improve',
    )
    markTutorialSeen('improve', 'done')
    render(<App />)
    const skipTutorial = screen.queryByRole('dialog', { name: 'Your features' })
    if (skipTutorial) {
      await user.click(within(skipTutorial).getByRole('button', { name: 'Skip' }))
    }
    const rail = screen.getByRole('complementary', { name: 'App' })
    const buttons = Array.from(rail.querySelectorAll('nav button')).map((node) => node.textContent)
    expect(buttons).toEqual(['Home', 'What if', 'Goals', 'Reminders'])
    expect(screen.getByRole('button', { name: 'Profile' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Role' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Goals' }))
    const goals = screen.getByRole('button', { name: 'Goals' })
    expect(goals.getAttribute('aria-current')).toBe('page')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Grow your savings. Grow your tree.' }, { timeout: 8000 }),
    ).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Reminders' }))
    expect(screen.getByRole('button', { name: 'Reminders' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('button', { name: 'Goals' }).getAttribute('aria-current')).toBeNull()
  })
})
