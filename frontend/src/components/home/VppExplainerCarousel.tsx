/**
 * Home-page “How a VPP works” carousel: diagram steps + cost compare panel.
 */
import { useId, useState } from 'react'
import {
  buildVppExplainerCompare,
  buildVppExplainerSteps,
  VPP_EXPLAINER_BATTERY,
  type VppExplainerCompareMode,
  type VppExplainerHousehold,
  type VppExplainerStepId,
} from '../../constants/welcome'
import { useSlidingHighlight } from '../../lib/useSlidingHighlight'
import { Button } from '../ui/Button'
import { BoltIcon, ChevronIcon, PeopleIcon } from '../ui/icons'

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

type DiagramStepId = Exclude<VppExplainerStepId, 'compare'>

/**
 * VppExplainerCarousel
 * @param props.isOnboarded - Whether household answers are saved on this device
 * @param props.householdData - Optional real shortfall week; null/undefined → example copy
 * @returns Dark explainer card with SVG diagram steps and a With/Without compare slide
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
  const [compareMode, setCompareMode] = useState<VppExplainerCompareMode>('with')
  const personal =
    isOnboarded && householdData && householdData.gapKwh > 0 ? householdData : null
  const steps = buildVppExplainerSteps(personal)
  const compare = buildVppExplainerCompare(personal)
  const step = steps[index] ?? steps[0]
  const isCompare = step.id === 'compare'

  function go(delta: number) {
    setIndex((prev) => (prev + delta + steps.length) % steps.length)
  }

  const storyEyebrow = personal
    ? 'Your numbers, one week'
    : 'An example, not your data yet'

  return (
    <section className="vpp-explainer" aria-labelledby={labelId}>
      <div className={`vpp-explainer__card${isCompare ? ' vpp-explainer__card--compare' : ''}`}>
        {isCompare ? (
          <ComparePanel
            labelId={labelId}
            copy={compare}
            mode={compareMode}
            onMode={setCompareMode}
            onPrev={() => go(-1)}
            onNext={() => go(1)}
            steps={steps}
            index={index}
            onSelect={setIndex}
          />
        ) : (
          <>
            <header className="vpp-explainer__head">
              <p className="vpp-explainer__eyebrow">{storyEyebrow}</p>
              <h2 id={labelId} className="vpp-explainer__title">
                How does a VPP actually work?
              </h2>
            </header>

            <div className="vpp-explainer__layout">
              <div className="vpp-explainer__diagram" aria-hidden="true">
                <VppExplainerDiagram step={step.id as DiagramStepId} />
              </div>

              <div className="vpp-explainer__panel">
                <h3 className="vpp-explainer__headline">{step.headline}</h3>
                <p className="vpp-explainer__body">{step.body}</p>

                <ExplainerControls
                  steps={steps}
                  index={index}
                  onPrev={() => go(-1)}
                  onNext={() => go(1)}
                  onSelect={setIndex}
                />
              </div>
            </div>
          </>
        )}
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

type ControlsProps = {
  steps: { id: string }[]
  index: number
  onPrev: () => void
  onNext: () => void
  onSelect: (index: number) => void
}

function ExplainerControls({ steps, index, onPrev, onNext, onSelect }: ControlsProps) {
  return (
    <div className="vpp-explainer__controls">
      <button type="button" className="vpp-explainer__nav" aria-label="Previous step" onClick={onPrev}>
        <ChevronIcon className="vpp-explainer__chevron vpp-explainer__chevron--prev" />
      </button>
      <button type="button" className="vpp-explainer__nav" aria-label="Next step" onClick={onNext}>
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
            onClick={() => onSelect(i)}
          />
        ))}
      </div>
    </div>
  )
}

type ComparePanelProps = {
  labelId: string
  copy: ReturnType<typeof buildVppExplainerCompare>
  mode: VppExplainerCompareMode
  onMode: (mode: VppExplainerCompareMode) => void
  onPrev: () => void
  onNext: () => void
  steps: { id: string }[]
  index: number
  onSelect: (index: number) => void
}

function ComparePanel({
  labelId,
  copy,
  mode,
  onMode,
  onPrev,
  onNext,
  steps,
  index,
  onSelect,
}: ComparePanelProps) {
  const { setRef, box } = useSlidingHighlight(mode, '[aria-checked="true"]')
  const side = mode === 'with' ? copy.with : copy.without
  const cost =
    side.costAud != null
      ? new Intl.NumberFormat('en-AU', {
          style: 'currency',
          currency: 'AUD',
          maximumFractionDigits: 2,
        }).format(side.costAud)
      : '—'

  return (
    <div className="vpp-compare">
      <header className="vpp-compare__head">
        <p className="vpp-explainer__eyebrow">{copy.eyebrow}</p>
        <h2 id={labelId} className="vpp-explainer__title">
          {copy.title}
        </h2>
      </header>

      <div
        ref={setRef}
        className="ui-toggle ui-toggle--on-deep vpp-compare__toggle"
        role="radiogroup"
        aria-label="Cover the shortfall with or without a VPP"
      >
        <span
          aria-hidden="true"
          className={`ui-toggle__highlight${box.visible ? ' is-visible' : ''}${
            box.ready ? ' is-ready' : ''
          }`}
          style={{
            transform: `translate3d(${box.left}px, ${box.top}px, 0)`,
            width: box.width,
            height: box.height,
          }}
        />
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'without'}
          className={`ui-toggle__option${mode === 'without' ? ' is-selected' : ''}`}
          onClick={() => onMode('without')}
        >
          Without a VPP
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'with'}
          className={`ui-toggle__option${mode === 'with' ? ' is-selected' : ''}`}
          onClick={() => onMode('with')}
        >
          With a VPP
        </button>
      </div>

      <article className="vpp-compare__card">
        <div className="vpp-compare__row">
          <span className={`vpp-compare__icon vpp-compare__icon--${mode}`} aria-hidden="true">
            {mode === 'with' ? <PeopleIcon width={18} height={18} /> : <BoltIcon width={18} height={18} />}
          </span>
          <div className="vpp-compare__copy">
            <p className="vpp-compare__title">{side.title}</p>
            <p className="vpp-compare__detail">{side.detail}</p>
          </div>
        </div>
        <div className="vpp-compare__cost">
          <p className="vpp-compare__cost-label">{side.costLabel}</p>
          <p className="vpp-compare__cost-value">
            {cost}
            <span className="visually-hidden"> Estimate</span>
          </p>
        </div>
      </article>

      <div className="vpp-compare__foot">
        <ExplainerControls
          steps={steps}
          index={index}
          onPrev={onPrev}
          onNext={onNext}
          onSelect={onSelect}
        />
        <p className="vpp-compare__caption">{side.footer}</p>
      </div>
    </div>
  )
}

type DiagramProps = {
  step: DiagramStepId
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

      <circle className="vpp-explainer-svg__orbit" cx="180" cy="160" r="108" fill="none" />

      <g className={`vpp-explainer-svg__grid${gridActive ? ' is-on' : gridDim ? ' is-dim' : ''}`}>
        <rect x="158" y="18" width="44" height="36" rx="6" />
        <path d="M168 30h24M168 38h24M168 46h12" />
        <text x="180" y="68" textAnchor="middle" className="vpp-explainer-svg__grid-label">
          grid
        </text>
      </g>

      <path
        className={`vpp-explainer-svg__link${
          gridActive ? ' is-on is-coral' : gridDim ? ' is-dim' : ''
        }`}
        d="M180 118 V72"
        markerEnd={gridActive ? 'url(#vpp-exp-arrow-coral)' : undefined}
      />

      {NEIGHBOURS.map((node) => (
        <circle
          key={node.id}
          className={`vpp-explainer-svg__neighbour${neighboursLit ? ' is-on' : ''}`}
          cx={node.x}
          cy={node.y}
          r="10"
        />
      ))}

      {NEIGHBOURS.map((node) => (
        <path
          key={`in-${node.id}`}
          className={`vpp-explainer-svg__link${neighboursIn ? ' is-on is-teal' : ''}`}
          d={`M${node.x} ${node.y} L${180 + node.hx} ${160 + node.hy}`}
          markerEnd={neighboursIn ? 'url(#vpp-exp-arrow-teal)' : undefined}
        />
      ))}

      {NEIGHBOURS.map((node) => (
        <path
          key={`out-${node.id}`}
          className={`vpp-explainer-svg__link${neighboursOut ? ' is-on is-coral' : ''}`}
          d={`M${180 + node.hx} ${160 + node.hy} L${node.x} ${node.y}`}
          markerEnd={neighboursOut ? 'url(#vpp-exp-arrow-coral)' : undefined}
        />
      ))}

      <circle className="vpp-explainer-svg__ring-track" cx="180" cy="160" r="52" fill="none" />
      <circle
        className={`vpp-explainer-svg__ring-fill ${ringTone}`}
        cx="180"
        cy="160"
        r="52"
        fill="none"
        strokeDasharray={`${fill} ${RING_LEN}`}
        transform="rotate(-90 180 160)"
      />

      <g className="vpp-explainer-svg__house" transform="translate(180 160)">
        <circle r="28" className="vpp-explainer-svg__house-disc" />
        <path
          className="vpp-explainer-svg__house-shape"
          d="M-12 4 L0 -12 L12 4 V14 H-12 Z"
        />
        <rect x="-3" y="4" width="6" height="10" rx="1" className="vpp-explainer-svg__door" />
      </g>

      <text x="180" y="228" textAnchor="middle" className="vpp-explainer-svg__battery-label">
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
