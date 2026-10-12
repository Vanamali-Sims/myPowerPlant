/**
 * @vitest-environment jsdom
 *
 * The postcode box in the assistant's Actions panel: a postcode from another
 * state is refused with a message under the box, on leave and on Save, and a
 * Victorian one is saved.
 */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { BASELINE_PROFILE } from '../../../data/baselines'
import { seedMethodologyBundle } from '../../../lib/methodologyFixture'
import { emptyProfile } from '../../../types/profile'
import { ChatDock } from '../ChatDock'

const NOT_VIC = '2000 isn’t a Victorian postcode. MyPowerPlant is for Victorian homes, so enter a postcode starting with 3.'

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

async function openActions() {
  const onSaveProfile = vi.fn()
  const user = userEvent.setup()
  render(
    <ChatDock
      profile={{ ...emptyProfile(), ...BASELINE_PROFILE, postcode: '3101', lastUpdated: '2026-10-01T00:00:00.000Z' }}
      hasProfile
      bundle={seedMethodologyBundle()}
      methodologyError=""
      onSaveProfile={onSaveProfile}
      onTutorial={vi.fn()}
      tutorialNew={false}
      tutorialActive={false}
    />,
  )
  await user.click(screen.getByRole('button', { name: 'Assistant' }))
  await user.click(screen.getByRole('button', { name: 'Actions' }))
  return { user, onSaveProfile, box: screen.getByLabelText('Postcode') as HTMLInputElement }
}

describe('Actions postcode', () => {
  it('says a postcode from another state is not Victorian when focus leaves the box', async () => {
    const { user, box } = await openActions()
    await user.clear(box)
    await user.type(box, '2000')
    await user.tab()
    expect(screen.getByRole('alert').textContent).toBe(NOT_VIC)
    expect(box.getAttribute('aria-invalid')).toBe('true')
  })

  it('refuses to save it, and saves a Victorian postcode', async () => {
    const { user, box, onSaveProfile } = await openActions()
    await user.clear(box)
    await user.type(box, '2000{Enter}')
    expect(onSaveProfile).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toBe(NOT_VIC)

    await user.clear(box)
    await user.type(box, '3168{Enter}')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(onSaveProfile).toHaveBeenCalledOnce()
    expect(onSaveProfile.mock.calls[0][0].postcode).toBe('3168')
  })
})
