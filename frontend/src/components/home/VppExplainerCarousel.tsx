/**
 * Home-page “How a VPP works” carousel: four slides, shared two-column layout.
 */
import { useId, useState } from 'react'
import {
  buildVppExplainerCompare,
  buildVppExplainerSteps,
  formatExplainerExactAud,
  formatExplainerYearAud,
  VPP_EXPLAINER_CTA,
  VPP_EXPLAINER_EXAMPLE,
  VPP_EXPLAINER_FLOW,
  type VppExplainerCompareMode,
  type VppExplainerHousehold,
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

/**
 * VppExplainerCarousel
 * @param props.isOnboarded - Whether household answers are saved on this device
 * @param props.householdData - Optional real shortfall week; null/undefined → example copy
 * @returns Dark explainer card with four slides and left/right step controls
 *
 * Parent owns profile/methodology fetch. This component only renders the story.
 * onFillDetails / onSeeNumbers stay on the public props so Welcome’s API does not change;
 * the dashboard CTA now lives in the how-it-helps section below.
 */
export function VppExplainerCarousel({
  isOnboarded,
  householdData = null,
}: VppExplainerCarouselProps) {
  const labelId = useId()
  const [index, setIndex] = useState(0)
  const [compareMode, setCompareMode] = useState<VppExplainerCompareMode>('with')
  const personal =
    isOnboarded && householdData && householdData.gapKwh > 0 ? householdData : null
  const steps = buildVppExplainerSteps(personal)
  const compare = buildVppExplainerCompare(personal)
  const current = Math.min(index, steps.length - 1)
  const step = steps[current] ?? steps[0]
  const compareSide = compareMode === 'with' ? compare.with : compare.without

  function go(delta: number) {
    setIndex((prev) => (prev + delta + steps.length) % steps.length)
  }

  const storyEyebrow = personal
    ? 'Your numbers, one week'
    : 'An example, not your data yet'
  const eyebrow =
    step.id === 'compare'
      ? compare.eyebrow
      : step.id === 'cta'
        ? VPP_EXPLAINER_CTA.eyebrow
        : storyEyebrow
  const title =
    step.id === 'compare'
      ? compare.title
      : step.id === 'cta'
        ? VPP_EXPLAINER_CTA.title
        : 'How does a VPP actually work?'

  return (
    <section className="vpp-explainer" aria-labelledby={labelId}>
      <div className="vpp-explainer__card">
        <header className="vpp-explainer__head">
          <p className="vpp-explainer__eyebrow">{eyebrow}</p>
          <h2
            id={labelId}
            className={`vpp-explainer__title${step.id === 'cta' ? ' vpp-explainer__title--wide' : ''}`}
          >
            {title}
          </h2>
        </header>

        <div className="vpp-explainer__layout">
          <div className="vpp-explainer__diagram">
            {step.id === 'shortfall' ? (
              <ShortfallCompareBars
                generatedKwh={(personal ?? VPP_EXPLAINER_EXAMPLE).generatedKwh}
                usedKwh={(personal ?? VPP_EXPLAINER_EXAMPLE).usedKwh}
                gapKwh={(personal ?? VPP_EXPLAINER_EXAMPLE).gapKwh}
              />
            ) : null}
            {step.id === 'compare' ? (
              <CompareVisual copy={compare} mode={compareMode} onMode={setCompareMode} />
            ) : null}
            {step.id === 'trade' ? <FlowCards /> : null}
          </div>

          <div className="vpp-explainer__panel">
            {step.id === 'shortfall' || step.id === 'trade' ? (
              <>
                <h3 className="vpp-explainer__headline">{step.headline}</h3>
                <p className="vpp-explainer__body">{step.body}</p>
              </>
            ) : null}
            {step.id === 'compare' ? (
              <p className="vpp-explainer__body">{compareSide.footer}</p>
            ) : null}
            {step.id === 'cta' ? (
              <>
                <p className="vpp-explainer__body">{VPP_EXPLAINER_CTA.body}</p>
                <Button
                  variant="primary"
                  className="vpp-explainer-cta-slide__btn"
                  onClick={scrollToHowItHelps}
                >
                  {VPP_EXPLAINER_CTA.button} <span aria-hidden="true">↓</span>
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <ExplainerControls
        steps={steps}
        index={current}
        onPrev={() => go(-1)}
        onNext={() => go(1)}
        onSelect={setIndex}
      />
    </section>
  )
}

function scrollToHowItHelps() {
  document.getElementById('how-it-helps')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
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

function FlowCards() {
  return (
    <div className="vpp-flow-cards">
      {VPP_EXPLAINER_FLOW.cards.map((card) => (
        <article key={card.id} className="vpp-compare__card vpp-flow-cards__item">
          <div className="vpp-compare__row">
            <span
              className={`vpp-compare__icon${card.id === 'draw' ? '' : ' vpp-compare__icon--with'}`}
              aria-hidden="true"
            >
              {card.id === 'draw' ? (
                <BoltIcon width={18} height={18} />
              ) : (
                <PeopleIcon width={18} height={18} />
              )}
            </span>
            <div className="vpp-compare__copy">
              <p className="vpp-compare__title">{card.title}</p>
              <p className="vpp-compare__detail">{card.body}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

type CompareVisualProps = {
  copy: ReturnType<typeof buildVppExplainerCompare>
  mode: VppExplainerCompareMode
  onMode: (mode: VppExplainerCompareMode) => void
}

function CompareVisual({ copy, mode, onMode }: CompareVisualProps) {
  const { setRef, box } = useSlidingHighlight(mode, '[aria-checked="true"]')
  const side = mode === 'with' ? copy.with : copy.without
  const weeklySave =
    copy.without.costAud != null && copy.with.costAud != null
      ? copy.without.costAud - copy.with.costAud
      : null
  const yearLine =
    side.costAud != null
      ? mode === 'with' && weeklySave != null
        ? `≈ ${formatExplainerYearAud(side.costAud)}/year · ${formatExplainerExactAud(weeklySave)} less than retail`
        : `≈ ${formatExplainerYearAud(side.costAud)}/year`
      : null

  return (
    <div className="vpp-compare">
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
          <div className="vpp-compare__cost-stack">
            <p className="vpp-compare__cost-value">
              {side.costAud != null ? formatExplainerExactAud(side.costAud) : '—'}
              {side.costAud != null ? <span className="vpp-compare__per">/week</span> : null}
              <span className="visually-hidden"> Estimate</span>
            </p>
            {yearLine ? <p className="vpp-compare__cost-year">{yearLine}</p> : null}
          </div>
        </div>
      </article>
    </div>
  )
}

type ShortfallBarsProps = {
  generatedKwh: number
  usedKwh: number
  gapKwh: number
}

/**
 * ShortfallCompareBars
 * @param props - Same week figures as the shortfall copy (example or personal)
 * @returns Two horizontal bars on a shared scale plus a gap callout
 */
function ShortfallCompareBars({ generatedKwh, usedKwh, gapKwh }: ShortfallBarsProps) {
  const max = Math.max(generatedKwh, usedKwh, 1)
  const genPct = Math.round((generatedKwh / max) * 100)
  const usedPct = Math.round((usedKwh / max) * 100)
  const gapLabel = Number.isInteger(gapKwh) ? `${gapKwh}` : gapKwh.toFixed(1)

  return (
    <div className="vpp-shortfall-bars" aria-label="Panels generated versus home use">
      <div className="vpp-shortfall-bars__row">
        <div className="vpp-shortfall-bars__meta">
          <span className="vpp-shortfall-bars__label">Panels generated</span>
          <span className="vpp-shortfall-bars__value">{generatedKwh} kWh</span>
        </div>
        <div
          className="vpp-shortfall-bars__track"
          role="progressbar"
          aria-valuenow={generatedKwh}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={`Panels generated ${generatedKwh} kilowatt hours`}
        >
          <div
            className="vpp-shortfall-bars__fill vpp-shortfall-bars__fill--generated"
            style={{ width: `${genPct}%` }}
          />
        </div>
      </div>

      <div className="vpp-shortfall-bars__row">
        <div className="vpp-shortfall-bars__meta">
          <span className="vpp-shortfall-bars__label">Home used</span>
          <span className="vpp-shortfall-bars__value">{usedKwh} kWh</span>
        </div>
        <div
          className="vpp-shortfall-bars__track"
          role="progressbar"
          aria-valuenow={usedKwh}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={`Home used ${usedKwh} kilowatt hours`}
        >
          <div
            className="vpp-shortfall-bars__fill vpp-shortfall-bars__fill--used"
            style={{ width: `${usedPct}%` }}
          />
        </div>
      </div>

      <p className="vpp-shortfall-bars__gap">
        <strong>{gapLabel} kWh gap</strong>
        <span> — it has to come from somewhere</span>
      </p>
    </div>
  )
}
