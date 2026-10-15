/**
 * @vitest-environment jsdom
 *
 * Tests for the guided tutorial: the dialog on its own (steps, keys, focus,
 * missing targets), and in the app (first visit only, step order per flow,
 * and replay from the assistant robot's Tutorial item). App renders with fetch stubbed to fail, so nothing leaves
 * the test.
 */
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../../App'
import { BASELINE_PROFILE } from '../../../data/baselines'
import { TUTORIAL_STEPS } from '../../../constants/tutorials'
import { finishImproveProfile } from '../../../lib/improveProfile'
import { saveJourney } from '../../../lib/journeyStorage'
import { saveProfile } from '../../../lib/profileStorage'
import { loadTutorialSeen, markTutorialSeen } from '../../../lib/tutorialStorage'
import { emptyProfile } from '../../../types/profile'
import { Tutorial, type TutorialCloseReason } from '../Tutorial'

/** Stand-in page with the explore targets, optionally without the robot or Path. */
function Harness({
  withBot = true,
  withPath = true,
  onClose,
}: {
  withBot?: boolean
  withPath?: boolean
  onClose: (reason: TutorialCloseReason) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open tutorial
      </button>
      {withPath ? (
        <button type="button" data-tour="path-reset">
          Path
        </button>
      ) : null}
      {withBot ? (
        <button type="button" data-tour="assistant-bot">
          Assistant
        </button>
      ) : null}
      {open ? (
        <Tutorial
          steps={TUTORIAL_STEPS.explore}
          onClose={(reason) => {
            setOpen(false)
            onClose(reason)
          }}
        />
      ) : null}
    </>
  )
}

const BOT_STEP = 'I’m here to help'

/** The whole app takes longer to settle than the dialog alone, especially in a full parallel run. */
const APP_WAIT = { timeout: 4000 }

function seedRainImproveReady() {
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
}

function seedExploreProfile() {
  saveProfile(
    {
      ...emptyProfile(),
      ...BASELINE_PROFILE,
    },
    'explore',
  )
}

async function openHarness(props: { withBot?: boolean; withPath?: boolean } = {}) {
  const onClose = vi.fn()
  const user = userEvent.setup()
  render(<Harness {...props} onClose={onClose} />)
  await user.click(screen.getByRole('button', { name: 'Open tutorial' }))
  return { user, onClose }
}

