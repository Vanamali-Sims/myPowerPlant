/**
 * @vitest-environment jsdom
 *
 * The assistant robot's menu: opens on mouse hover and closes shortly after
 * the mouse leaves, a click keeps it open, Esc and a click elsewhere close it.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PlayIcon } from '../../ui/icons'
import { AssistantBot, HOVER_CLOSE_MS } from '../AssistantBot'

const onTutorial = vi.fn()
const onActions = vi.fn()

function renderBot() {
  render(
    <AssistantBot
      items={[
        { id: 'actions', label: 'Actions', icon: <PlayIcon />, onSelect: onActions },
        { id: 'tutorial', label: 'Tutorial', icon: <PlayIcon />, tone: 'accent', onSelect: onTutorial },
      ]}
    />,
  )
  const robot = screen.getByRole('button', { name: 'Assistant' })
  return { robot, root: robot.parentElement as HTMLElement }
}

function menuShown() {
  return screen.queryByRole('group', { name: 'Assistant' }) !== null
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('AssistantBot', () => {
  it('opens on mouse hover and closes shortly after the mouse leaves', () => {
    const { robot, root } = renderBot()
    fireEvent.pointerEnter(root, { pointerType: 'mouse' })
    expect(menuShown()).toBe(true)
    expect(robot.getAttribute('aria-expanded')).toBe('true')

    fireEvent.pointerLeave(root, { pointerType: 'mouse' })
    act(() => vi.advanceTimersByTime(HOVER_CLOSE_MS - 1))
    expect(menuShown()).toBe(true)
    act(() => vi.advanceTimersByTime(1))
    expect(menuShown()).toBe(false)
  })

  it('stays open when the mouse comes back before the delay ends', () => {
    const { root } = renderBot()
    fireEvent.pointerEnter(root, { pointerType: 'mouse' })
    fireEvent.pointerLeave(root, { pointerType: 'mouse' })
    act(() => vi.advanceTimersByTime(HOVER_CLOSE_MS / 2))
    fireEvent.pointerEnter(root, { pointerType: 'mouse' })
    act(() => vi.advanceTimersByTime(HOVER_CLOSE_MS * 2))
    expect(menuShown()).toBe(true)
  })

  it('does not open from a touch hover; a tap opens it', () => {
    const { robot, root } = renderBot()
    fireEvent.pointerEnter(root, { pointerType: 'touch' })
    expect(menuShown()).toBe(false)
    fireEvent.click(robot)
    expect(menuShown()).toBe(true)
  })

  it('keeps a hover-opened menu open after a click, until clicked again', () => {
    const { robot, root } = renderBot()
    fireEvent.pointerEnter(root, { pointerType: 'mouse' })
    fireEvent.click(robot)
    fireEvent.pointerLeave(root, { pointerType: 'mouse' })
    act(() => vi.advanceTimersByTime(HOVER_CLOSE_MS * 2))
    expect(menuShown()).toBe(true)
    fireEvent.click(robot)
    expect(menuShown()).toBe(false)
  })

  it('closes on Escape and on a click elsewhere', () => {
    const { robot } = renderBot()
    fireEvent.click(robot)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(menuShown()).toBe(false)
    fireEvent.click(robot)
    fireEvent.pointerDown(document.body)
    expect(menuShown()).toBe(false)
  })

  it('runs an item and closes the menu', () => {
    const { robot } = renderBot()
    fireEvent.click(robot)
    fireEvent.click(screen.getByRole('button', { name: 'Tutorial' }))
    expect(onTutorial).toHaveBeenCalledOnce()
    expect(menuShown()).toBe(false)
  })
})
