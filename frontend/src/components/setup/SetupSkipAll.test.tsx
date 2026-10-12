/**
 * @vitest-environment jsdom
 *
 * Screen tests for "Skip all" on the setup intro: one click fills every
 * unanswered question with typical values and finishes setup.
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { BASELINE_PROFILE, fillAllWithBaseline } from '../../data/baselines'
import { validateStep } from '../../lib/validateProfile'
import { SETUP_STEPS } from '../../constants/setup'
import { emptyProfile, type ProfileData } from '../../types/profile'
import { SetupForm } from './SetupForm'

beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '')
    }
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.removeAttribute('open')
    }
  }
})

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Skip all', () => {
  it('finishes setup from the intro with every question answered', async () => {
    const onComplete = vi.fn()
    render(
      <SetupForm profile={emptyProfile()} onChange={vi.fn()} onComplete={onComplete} onLogoClick={vi.fn()} />,
    )
    const dialog = screen.getByRole('dialog', { name: 'Your details stay with you' })
    expect(dialog.textContent).toContain('Skip all fills any question you have not answered')
    await userEvent.setup().click(within(dialog).getByRole('button', { name: 'Skip all' }))
    expect(onComplete).toHaveBeenCalledOnce()
    const done = onComplete.mock.calls[0][0] as ProfileData
    for (const step of SETUP_STEPS) expect(validateStep(step.id, done)).toEqual({})
    expect(done.postcode).toBe(BASELINE_PROFILE.postcode)
    expect(done.fieldSources.postcode).toBe('baseline')
  })

  it('keeps answers already given and fills only the blanks', () => {
    const filled = fillAllWithBaseline({
      ...emptyProfile(),
      postcode: '3000',
      batteryModel: 'SonnenBatterie',
      fieldSources: { postcode: 'user', batteryModel: 'user' },
    })
    expect(filled.postcode).toBe('3000')
    expect(filled.batteryModel).toBe('SonnenBatterie')
    expect(filled.fieldSources.postcode).toBe('user')
    expect(filled.rooms).toBe(BASELINE_PROFILE.rooms)
    expect(filled.fieldSources.rooms).toBe('baseline')
  })

  it('leaves solar details empty for a home with no solar', () => {
    const filled = fillAllWithBaseline({ ...emptyProfile(), hasSolar: 'no' })
    expect(filled.hasSolar).toBe('no')
    expect(filled.panelCount).toBe('')
    expect(validateStep('solar', filled)).toEqual({})
  })
})
