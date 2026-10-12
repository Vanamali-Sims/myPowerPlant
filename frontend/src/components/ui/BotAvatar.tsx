/**
 * The assistant robot: dark green head, glowing orange eyes in a visor, an
 * antenna spark and a row of status lights. Decorative; the button or dialog
 * around it carries the name.
 *
 * It can blink at random intervals and smile (happy arc eyes and a small
 * mouth). Blinking is skipped when the visitor asks for reduced motion.
 */
import { useEffect, useId, useState, type SVGProps } from 'react'
import { useReducedMotion } from '../../lib/useReducedMotion'

/** A blink comes every 4 to 8 seconds, chosen afresh each time. */
export const BLINK_MIN_MS = 4000
export const BLINK_MAX_MS = 8000
/** How long the eyes stay shut. */
export const BLINK_MS = 120

const EYE = '#f3a27b'

type Props = SVGProps<SVGSVGElement> & {
  /** Rendered width and height in pixels. */
  size?: number
  /** Smiling eyes and mouth instead of the resting eyes. */
  smiling?: boolean
  /** Blink now and then while resting. */
  blink?: boolean
}

/**
 * BotAvatar
 * @param props.size - Width and height in pixels (default 56)
 * @param props.smiling - Show the happy face
 * @param props.blink - Blink every 4 to 8 seconds while not smiling
 * @returns JSX.Element
 */
export function BotAvatar({ size = 56, smiling = false, blink = false, ...props }: Props) {
  const id = useId()
  const head = `${id}-head`
  const glow = `${id}-glow`
  const reducedMotion = useReducedMotion()
  const [blinking, setBlinking] = useState(false)
  const canBlink = blink && !reducedMotion

  useEffect(() => {
    if (!canBlink) return
    let timer = 0
    const schedule = () => {
      const wait = BLINK_MIN_MS + Math.random() * (BLINK_MAX_MS - BLINK_MIN_MS)
      timer = window.setTimeout(() => {
        setBlinking(true)
        timer = window.setTimeout(() => {
          setBlinking(false)
          schedule()
        }, BLINK_MS)
      }, wait)
    }
    schedule()
    return () => window.clearTimeout(timer)
  }, [canBlink])

  const eyesShut = canBlink && blinking && !smiling

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      data-face={smiling ? 'smiling' : eyesShut ? 'blinking' : 'resting'}
      {...props}
    >
      <defs>
        <linearGradient id={head} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b5a4b" />
          <stop offset="1" stopColor="#173a2f" />
        </linearGradient>
        <radialGradient id={glow}>
          <stop offset="0" stopColor="#f5a06e" stopOpacity="0.55" />
          <stop offset="1" stopColor="#f5a06e" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Cap */}
      <rect x="24" y="5" width="16" height="7" rx="2.5" fill="#2e5a4c" />
      {/* Head */}
      <rect x="6" y="10" width="52" height="49" rx="14" fill={`url(#${head})`} />
      <rect x="6.75" y="10.75" width="50.5" height="47.5" rx="13.25" fill="none" stroke="#3d6b5c" strokeOpacity="0.6" strokeWidth="1.5" />
      {/* Visor and eyes */}
      <rect x="12.5" y="22" width="39" height="17" rx="8.5" fill="#0d1d18" />
      <ellipse cx="24" cy="30.5" rx="8" ry="6" fill={`url(#${glow})`} />
      <ellipse cx="40" cy="30.5" rx="8" ry="6" fill={`url(#${glow})`} />
      {smiling ? (
        <g fill="none" stroke={EYE} strokeLinecap="round">
          <path d="M19.5 31.5 Q24 25.5 28.5 31.5" strokeWidth="2.6" />
          <path d="M35.5 31.5 Q40 25.5 44.5 31.5" strokeWidth="2.6" />
          <path d="M28.5 34.5 Q32 37.5 35.5 34.5" strokeWidth="1.8" />
        </g>
      ) : (
        <g
          style={{
            transform: eyesShut ? 'scaleY(0.12)' : undefined,
            transformOrigin: '32px 30.75px',
            transition: canBlink ? 'transform 70ms ease-in-out' : undefined,
          }}
        >
          <rect x="19" y="27.5" width="10" height="6.5" rx="3.25" fill={EYE} />
          <rect x="35" y="27.5" width="10" height="6.5" rx="3.25" fill={EYE} />
        </g>
      )}
      {/* Status lights */}
      <rect x="15" y="45" width="5" height="5" rx="1.2" fill="#7fd9a8" />
      <rect x="22.5" y="45" width="5" height="5" rx="1.2" fill="#2f5c4e" />
      <rect x="30" y="45" width="5" height="5" rx="1.2" fill="#2f5c4e" />
      <rect x="37.5" y="45" width="5" height="5" rx="1.2" fill="#2f5c4e" />
      {/* Antenna spark */}
      <path d="M55.5 1.5 51 8.5h3.6L52.5 14l5.5-7.6h-3.7l1.2-4.9z" fill="#f08a4b" />
    </svg>
  )
}
