import { describe, expect, it } from 'vitest'

import { TOOLTIP_GAP, VIEWPORT_MARGIN, placeTooltip, unionBox } from '../tutorialLayout'

const view = { width: 1200, height: 800 }
const tip = { width: 300, height: 150 }

describe('placeTooltip', () => {
  it('uses the preferred side when it fits', () => {
    const target = { top: 400, left: 500, width: 100, height: 40 }
    const position = placeTooltip(target, tip, view, 'top')
    expect(position.placement).toBe('top')
    expect(position.top).toBe(400 - TOOLTIP_GAP - 150)
    expect(position.left).toBe(500 + 50 - 150)
  })

  it('flips to the opposite side when the preferred one has no room', () => {
    const target = { top: 20, left: 500, width: 100, height: 40 }
    expect(placeTooltip(target, tip, view, 'top').placement).toBe('bottom')
  })

  it('keeps the tooltip inside the viewport near an edge', () => {
    const target = { top: 740, left: 1150, width: 40, height: 40 }
    const position = placeTooltip(target, tip, view, 'top')
    expect(position.left).toBe(view.width - tip.width - VIEWPORT_MARGIN)
    expect(position.top).toBeGreaterThanOrEqual(VIEWPORT_MARGIN)
  })

  it('fits at phone width', () => {
    const phone = { width: 320, height: 640 }
    const narrow = { width: 288, height: 170 }
    const target = { top: 580, left: 250, width: 56, height: 44 }
    const position = placeTooltip(target, narrow, phone, 'top')
    expect(position.placement).toBe('top')
    expect(position.left).toBe(VIEWPORT_MARGIN)
    expect(position.left + narrow.width).toBeLessThanOrEqual(phone.width - VIEWPORT_MARGIN)
  })

  it('centres the tooltip when there is no target', () => {
    const position = placeTooltip(null, tip, view, 'right')
    expect(position).toEqual({ top: 325, left: 450, placement: 'center' })
  })
})

describe('unionBox', () => {
  it('covers every target so one spotlight can frame a group', () => {
    const icons = [
      { top: 200, left: 10, width: 80, height: 70 },
      { top: 290, left: 10, width: 80, height: 70 },
      { top: 380, left: 12, width: 76, height: 70 },
    ]
    expect(unionBox(icons)).toEqual({ top: 200, left: 10, width: 80, height: 250 })
  })

  it('is null with no targets', () => {
    expect(unionBox([])).toBeNull()
  })
})
