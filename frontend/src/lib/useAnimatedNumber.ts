import { useEffect, useRef, useState } from 'react'

const DEFAULT_DURATION_MS = 780

/**
 * easeOutExpo
 * @param t - 0–1 elapsed fraction
 * @returns Eased 0–1 progress that lands quickly after a fast spin
 */
function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - 2 ** (-10 * t)
}

type Options = {
  durationMs?: number
  delayMs?: number
}

/**
 * useAnimatedNumber
 * @param target - Value to settle on
 * @param options.durationMs - Spin length after any delay
 * @param options.delayMs - Stagger so neighbouring figures stop in sequence
 * @returns The in-flight display value
 *
 * First paint snaps to the target. Later changes interpolate from the
 * current figure so Daily / Weekly / Fortnightly reads as a tick, not a jump.
 */
export function useAnimatedNumber(target: number, options: Options = {}): number {
  const durationMs = options.durationMs ?? DEFAULT_DURATION_MS
  const delayMs = options.delayMs ?? 0
  const [value, setValue] = useState(target)
  const valueRef = useRef(target)
  const hasPainted = useRef(false)

  useEffect(() => {
    if (!hasPainted.current) {
      hasPainted.current = true
      valueRef.current = target
      setValue(target)
      return
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      // matchMedia belongs to an external system, not derived-from-props
      // state, and valueRef can't be written during render either way.
      valueRef.current = target
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(target)
      return
    }

    const from = valueRef.current
    if (from === target) return

    let frame = 0
    let start = 0
    let delayTimer = 0

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const next = from + (target - from) * easeOutExpo(t)
      valueRef.current = next
      setValue(next)
      if (t < 1) frame = requestAnimationFrame(tick)
      else {
        valueRef.current = target
        setValue(target)
      }
    }

    const begin = () => {
      start = performance.now()
      frame = requestAnimationFrame(tick)
    }

    if (delayMs > 0) delayTimer = window.setTimeout(begin, delayMs)
    else begin()

    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(delayTimer)
    }
  }, [delayMs, durationMs, target])

  return value
}
