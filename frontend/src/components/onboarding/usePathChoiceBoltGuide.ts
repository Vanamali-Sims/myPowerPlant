/**
 * Positions the path-choice Bolt guide with translate-only motion, hover intent,
 * and resize-aware measurement from the logo and each half's headline stack.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useReducedMotion } from '../../lib/useReducedMotion'

export type BoltHint = 'idle' | 'explore' | 'improve'

const HOVER_IN_MS = 120
const HOVER_OUT_MS = 200
const GAP_BELOW_HEADLINE = 36
const GAP_BELOW_MARK = 14
const MOBILE_QUERY = '(max-width: 767px)'
const HOVER_CAPABLE_QUERY = '(hover: hover) and (pointer: fine)'

export const BOLT_MOVE_MS = 550
export const BOLT_HEADLINE_MS = 450
export const BOLT_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

type Point = { x: number; y: number }

function canTravelBolt(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia(MOBILE_QUERY).matches === false &&
    window.matchMedia(HOVER_CAPABLE_QUERY).matches
  )
}

type Options = {
  enabled: boolean
  committed: BoltHint
  onRemeasure?: () => void
}

/**
 * usePathChoiceBoltGuide
 * @returns Refs, translate position, tilt, and layout flags for the floating Bolt
 */
export function usePathChoiceBoltGuide({ enabled, committed, onRemeasure }: Options) {
  const reducedMotion = useReducedMotion()
  const markRef = useRef<HTMLSpanElement>(null)
  const exploreStackRef = useRef<HTMLDivElement>(null)
  const improveStackRef = useRef<HTMLDivElement>(null)
  const guideRef = useRef<HTMLDivElement>(null)

  const [travel, setTravel] = useState(canTravelBolt)
  const [translate, setTranslate] = useState<Point>({ x: 0, y: 0 })
  const [tilt, setTilt] = useState(0)
  const prevCommitted = useRef<BoltHint>('idle')

  const measure = useCallback(() => {
    const guide = guideRef.current
    const mark = markRef.current
    if (!guide || !mark || !enabled || !travel) return

    const stack =
      committed === 'explore'
        ? exploreStackRef.current
        : committed === 'improve'
          ? improveStackRef.current
          : null

    const markRect = mark.getBoundingClientRect()
    const guideW = guide.offsetWidth
    let x = markRect.left + markRect.width / 2 - guideW / 2
    let y = markRect.bottom + GAP_BELOW_MARK

    if (committed !== 'idle' && stack) {
      const stackRect = stack.getBoundingClientRect()
      x = stackRect.left
      y = stackRect.bottom + GAP_BELOW_HEADLINE
    }

    setTranslate({ x, y })

    const from = prevCommitted.current
    if (!reducedMotion && from !== committed) {
      if (committed === 'explore') setTilt(-2.5)
      else if (committed === 'improve') setTilt(2.5)
      else setTilt(0)
      window.setTimeout(() => setTilt(0), BOLT_MOVE_MS)
    } else {
      setTilt(0)
    }
    prevCommitted.current = committed
    onRemeasure?.()
  }, [committed, enabled, onRemeasure, reducedMotion, travel])

  useLayoutEffect(() => {
    measure()
  }, [measure, committed])

  useEffect(() => {
    const updateTravel = () => setTravel(canTravelBolt())
    updateTravel()
    const mobile = window.matchMedia(MOBILE_QUERY)
    const hover = window.matchMedia(HOVER_CAPABLE_QUERY)
    mobile.addEventListener('change', updateTravel)
    hover.addEventListener('change', updateTravel)
    return () => {
      mobile.removeEventListener('change', updateTravel)
      hover.removeEventListener('change', updateTravel)
    }
  }, [])

  useEffect(() => {
    if (!enabled || !travel) return
    const onLayout = () => measure()
    window.addEventListener('resize', onLayout)
    window.addEventListener('scroll', onLayout, true)
    const observer =
      typeof ResizeObserver === 'function'
        ? new ResizeObserver(() => {
            measure()
          })
        : null
    if (guideRef.current) observer?.observe(guideRef.current)
    if (exploreStackRef.current) observer?.observe(exploreStackRef.current)
    if (improveStackRef.current) observer?.observe(improveStackRef.current)
    return () => {
      window.removeEventListener('resize', onLayout)
      window.removeEventListener('scroll', onLayout, true)
      observer?.disconnect()
    }
  }, [enabled, measure, travel])

  const travelLayout = travel

  return {
    markRef,
    exploreStackRef,
    improveStackRef,
    guideRef,
    translate,
    tilt,
    travel: travelLayout && !reducedMotion,
    reducedMotion,
    /** Stacked touch / narrow: Bolt lives under each headline instead of travelling. */
    staticLayout: !travelLayout,
  }
}

type HintControllerOptions = {
  resetKey: number
}

/**
 * useBoltHintState
 * @returns Pending and committed hints with pointer delays and immediate keyboard focus
 */
export function useBoltHintState({ resetKey }: HintControllerOptions) {
  const [pending, setPending] = useState<BoltHint>('idle')
  const [committed, setCommitted] = useState<BoltHint>('idle')
  const enterTimer = useRef(0)
  const leaveTimer = useRef(0)
  const focusLock = useRef<BoltHint | null>(null)

  const clearTimers = useCallback(() => {
    window.clearTimeout(enterTimer.current)
    window.clearTimeout(leaveTimer.current)
    enterTimer.current = 0
    leaveTimer.current = 0
  }, [])

  const resetHints = useCallback(() => {
    clearTimers()
    focusLock.current = null
    setPending('idle')
    setCommitted('idle')
  }, [clearTimers])

  // A new intro run drops any hover or focus hint. Adjusted while rendering so
  // the previous hint cannot paint for a frame, and so this is not an effect.
  const [appliedResetKey, setAppliedResetKey] = useState(resetKey)
  if (appliedResetKey !== resetKey) {
    setAppliedResetKey(resetKey)
    clearTimers()
    focusLock.current = null
    setPending('idle')
    setCommitted('idle')
  }

  const setPointerHint = useCallback(
    (hint: BoltHint) => {
      if (focusLock.current) return
      clearTimers()
      setPending(hint)
      if (hint === 'idle') {
        leaveTimer.current = window.setTimeout(() => setCommitted('idle'), HOVER_OUT_MS)
        return
      }
      enterTimer.current = window.setTimeout(() => setCommitted(hint), HOVER_IN_MS)
    },
    [clearTimers],
  )

  const setFocusHint = useCallback(
    (hint: BoltHint) => {
      clearTimers()
      if (hint === 'idle') {
        focusLock.current = null
        setPending('idle')
        setCommitted('idle')
        return
      }
      focusLock.current = hint
      setPending(hint)
      setCommitted(hint)
    },
    [clearTimers],
  )

  const releaseFocus = useCallback(
    (hint: BoltHint) => {
      if (focusLock.current !== hint) return
      focusLock.current = null
      setPointerHint('idle')
    },
    [setPointerHint],
  )

  return {
    pending,
    committed,
    setPointerHint,
    setFocusHint,
    releaseFocus,
    resetHints,
  }
}