/** Two animation frames: enough for the tutorial to look up its targets. */
async function nextFrames() {
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Tutorial dialog', () => {
  it('opens on the first step as a labelled dialog spoken by the robot, with focus inside it', async () => {
    await openHarness()
    const dialog = await screen.findByRole('dialog', { name: 'Role' })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(within(dialog).getByText('Step 1 of 2')).toBeTruthy()
    expect(dialog.querySelector('.tutorial__avatar')?.getAttribute('data-face')).toBe('smiling')
    expect(within(dialog).queryByRole('button', { name: 'Back' })).toBeNull()
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))
  })

  it('moves with Next and Back, announces each step, and ends with Done', async () => {
    const { user, onClose } = await openHarness()
    const dialog = await screen.findByRole('dialog', { name: 'Role' })

    await user.click(within(dialog).getByRole('button', { name: 'Next' }))
    expect(screen.getByRole('dialog', { name: BOT_STEP })).toBeTruthy()
    expect(screen.getByText('Step 2 of 2')).toBeTruthy()
    expect(screen.getByText(`Step 2 of 2: ${BOT_STEP}`)).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('dialog', { name: 'Role' })).toBeTruthy()
    expect(screen.getByText('Step 1 of 2: Role')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(onClose).toHaveBeenCalledExactlyOnceWith('done')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes as skipped from Skip', async () => {
    const { user, onClose } = await openHarness()
    await screen.findByRole('dialog', { name: 'Role' })
    await user.click(screen.getByRole('button', { name: 'Skip' }))
    expect(onClose).toHaveBeenCalledExactlyOnceWith('skipped')
  })

  it('closes as skipped on Escape and returns focus to where it was', async () => {
    const { user, onClose } = await openHarness()
    const dialog = await screen.findByRole('dialog', { name: 'Role' })
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledExactlyOnceWith('skipped')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open tutorial' }))
  })

  it('steps with the arrow keys without finishing on the last step', async () => {
    const { user, onClose } = await openHarness()
    const dialog = await screen.findByRole('dialog', { name: 'Role' })
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('dialog', { name: BOT_STEP })).toBeTruthy()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('dialog', { name: BOT_STEP })).toBeTruthy()
    expect(onClose).not.toHaveBeenCalled()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('dialog', { name: 'Role' })).toBeTruthy()
  })

  it('keeps Tab inside the dialog', async () => {
    const { user } = await openHarness()
    await screen.findByRole('dialog', { name: 'Role' })
    const next = screen.getByRole('button', { name: 'Next' })
    next.focus()
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Skip' }))
    await user.tab({ shift: true })
    expect(document.activeElement).toBe(next)
  })

  it('leaves out a step whose target is not on the page', async () => {
    await openHarness({ withPath: false })
    const dialog = await screen.findByRole('dialog', { name: BOT_STEP })
    expect(within(dialog).getByText('Step 1 of 1')).toBeTruthy()
    expect(within(dialog).getByRole('button', { name: 'Done' })).toBeTruthy()
  })

  it('closes as unavailable when no target is on the page', async () => {
    const { onClose } = await openHarness({ withBot: false, withPath: false })
    await waitFor(() => expect(onClose).toHaveBeenCalledExactlyOnceWith('unavailable'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('Tutorial in the app', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline in tests'))))
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

  it('shows the improve tutorial on the first visit only: features, Role, then the robot', async () => {
    saveJourney('rain')
    seedRainImproveReady()
    const user = userEvent.setup()
    render(<App />)
    const features = await screen.findByRole('dialog', { name: 'Your features' }, APP_WAIT)
    expect(within(features).getByText('Step 1 of 3')).toBeTruthy()
    expect(document.querySelectorAll('[data-tour="improve-features"]')).toHaveLength(3)
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByRole('dialog', { name: 'Role' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    const bot = screen.getByRole('dialog', { name: BOT_STEP })
    expect(within(bot).getByText(/replay this tutorial/)).toBeTruthy()
    await user.click(within(bot).getByRole('button', { name: 'Done' }))
    expect(loadTutorialSeen()).toEqual({ improve: 'done' })

    cleanup()
    render(<App />)
    await nextFrames()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows the explore tutorial with Role then the robot, and remembers a skip', async () => {
    saveJourney('matt')
    seedExploreProfile()
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('dialog', { name: 'Role' }, APP_WAIT)
    await user.click(screen.getByRole('button', { name: 'Next' }))
    const bot = screen.getByRole('dialog', { name: BOT_STEP })
    expect(within(bot).getByText(/change your postcode/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Skip' }))
    expect(loadTutorialSeen()).toEqual({ explore: 'skipped' })
  })

  it('replays from the robot’s Tutorial item after it was seen, and returns focus to the robot', async () => {
    saveJourney('rain')
    seedRainImproveReady()
    markTutorialSeen('improve', 'done')
    const user = userEvent.setup()
    render(<App />)
    await nextFrames()
    expect(screen.queryByRole('dialog')).toBeNull()

    const robot = screen.getByRole('button', { name: 'Assistant' })
    await user.click(robot)
    expect(screen.queryByRole('button', { name: 'Actions' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Tutorial' }))
    const dialog = await screen.findByRole('dialog', { name: 'Your features' }, APP_WAIT)
    await user.click(within(dialog).getByRole('button', { name: 'Skip' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(robot)
    expect(loadTutorialSeen()).toEqual({ improve: 'skipped' })
  })

  it('smiles when the robot is hovered or focused, and while the tutorial runs', async () => {
    saveJourney('rain')
    seedRainImproveReady()
    const user = userEvent.setup()
    render(<App />)
    const robot = screen.getByRole('button', { name: 'Assistant' })
    const face = () => robot.querySelector('svg')?.getAttribute('data-face')
    await screen.findByRole('dialog', { name: 'Your features' }, APP_WAIT)
    expect(face()).toBe('smiling')
    await user.click(screen.getByRole('button', { name: 'Skip' }))
    robot.blur()
    expect(face()).not.toBe('smiling')
    await user.hover(robot)
    expect(face()).toBe('smiling')
    await user.unhover(robot)
    expect(face()).not.toBe('smiling')
  })

  it('offers Actions and Tutorial in the explore robot, with no reminders in Actions', async () => {
    saveJourney('matt')
    markTutorialSeen('explore', 'done')
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Assistant' }))
    const actions = screen.getByRole('button', { name: 'Actions' })
    expect(actions.getAttribute('aria-disabled')).toBe('true')
    expect(screen.getByText('Finish setup to use Actions.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Tutorial' })).toBeTruthy()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('button', { name: 'Tutorial' })).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Assistant' }))
  })

  it('does not auto-start the improve tutorial before setup is complete', async () => {
    saveJourney('rain')
    render(<App />)
    await nextFrames()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('does not auto-start the explore tutorial before setup is complete', async () => {
    saveJourney('matt')
    render(<App />)
    await nextFrames()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('never runs the path reset it points at', async () => {
    saveJourney('rain')
    seedRainImproveReady()
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('dialog', { name: 'Your features' }, APP_WAIT)
    await user.click(screen.getByRole('button', { name: 'Skip' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(localStorage.getItem('mypowerplant.journey')).toBe('rain')
  })
})
