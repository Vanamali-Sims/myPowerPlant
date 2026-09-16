/**
 * Home-page “How a VPP works” carousel: diagram + four explainer steps.
 */
import { useId, useState } from 'react'
import {
  buildVppExplainerSteps,
  VPP_EXPLAINER_BATTERY,
  type VppExplainerHousehold,
  type VppExplainerStepId,
} from '../../constants/welcome'
import { Button } from '../ui/Button'
import { ChevronIcon } from '../ui/icons'

export type VppExplainerCarouselProps = {
  /** Same flag as Welcome / AppShell: saved profile on this device. */
  isOnboarded: boolean
  /** Weekly shortfall figures when modelled; omit to keep hypothetical copy. */
  householdData?: VppExplainerHousehold | null
  onFillDetails: () => void
  onSeeNumbers: () => void
}

/** Circumference of battery ring at r=52 (2πr). */
const RING_LEN = 2 * Math.PI * 52

/**
 * VppExplainerCarousel
 * @param props.isOnboarded - Whether household answers are saved on this device
 * @param props.householdData - Optional real shortfall week; null/undefined → example copy
 * @returns Dark explainer card with SVG diagram and stepped copy
 *
 * Parent owns profile/methodology fetch. This component only renders the story.
 */
export function VppExplainerCarousel({
  isOnboarded,
  householdData = null,
  onFillDetails,
  onSeeNumbers,
}: VppExplainerCarouselProps) {
  const labelId = useId()
  const [index, setIndex] = useState(0)
  const personal =
    isOnboarded && householdData && householdData.gapKwh > 0 ? householdData : null
  const steps = buildVppExplainerSteps(personal)
  const step = steps[index] ?? steps[0]
  const stepId = step.id

  function go(delta: number) {
    setIndex((prev) => (prev + delta + steps.length) % steps.length)
  }

  const eyebrow = personal
    ? 'Your numbers, one week'
    : 'An example, not your data yet'

  return (
    <section className="vpp-explainer" aria-labelledby={labelId}>
      <div className="vpp-explainer__card">
        <header className="vpp-explainer__head">
          <p className="vpp-explainer__eyebrow">{eyebrow}</p>
          <h2 id={labelId} className="vpp-explainer__title">
            How does a VPP actually work?
          </h2>
        </header>

        <div className="vpp-explainer__layout">
          <div className="vpp-explainer__diagram" aria-hidden="true">
            <VppExplainerDiagram step={stepId} />
          </div>

          <div className="vpp-explainer__panel">
            <h3 className="vpp-explainer__headline">{step.headline}</h3>
            <p className="vpp-explainer__body">{step.body}</p>

            <div className="vpp-explainer__controls">
              <button
                type="button"
                className="vpp-explainer__nav"
                aria-label="Previous step"
                onClick={() => go(-1)}
              >
                <ChevronIcon className="vpp-explainer__chevron vpp-explainer__chevron--prev" />
              </button>
              <button
                type="button"
                className="vpp-explainer__nav"
                aria-label="Next step"
                onClick={() => go(1)}
              >
                <ChevronIcon className="vpp-explainer__chevron vpp-explainer__chevron--next" />
              </button>

              <div className="vpp-explainer__dots" role="group" aria-label="Explainer steps">
                {steps.map((item, i) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={i === index ? 'step' : undefined}
                    aria-label={`Step ${i + 1}`}
                    className={`vpp-explainer__dot${i === index ? ' is-active' : ''}`}
                    onClick={() => setIndex(i)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="vpp-explainer__cta">
        {isOnboarded ? (
          <Button variant="primary" onClick={onSeeNumbers}>
            See your numbers
          </Button>
        ) : (
          <Button variant="primary" onClick={onFillDetails}>
            Fill in your details
          </Button>
        )}
      </div>
    </section>
  )
}

type DiagramProps = {
  step: VppExplainerStepId
}

function VppExplainerDiagram({ step }: DiagramProps) {
  const level = VPP_EXPLAINER_BATTERY[step]
  const fill = RING_LEN * level
  const pct = Math.round(level * 100)
  const gridActive = step === 'grid'
  const gridDim = step === 'neighbour' || step === 'trade'
  const neighboursIn = step === 'neighbour'
  const neighboursOut = step === 'trade'
  const neighboursLit = neighboursIn || neighboursOut
  const ringTone = step === 'neighbour' || step === 'trade' ? 'is-teal' : 'is-coral'

  return (
    <svg
      className={`vpp-explainer-svg vpp-explainer-svg--${step}`}
      viewBox="0 0 360 300"
      role="img"
    >
      <defs>
        <marker
          id="vpp-exp-arrow-coral"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6 Z" className="vpp-explainer-svg__marker--coral" />
        </marker>
        <marker
          id="vpp-exp-arrow-teal"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6 Z" className="vpp-explainer-svg__marker--teal" />
        </marker>
      </defs>

      {/* Faint orbit for neighbour nodes */}
      <circle
        className="vpp-explainer-svg__orbit"
        cx="180"
        cy="160"
        r="108"
        fill="none"
      />

      {/* Grid node */}
      <g className={`vpp-explainer-svg__grid${gridActive ? ' is-on' : gridDim ? ' is-dim' : ''}`}>
        <rect x="158" y="18" width="44" height="36" rx="6" />
        <path d="M168 30h24M168 38h24M168 46h12" />
        <text x="180" y="68" textAnchor="middle" className="vpp-explainer-svg__grid-label">
          grid
        </text>
      </g>

      {/* House ↔ grid */}
      <path
        className={`vpp-explainer-svg__link${
          gridActive ? ' is-on is-coral' : gridDim ? ' is-dim' : ''
        }`}
        d="M180 118 V72"
        markerEnd={gridActive ? 'url(#vpp-exp-arrow-coral)' : undefined}
      />

      {/* Neighbour nodes */}
      {NEIGHBOURS.map((node) => (
        <circle
          key={node.id}
          className={`vpp-explainer-svg__neighbour${neighboursLit ? ' is-on' : ''}`}
          cx={node.x}
          cy={node.y}
          r="10"
        />
      ))}

      {/* Neighbour links into house */}
      {NEIGHBOURS.map((node) => (
        <path
          key={`in-${node.id}`}
          className={`vpp-explainer-svg__link${neighboursIn ? ' is-on is-teal' : ''}`}
          d={`M${node.x} ${node.y} L${180 + node.hx} ${160 + node.hy}`}
          markerEnd={neighboursIn ? 'url(#vpp-exp-arrow-teal)' : undefined}
        />
      ))}

      {/* Outgoing lend links (trade step) */}
      {NEIGHBOURS.map((node) => (
        <path
          key={`out-${node.id}`}
          className={`vpp-explainer-svg__link${neighboursOut ? ' is-on is-coral' : ''}`}
          d={`M${180 + node.hx} ${160 + node.hy} L${node.x} ${node.y}`}
          markerEnd={neighboursOut ? 'url(#vpp-exp-arrow-coral)' : undefined}
        />
      ))}

      {/* Battery ring */}
      <circle
        className="vpp-explainer-svg__ring-track"
        cx="180"
        cy="160"
        r="52"
        fill="none"
      />
      <circle
        className={`vpp-explainer-svg__ring-fill ${ringTone}`}
        cx="180"
        cy="160"
        r="52"
        fill="none"
        strokeDasharray={`${fill} ${RING_LEN}`}
        transform="rotate(-90 180 160)"
      />

      {/* House */}
      <g className="vpp-explainer-svg__house" transform="translate(180 160)">
        <circle r="28" className="vpp-explainer-svg__house-disc" />
        <path
          className="vpp-explainer-svg__house-shape"
          d="M-12 4 L0 -12 L12 4 V14 H-12 Z"
        />
        <rect x="-3" y="4" width="6" height="10" rx="1" className="vpp-explainer-svg__door" />
      </g>

      <text
        x="180"
        y="228"
        textAnchor="middle"
        className="vpp-explainer-svg__battery-label"
      >
        {`battery ${pct}%`}
      </text>
    </svg>
  )
}

const NEIGHBOURS = [
  { id: 'n1', x: 78, y: 92, hx: -18, hy: -16 },
  { id: 'n2', x: 48, y: 170, hx: -24, hy: 2 },
  { id: 'n3', x: 282, y: 92, hx: 18, hy: -16 },
  { id: 'n4', x: 312, y: 170, hx: 24, hy: 2 },
  { id: 'n5', x: 180, y: 255, hx: 0, hy: 22 },
] as const
