/**
 * Shared playback for the full-screen intros: play, skip, replay, and focus.
 *
 * The intro runs for `introMs`, or clears within `skipMs` once skipped. Under
 * reduced motion it ends at once and never shows.
 */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useReducedMotion } from '../../lib/useReducedMotion'

type Phase = 'playing' | 'skipping' | 'done'

type Options = {
  play: boolean
  introMs: number
  skipMs: number
  /** Called once each time the intro finishes or is skipped. */
  onDone?: () => void
  /** Takes focus when the intro clears, so keyboard users land on the page. */
  focusAfter?: () => HTMLElement | null | undefined
}

/**
 * useIntroPlayback
 * @returns What to render, and the handlers for the overlay
 *
 * When the intro clears, focus moves to the element `focusAfter` returns.
 */
export function useIntroPlayback({ play, introMs, skipMs, onDone, focusAfter }: Options) {
  const reduced = useReducedMotion()
  const [phase, setPhase] = useState<Phase>(play ? 'playing' : 'done')
  const [run, setRun] = useState(0)
  const overlayRef = useRef<HTMLDivElement>(null)
  const doneRef = useRef(onDone)
  const focusNext = useRef(false)
  const showIntro = phase !== 'done' && !reduced

  useEffect(() => {
    doneRef.current = onDone
  }, [onDone])

  // Ends the intro after its run, after the skip, or at once under reduced motion.
  useEffect(() => {
    if (phase === 'done') return
    const ms = reduced ? 0 : phase === 'playing' ? introMs : skipMs
    const timer = window.setTimeout(() => {
      focusNext.current = true
      setPhase('done')
      doneRef.current?.()
    }, ms)
    return () => window.clearTimeout(timer)
  }, [phase, reduced, run, introMs, skipMs])

  useEffect(() => {
    if (showIntro && phase === 'playing') overlayRef.current?.focus()
  }, [showIntro, phase, run])

  useEffect(() => {
    if (phase === 'done' && focusNext.current) {
      focusNext.current = false
      focusAfter?.()?.focus()
    }
  }, [phase, focusAfter])

  function skip() {
    setPhase((current) => (current === 'playing' ? 'skipping' : current))
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') {
      event.preventDefault()
      skip()
    }
  }

  function replay() {
    setRun((count) => count + 1)
    setPhase('playing')
  }

  return {
    reduced,
    run,
    showIntro,
    skipping: phase === 'skipping',
    overlayRef,
    skip,
    onKeyDown,
    replay,
  }
}
