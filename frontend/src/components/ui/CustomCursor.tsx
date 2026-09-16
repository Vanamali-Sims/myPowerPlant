/**
 * Branded pointer: terracotta core with a lagging eucalypt ring.
 * Mouse + hover only. Native cursor stays for touch, text fields, dialogs,
 * and prefers-reduced-motion.
 */
import { useEffect, useRef } from 'react'

const HOVER_SELECTOR = [
  'a',
  'button',
  'label',
  'select',
  'summary',
  '[role="button"]',
  '[role="radio"]',
  '[role="option"]',
  '[role="tab"]',
  '.ui-choice',
  '.ui-dir',
  '.ui-radio-list__row',
  '.ui-toggle__option',
  '.ui-stepper__btn',
  '.article-card',
  '.feature-card',
  '.kpi-card',
  '.profile-card',
  '.vpp-plan-card',
  '.vpp-helps__quote',
  '.ui-choice',
  '.app-rail__item',
  '.vpp-plan-card__cta',
  '.brand--button',
  '.location-control__locate',
].join(',')

const TEXT_SELECTOR =
  'input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea, [contenteditable="true"]'

function canUseCustomCursor() {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

/**
 * CustomCursor
 * @returns JSX.Element
 *
 * Updates position on the DOM in rAF so React does not re-render every frame.
 */
export function CustomCursor() {
  const rootRef = useRef<HTMLDivElement>(null)
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const rootEl = rootRef.current
    const dotEl = dotRef.current
    const ringEl = ringRef.current
    if (!rootEl || !dotEl || !ringEl) return
    const root: HTMLDivElement = rootEl
    const dot: HTMLDivElement = dotEl
    const ring: HTMLDivElement = ringEl

    const hoverMq = window.matchMedia('(hover: hover) and (pointer: fine)')
    const motionMq = window.matchMedia('(prefers-reduced-motion: reduce)')

    let enabled = canUseCustomCursor()
    let x = 0
    let y = 0
    let rx = 0
    let ry = 0
    let visible = false
    let hovering = false
    let down = false
    let overText = false
    let dialogOpen = false
    let raf = 0
    const dialogObserver = new MutationObserver(() => {
      dialogOpen = Boolean(document.querySelector('dialog[open]'))
      syncFlags()
    })

    function setEnabled(next: boolean) {
      enabled = next
      document.documentElement.classList.toggle('has-custom-cursor', enabled)
      if (!enabled) {
        root.classList.remove('is-visible', 'is-hover', 'is-down')
        document.documentElement.classList.remove('custom-cursor-paused')
      }
    }

    function pauseOverlay(paused: boolean) {
      document.documentElement.classList.toggle('custom-cursor-paused', paused)
      root.classList.toggle('is-visible', enabled && visible && !paused)
    }

    function syncFlags() {
      root.classList.toggle('is-hover', hovering && !overText)
      root.classList.toggle('is-down', down)
      pauseOverlay(overText || dialogOpen)
    }

    function onMove(event: PointerEvent) {
      if (!enabled || event.pointerType !== 'mouse') return
      x = event.clientX
      y = event.clientY
      if (!visible || motionMq.matches) {
        visible = true
        rx = x
        ry = y
        dot.style.transform = `translate3d(${x}px, ${y}px, 0)`
        ring.style.transform = `translate3d(${x}px, ${y}px, 0)`
      }
      const target = event.target
      if (target instanceof Element) {
        overText = Boolean(target.closest(TEXT_SELECTOR))
        hovering = !overText && Boolean(target.closest(HOVER_SELECTOR))
        dialogOpen = Boolean(document.querySelector('dialog[open]'))
      }
      syncFlags()
      if (raf === 0 && !motionMq.matches) raf = requestAnimationFrame(tick)
    }

    function onOver(event: PointerEvent) {
      if (!enabled || event.pointerType !== 'mouse') return
      const target = event.target
      if (!(target instanceof Element)) return
      overText = Boolean(target.closest(TEXT_SELECTOR))
      hovering = !overText && Boolean(target.closest(HOVER_SELECTOR))
      dialogOpen = Boolean(document.querySelector('dialog[open]'))
      syncFlags()
    }

    function onDown(event: PointerEvent) {
      if (!enabled || event.pointerType !== 'mouse') return
      down = true
      syncFlags()
    }

    function onUp() {
      down = false
      syncFlags()
    }

    function onLeave() {
      visible = false
      root.classList.remove('is-visible')
    }

    function tick() {
      rx += (x - rx) * 0.2
      ry += (y - ry) * 0.2
      dot.style.transform = `translate3d(${x}px, ${y}px, 0)`
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`
      const catchingUp = Math.abs(x - rx) > 0.08 || Math.abs(y - ry) > 0.08
      raf = catchingUp ? requestAnimationFrame(tick) : 0
    }

    function applyMedia() {
      const next = canUseCustomCursor()
      setEnabled(next)
      if ((!next || motionMq.matches) && raf) {
        cancelAnimationFrame(raf)
        raf = 0
      }
    }

    applyMedia()
    dialogObserver.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['open'],
    })
    hoverMq.addEventListener('change', applyMedia)
    motionMq.addEventListener('change', applyMedia)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerover', onOver, { passive: true })
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    document.addEventListener('mouseleave', onLeave)

    return () => {
      cancelAnimationFrame(raf)
      dialogObserver.disconnect()
      document.documentElement.classList.remove('has-custom-cursor', 'custom-cursor-paused')
      hoverMq.removeEventListener('change', applyMedia)
      motionMq.removeEventListener('change', applyMedia)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerover', onOver)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      document.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return (
    <div ref={rootRef} className="custom-cursor" aria-hidden="true">
      <div ref={ringRef} className="custom-cursor__ring" />
      <div ref={dotRef} className="custom-cursor__dot" />
    </div>
  )
}
