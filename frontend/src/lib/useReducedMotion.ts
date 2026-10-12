/**
 * Shared prefers-reduced-motion helper for animated pieces (goal tree, confetti).
 */
import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function mediaQuery(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null
  return window.matchMedia(QUERY)
}

/**
 * prefersReducedMotion
 * @returns True when the visitor asks for less motion, or when it cannot be told
 *
 * Unknown is treated as reduced so nothing moves without a clear signal.
 */
export function prefersReducedMotion(): boolean {
  return mediaQuery()?.matches ?? true
}

function subscribe(onChange: () => void): () => void {
  const query = mediaQuery()
  if (!query) return () => {}
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

/**
 * useReducedMotion
 * @returns Whether to skip motion, kept in step with the system setting
 *
 * When true, animated pieces show their final state at once with no transition.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => true)
}
