/**
 * Bolt guide for the path-choice hero: BotAvatar plus the shared ic-guide bubble.
 */
import { type PointerEvent, type RefObject } from 'react'
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
        >
          <div className="ic-guide__inner" key={hint}>
            <p className={`ic-guide__line${reducedMotion ? '' : ' is-swap-in'}`}>
              <span className="visually-hidden">{PATH_CHOICE.bolt.name}. </span>
              {sentence(hint)}
            </p>
            {action ? (
              <button
                type="button"
                className={`ic-guide__cta onboarding-cta onboarding-cta-nudge${
                  reducedMotion ? '' : ' is-swap-in-delayed'
                }`}
                onClick={(event) => {
                  event.stopPropagation()
                  activate()
                }}
              >
                {action}
              </button>
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
  onLayerPointerEnter?: () => void
  onLayerPointerLeave?: (event: PointerEvent<HTMLDivElement>) => void
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
  onLayerPointerEnter,
  onLayerPointerLeave,
  ...boltProps
}: FloatingProps) {
  const transition = reducedMotion
    ? 'opacity 150ms ease'
    : `transform ${BOLT_MOVE_MS}ms ${BOLT_EASE}`

  return (
    <div
      ref={guideRef}
      className="ic-bolt-layer"
      onPointerEnter={onLayerPointerEnter}
      onPointerLeave={onLayerPointerLeave}
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
