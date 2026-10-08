/**
 * A few seconds of confetti for a reached goal. Decoration only.
 *
 * Uses canvas-confetti through confetti.create on this component's own
 * canvas with useWorker off, never the default export: the default creates a
 * blob web worker, which the site's Content Security Policy blocks. The canvas
 * is aria-hidden and ignores the pointer, so it is never announced and never
 * covers the dialog's buttons. Callers do not render this at all under reduced
 * motion, and the option below is a second guard.
 */
import confetti from 'canvas-confetti'
import { useEffect, useRef } from 'react'
import { CONFETTI_DURATION_MS } from '../../constants/goals'

const TOKEN_COLOURS = ['--accent', '--euc-400', '--euc-600', '--terra-200', '--euc-200']
const BURST_EVERY_MS = 250

function tokenColours(): string[] {
  const styles = getComputedStyle(document.documentElement)
  return TOKEN_COLOURS.map((name) => styles.getPropertyValue(name).trim()).filter(Boolean)
}

/**
 * Confetti
 * @returns A full-window canvas that rains confetti for CONFETTI_DURATION_MS, then stops
 */
export function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const fire = confetti.create(canvas, {
      resize: true,
      useWorker: false,
      disableForReducedMotion: true,
    })
    const colors = tokenColours()
    const stopAt = Date.now() + CONFETTI_DURATION_MS
    const burst = () => {
      void fire({ particleCount: 40, spread: 70, startVelocity: 38, origin: { x: 0.2, y: 0.4 }, colors })
      void fire({ particleCount: 40, spread: 70, startVelocity: 38, origin: { x: 0.8, y: 0.4 }, colors })
    }
    burst()
    const timer = window.setInterval(() => {
      if (Date.now() >= stopAt) {
        window.clearInterval(timer)
        return
      }
      burst()
    }, BURST_EVERY_MS)
    return () => {
      window.clearInterval(timer)
      fire.reset()
    }
  }, [])

  return <canvas ref={canvasRef} className="goals-confetti" aria-hidden="true" />
}
