/**
 * Pure helpers for the tutorial overlay: finding a step's target and placing
 * the tooltip next to it inside the viewport.
 */
import type { TutorialPlacement } from '../../constants/tutorials'

export type Box = { top: number; left: number; width: number; height: number }
export type Size = { width: number; height: number }
export type TooltipPosition = { top: number; left: number; placement: TutorialPlacement | 'center' }

/** Space between the target and the tooltip, and kept clear at the viewport edge. */
export const TOOLTIP_GAP = 14
export const VIEWPORT_MARGIN = 16
/** Space between the target and the spotlight ring. */
export const SPOTLIGHT_PADDING = 6

const FALLBACK_ORDER: Record<TutorialPlacement, TutorialPlacement[]> = {
  top: ['top', 'bottom', 'right', 'left'],
  bottom: ['bottom', 'top', 'right', 'left'],
  right: ['right', 'left', 'top', 'bottom'],
  left: ['left', 'right', 'top', 'bottom'],
}

/**
 * findTutorialTargets
 * @param target - data-tour value
 * @returns Every matching element that is in the page and not hidden; empty when none
 *
 * checkVisibility catches targets inside display:none (the rail at phone
 * width). Where it is missing (older browsers, jsdom) an element counts as shown.
 */
export function findTutorialTargets(target: string): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`)).filter(
    (element) =>
      element.isConnected &&
      (typeof element.checkVisibility !== 'function' || element.checkVisibility()),
  )
}

/**
 * unionBox
 * @param boxes - Viewport boxes of the targets
 * @returns The smallest box around all of them, or null when there are none
 */
export function unionBox(boxes: Box[]): Box | null {
  if (boxes.length === 0) return null
  const top = Math.min(...boxes.map((box) => box.top))
  const left = Math.min(...boxes.map((box) => box.left))
  const bottom = Math.max(...boxes.map((box) => box.top + box.height))
  const right = Math.max(...boxes.map((box) => box.left + box.width))
  return { top, left, width: right - left, height: bottom - top }
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min
  return Math.min(Math.max(value, min), max)
}

function fits(side: TutorialPlacement, target: Box, tip: Size, view: Size): boolean {
  if (side === 'top') return target.top - TOOLTIP_GAP - tip.height >= VIEWPORT_MARGIN
  if (side === 'bottom') {
    return target.top + target.height + TOOLTIP_GAP + tip.height <= view.height - VIEWPORT_MARGIN
  }
  if (side === 'left') return target.left - TOOLTIP_GAP - tip.width >= VIEWPORT_MARGIN
  return target.left + target.width + TOOLTIP_GAP + tip.width <= view.width - VIEWPORT_MARGIN
}

function sidePosition(side: TutorialPlacement, target: Box, tip: Size): { top: number; left: number } {
  const centreX = target.left + target.width / 2 - tip.width / 2
  const centreY = target.top + target.height / 2 - tip.height / 2
  if (side === 'top') return { top: target.top - TOOLTIP_GAP - tip.height, left: centreX }
  if (side === 'bottom') return { top: target.top + target.height + TOOLTIP_GAP, left: centreX }
  if (side === 'left') return { top: centreY, left: target.left - TOOLTIP_GAP - tip.width }
  return { top: centreY, left: target.left + target.width + TOOLTIP_GAP }
}

/**
 * placeTooltip
 * @param target - Target box in viewport coordinates, or null to centre the tooltip
 * @param tip - Rendered tooltip size
 * @param view - Viewport size
 * @param preferred - Side the step asks for
 * @returns Where to put the tooltip, kept fully inside the viewport
 *
 * Tries the preferred side, then its opposite, then the remaining sides, and
 * falls back to the preferred side clamped to the edges when none fit.
 */
export function placeTooltip(
  target: Box | null,
  tip: Size,
  view: Size,
  preferred: TutorialPlacement,
): TooltipPosition {
  const maxTop = view.height - tip.height - VIEWPORT_MARGIN
  const maxLeft = view.width - tip.width - VIEWPORT_MARGIN
  if (!target) {
    return {
      top: clamp((view.height - tip.height) / 2, VIEWPORT_MARGIN, maxTop),
      left: clamp((view.width - tip.width) / 2, VIEWPORT_MARGIN, maxLeft),
      placement: 'center',
    }
  }
  const side = FALLBACK_ORDER[preferred].find((candidate) => fits(candidate, target, tip, view)) ?? preferred
  const raw = sidePosition(side, target, tip)
  return {
    top: clamp(raw.top, VIEWPORT_MARGIN, maxTop),
    left: clamp(raw.left, VIEWPORT_MARGIN, maxLeft),
    placement: side,
  }
}
