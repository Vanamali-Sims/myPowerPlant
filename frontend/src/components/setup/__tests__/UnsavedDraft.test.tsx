/**
 * @vitest-environment jsdom
 *
 * Answers in a setup form stay in that form until it is finished: a
 * half-filled explore form (here with a non-Victorian postcode) never reaches
 * the improve flow or storage. App renders with fetch stubbed to fail.
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../../App'
import { saveJourney } from '../../../lib/journeyStorage'
import { loadProfile } from '../../../lib/profileStorage'
import { markTutorialSeen } from '../../../lib/tutorialStorage'

beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '')
    }
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.removeAttribute('open')
    }
  }
  if (!('getTotalLength' in SVGElement.prototype)) {
    Object.defineProperty(SVGElement.prototype, 'getTotalLength', { value: () => 100, configurable: true })
    Object.defineProperty(SVGElement.prototype, 'getPointAtLength', { value: () => ({ x: 0, y: 0 }), configurable: true })
  }
})

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline in tests'))))
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  )
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('unsaved setup answers', () => {
  it('stay out of the improve flow and storage until the form is finished', async () => {
    saveJourney('matt')
    markTutorialSeen('explore', 'done')
    markTutorialSeen('improve', 'done')
    const user = userEvent.setup()
    render(<App />)
    const rail = () => within(screen.getByRole('complementary', { name: 'App' }))

    // Half-fill the explore form with a postcode that is not Victorian.
    await user.click(rail().getByRole('button', { name: 'Home' }))
    await user.click(screen.getByRole('button', { name: /Show me how/ }))
    const intro = screen.getByRole('dialog', { name: 'Your details stay with you' })
    await user.click(within(intro).getByRole('button', { name: 'Continue' }))
    const postcode = screen.getByRole('textbox', { name: 'What is your postcode?' })
    await user.clear(postcode)
    await user.type(postcode, '1234')

    // Leave for the improve flow without finishing. Locked features stay on the
    // home and do not open a form that could carry the half-filled answers.
    await user.click(rail().getByRole('button', { name: 'Role' }))
    await user.click(screen.getByRole('button', { name: 'Switch to improving my VPP setup' }))
    await user.click(rail().getByRole('button', { name: 'What if' }))
    expect(screen.queryByRole('heading', { level: 1, name: 'Your home and VPP' })).toBeNull()
    expect(screen.queryByText(/1234/)).toBeNull()

    // The setup form starts from what was saved (nothing yet), not the half-filled form.
    await user.click(screen.getByRole('button', { name: 'Add my setup' }))
    const header = screen.getByRole('textbox', { name: 'Postcode' }) as HTMLInputElement
    expect(header.value).toBe('')
    expect(screen.queryByText(/1234/)).toBeNull()
    expect(screen.queryByRole('dialog', { name: 'We used your earlier answers' })).toBeNull()
    expect(loadProfile().postcode).toBe('')
  })
})
