/**
 * Bolt guide for the path-choice hero: BotAvatar plus the shared ic-guide bubble.
 */
import { type RefObject } from 'react'
import { PATH_CHOICE } from '../../constants/onboarding'
import { BotAvatar } from '../ui/BotAvatar'
import type { BoltHint } from './usePathChoiceBoltGuide'
import { BOLT_EASE, BOLT_MOVE_MS } from './usePathChoiceBoltGuide'

type Props = {
  hint: BoltHint
  smiling?: boolean
  /** First appearance after the brand intro. */
  enter?: boolean
  /** Side bubble (8px top-left) vs centred pill idle bubble. */
  anchored?: boolean
  /** Hide the speech bubble (avatar only). */
  bubbleHidden?: boolean
  reducedMotion?: boolean
  onExplore: () => void
  onImprove: () => void
  className?: string
}

function sentence(hint: BoltHint) {
  if (hint === 'explore') return PATH_CHOICE.bolt.explore
  if (hint === 'improve') return PATH_CHOICE.bolt.improve
  return PATH_CHOICE.bolt.hello
}

function cta(hint: BoltHint) {
  if (hint === 'explore') return PATH_CHOICE.explore.action
  if (hint === 'improve') return PATH_CHOICE.improve.action
  return null
}

/**
 * PathChoiceBolt
 * @returns Bolt row with speech bubble and optional CTA link
 */
export function PathChoiceBolt({
  hint,
  smiling = false,
  enter = false,
  anchored = false,
  bubbleHidden = false,
  reducedMotion = false,
  onExplore,
  onImprove,
  className = '',
}: Props) {
  const action = cta(hint)

  function activate() {
    if (hint === 'explore') onExplore()
    if (hint === 'improve') onImprove()
  }

  const classes = ['ic-guide', enter ? 'is-in' : '', className].filter(Boolean).join(' ')

  const sayClasses = [
    'ic-guide__say',
    anchored ? 'ic-guide__say--anchored' : '',
    bubbleHidden ? 'ic-guide__say--hidden' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes}>
      <BotAvatar size={52} blink smiling={smiling || hint !== 'idle'} className="ic-guide__bot" />
      {bubbleHidden ? null : (
        <div
          className={sayClasses}
          onClick={() => {
            if (action) activate()
          }}
          onKeyDown={(event) => {
            if (!action) return
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              activate()
            }
          }}
          role={action ? 'button' : undefined}
          tabIndex={action ? 0 : -1}
        >
          <div className="ic-guide__inner" key={hint}>
            <p className={`ic-guide__line${reducedMotion ? '' : ' is-swap-in'}`}>
              <span className="visually-hidden">{PATH_CHOICE.bolt.name}. </span>
              {sentence(hint)}
            </p>
            {action ? (
              <a
                className={`ic-guide__cta${reducedMotion ? '' : ' is-swap-in-delayed'}`}
                href="#"
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  activate()
                }}
              >
                {action}
                <span aria-hidden="true"> →</span>
              </a>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

type FloatingProps = Props & {
  translate: { x: number; y: number }
  tilt: number
  travel: boolean
  guideRef: RefObject<HTMLDivElement | null>
}

/**
 * PathChoiceBoltFloating
 * @returns Fixed-layer Bolt positioned with translate only
 */
export function PathChoiceBoltFloating({
  translate,
  tilt,
  travel,
  guideRef,
  reducedMotion,
  ...boltProps
}: FloatingProps) {
  const transition = reducedMotion
    ? 'opacity 150ms ease'
    : `transform ${BOLT_MOVE_MS}ms ${BOLT_EASE}`

  return (
    <div
      ref={guideRef}
      className="ic-bolt-layer"
      style={{
        transform: `translate(${translate.x}px, ${translate.y}px)`,
        transition,
      }}
    >
      <div
        className="ic-guide__tilt"
        style={{
          transform: travel && !reducedMotion ? `rotate(${tilt}deg)` : undefined,
          transition: travel && !reducedMotion ? `transform ${BOLT_MOVE_MS}ms ${BOLT_EASE}` : undefined,
        }}
      >
        <PathChoiceBolt {...boltProps} reducedMotion={reducedMotion} />
      </div>
    </div>
  )
}
