/**
 * @vitest-environment jsdom
 *
 * Navigation test for the Goals tab (US8.1 AC1).
 *
 * Renders the whole App. fetch is stubbed to fail so no request leaves the
 * test, and the browser APIs jsdom lacks are given inert stand-ins.
 */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../App'
import { NAV } from '../../constants/navigation'

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
  it('sits directly after Reminders in the navigation', () => {
    const ids = NAV.map((item) => item.id)
    expect(ids.indexOf('goals')).toBe(ids.indexOf('reminders') + 1)
  })

  it('has a text label and opens the Goals page as the current page', async () => {
    const user = userEvent.setup()
    render(<App />)
    const rail = screen.getByRole('complementary', { name: 'App' })
    const buttons = Array.from(rail.querySelectorAll('nav button')).map((node) => node.textContent)
    expect(buttons.indexOf('Goals')).toBe(buttons.indexOf('Reminders') + 1)

    const goals = screen.getByRole('button', { name: 'Goals' })
    expect(goals.getAttribute('aria-current')).toBeNull()
    await user.click(goals)
    expect(await screen.findByRole('heading', { level: 1, name: 'Goals' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Goals' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('button', { name: 'Reminders' }).getAttribute('aria-current')).toBeNull()
  })
})
