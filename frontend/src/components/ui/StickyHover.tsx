/**
 * Grows cards, buttons, and rail items under the pointer and trails slightly.
 * Mouse + hover only. Still runs when the OS asks for reduced motion so hover
 * feedback is visible; only the trail eases off in CSS.
 */
import { useEffect } from 'react'

const SELECTOR = [
  '.feature-card',
  '.article-card',
  '.kpi-card',
  '.profile-card',
  '.vpp-plan-card',
  '.step',
  '.text-point',
  '.ui-choice',
  '.ui-dir',
  '.ui-btn',
  '.app-rail__item',
  '.brand--button',
].join(',')

function canUseStickyHover() {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

function reset(node: HTMLElement | null) {
  if (!node) return
  node.classList.remove('is-hover-grow')
  node.style.setProperty('--hover-x', '0px')
  node.style.setProperty('--hover-y', '0px')
}

function strengthFor(node: HTMLElement) {
  if (node.classList.contains('ui-btn') || node.classList.contains('app-rail__item')) return 4
  return 8
}

/**
 * StickyHover
 * @returns null
 *
 * Adds is-hover-grow and pointer-offset CSS variables on the hovered node.
 */
export function StickyHover() {
  useEffect(() => {
    const hoverMq = window.matchMedia('(hover: hover) and (pointer: fine)')
    let current: HTMLElement | null = null

    function onMove(event: PointerEvent) {
      if (!canUseStickyHover() || event.pointerType !== 'mouse') return
      const target = event.target
      if (!(target instanceof Element)) return
      const next = target.closest(SELECTOR)
      if (!(next instanceof HTMLElement) || next.matches(':disabled, .is-unavailable')) {
        reset(current)
        current = null
        return
      }
      if (current && current !== next) reset(current)
      current = next
      next.classList.add('is-hover-grow')
      const rect = next.getBoundingClientRect()
      const px = (event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5
      const py = (event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5
      const max = strengthFor(next)
      next.style.setProperty('--hover-x', `${(px * max).toFixed(2)}px`)
      next.style.setProperty('--hover-y', `${(py * max).toFixed(2)}px`)
    }

    function onLeave() {
      reset(current)
      current = null
    }

    function onMediaChange() {
      if (!canUseStickyHover()) onLeave()
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('mouseleave', onLeave)
    hoverMq.addEventListener('change', onMediaChange)
    return () => {
      onLeave()
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('mouseleave', onLeave)
      hoverMq.removeEventListener('change', onMediaChange)
    }
  }, [])

  return null
}
