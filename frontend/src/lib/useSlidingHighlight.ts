/**
 * Measures the selected child of a segmented control so a highlight can slide to it.
 */
import { useCallback, useLayoutEffect, useRef, useState } from 'react'

export type SlidingBox = {
  left: number
  top: number
  width: number
  height: number
  visible: boolean
  ready: boolean
}

const HIDDEN: SlidingBox = {
  left: 0,
  top: 0,
  width: 0,
  height: 0,
  visible: false,
  ready: false,
}

/**
 * useSlidingHighlight
 * @param selected - Current value, or null/empty when nothing is chosen
 * @param itemSelector - Child that represents the selection
 * @returns Container ref plus pixel box for the moving highlight
 *
 * First paint has no transition so the pill does not fly in from 0,0.
 * Later moves use CSS on `.is-ready`.
 */
export function useSlidingHighlight(selected: string | null | undefined, itemSelector: string) {
  const containerRef = useRef<HTMLElement | null>(null)

  const setRef = useCallback((node: HTMLElement | null) => {
    containerRef.current = node
  }, [])
  const [box, setBox] = useState<SlidingBox>(HIDDEN)

  const measure = useCallback(() => {
    const root = containerRef.current
    if (!root || !selected) {
      setBox((current) => (current.visible ? { ...current, visible: false } : current))
      return
    }
    const item = root.querySelector(itemSelector)
    if (!(item instanceof HTMLElement)) {
      setBox((current) => (current.visible ? { ...current, visible: false } : current))
      return
    }
    const rootRect = root.getBoundingClientRect()
    const itemRect = item.getBoundingClientRect()
    const left = itemRect.left - rootRect.left + root.scrollLeft
    const top = itemRect.top - rootRect.top + root.scrollTop
    const width = itemRect.width
    const height = itemRect.height
    setBox((current) => {
      if (
        current.visible &&
        current.left === left &&
        current.top === top &&
        current.width === width &&
        current.height === height
      ) {
        return current
      }
      return {
        left,
        top,
        width,
        height,
        visible: true,
        ready: current.ready,
      }
    })
  }, [itemSelector, selected])

  useLayoutEffect(() => {
    measure()
    const root = containerRef.current
    if (!root) return
    const observer = new ResizeObserver(measure)
    observer.observe(root)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [measure])

  useLayoutEffect(() => {
    if (!box.visible || box.ready) return
    const frame = requestAnimationFrame(() => {
      setBox((current) => (current.visible ? { ...current, ready: true } : current))
    })
    return () => cancelAnimationFrame(frame)
  }, [box.ready, box.visible])

  return { setRef, box }
}
