import { useId, useState } from 'react'
import { TIMEFRAMES } from '../../constants/dashboard'
import { formatAud, formatKwh, type Timeframe } from '../../lib/kpis'
import {
  formatShare,
  riverForkStage,
  riverPeriod,
  type EnergyRiverModel,
} from '../../lib/energyRiver'
import { useSlidingHighlight } from '../../lib/useSlidingHighlight'

type SliceId = 'generated' | 'used' | 'vpp'

type EnergyRiverProps = {
  model: EnergyRiverModel
  place: string
  timeframe: Timeframe
  onTimeframe: (next: Timeframe) => void
}

/**
 * EnergyRiver
 * @param props.model - Scaled generation, use, leftover/gap, and estimate
 * @param props.place - Suburb and state, e.g. "Kew, VIC"
 * @param props.timeframe - Daily / weekly / fortnightly
 * @param props.onTimeframe - Switch the dashboard scale
 * @returns Dark balance card joined to an estimated-savings card
 *
 * Three bar slices match the three numbers. Surplus paints the VPP slice green
 * (discharge); deficit paints it terracotta (borrow). Hover or focus a slice
 * or legend to cross-highlight; the VPP slice also lights the savings card.
 */
export function EnergyRiver({ model, place, timeframe, onTimeframe }: EnergyRiverProps) {
  const { setRef, box } = useSlidingHighlight(timeframe, '[aria-checked="true"]')
  const [pinned, setPinned] = useState<SliceId | null>(null)
  const [hover, setHover] = useState<SliceId | null>(null)
  const active = hover ?? pinned
  const liveId = useId()
  const stage = riverForkStage(model.fork)
  const isSurplus = model.fork === 'surplus'
  const isDeficit = model.fork === 'deficit'
  const vppTone = isSurplus ? 'discharge' : 'borrow'
  const shareLabel = formatShare(model.fork === 'balanced' ? 1 : model.share)
  const headline = isSurplus
    ? 'of what this home generated could go to a VPP'
    : isDeficit
      ? 'of what this home used could come from a VPP'
      : 'of what this home used the roof already covers'

  const slices: { id: SliceId; tone: string; kwh: number; label: string }[] = [
    {
      id: 'generated',
      tone: 'generated',
      kwh: model.generatedKwh,
      label: `Energy generated ${formatKwh(model.generatedKwh)}`,
    },
    {
      id: 'used',
      tone: 'used',
      kwh: model.usedKwh,
      label: `Energy used ${formatKwh(model.usedKwh)}`,
    },
  ]
  if (model.forkKwh > 0) {
    slices.push({
      id: 'vpp',
      tone: vppTone,
      kwh: model.forkKwh,
      label: `${stage.eyebrow} ${formatKwh(model.forkKwh)} · ${formatAud(model.forkValueAud)}`,
    })
  }

  const detail = detailFor(active, model)
  const vppOn = active === 'vpp'

  return (
    <section className={`energy-story energy-story--${model.fork}`} aria-label="Household energy balance">
      <article className="energy-balance">
        <header className="energy-balance__top">
          <p className="energy-balance__place">
            {riverPeriod(timeframe)}
            {place ? ` · ${place}` : ''}
          </p>
          <div
            ref={setRef}
            className="ui-toggle ui-toggle--on-deep"
            role="radiogroup"
            aria-label="Timeframe"
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
            {TIMEFRAMES.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={timeframe === option.value}
                className={`ui-toggle__option${timeframe === option.value ? ' is-selected' : ''}`}
                onClick={() => onTimeframe(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </header>

        <h1 className="energy-balance__hero">
          <span className="energy-balance__lede">{headline}</span>
          <span className="energy-balance__share">{shareLabel}</span>
        </h1>

        <div className="energy-bar" role="group" aria-label="Energy split" aria-describedby={liveId}>
          {slices.map((slice) => (
            <button
              key={slice.id}
              type="button"
              className={`energy-bar__seg energy-bar__seg--${slice.tone}${toneClass(slice.id, active)}`}
              style={{ flexGrow: Math.max(slice.kwh, 0.4), flexBasis: 0 }}
              aria-pressed={pinned === slice.id}
              onMouseEnter={() => setHover(slice.id)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(slice.id)}
              onBlur={() => setHover(null)}
              onClick={() => setPinned((prev) => (prev === slice.id ? null : slice.id))}
            >
              <span className="visually-hidden">{slice.label}</span>
            </button>
          ))}
        </div>

        <p id={liveId} className="energy-balance__live" aria-live="polite">
          {detail ?? '\u00a0'}
        </p>

        <ul className="energy-legend">
          <LegendItem
            id="generated"
            tone="generated"
            label="Energy generated"
            value={formatKwh(model.generatedKwh)}
            hint={model.solarIsPotential ? 'modelled from the roof' : 'from the roof'}
            active={active}
            pinned={pinned}
            onHover={setHover}
            onPin={setPinned}
          />
          <LegendItem
            id="used"
            tone="used"
            label="Energy used"
            value={formatKwh(model.usedKwh)}
            hint="by the house"
            active={active}
            pinned={pinned}
            onHover={setHover}
            onPin={setPinned}
          />
          <LegendItem
            id="vpp"
            tone={vppTone}
            label={stage.eyebrow}
            value={
              model.forkKwh > 0
                ? `${formatKwh(model.forkKwh)} · ${formatAud(model.forkValueAud)}`
                : formatKwh(0)
            }
            hint={stage.hint}
            active={active}
            pinned={pinned}
            onHover={setHover}
            onPin={setPinned}
          />
        </ul>
      </article>

      <div className={`energy-join${vppOn ? ' is-lit' : ''}`} aria-hidden="true">
        <span className="energy-join__from" />
        <span className="energy-join__knob" />
        <span className="energy-join__to" />
      </div>

      <article className={`energy-savings${vppOn ? ' is-lit' : ''}`}>
        <header className="energy-savings__head">
          <p className="energy-savings__eyebrow">Possible money saved</p>
          <span className="kpi-badge kpi-badge--estimate">Estimate</span>
        </header>
        <p className="energy-savings__value">{formatAud(model.forkValueAud)}</p>
        <p className="energy-savings__hint">
          {isSurplus
            ? 'If that leftover went out through a VPP instead of a standard feed-in.'
            : isDeficit
              ? 'If a VPP covered the gap instead of buying that much from the grid.'
              : 'The roof already covers use. A VPP still pays for grid events.'}
        </p>
      </article>
    </section>
  )
}

type LegendItemProps = {
  id: SliceId
  tone: string
  label: string
  value: string
  hint: string
  active: SliceId | null
  pinned: SliceId | null
  onHover: (id: SliceId | null) => void
  onPin: (id: SliceId | null) => void
}

function LegendItem({ id, tone, label, value, hint, active, pinned, onHover, onPin }: LegendItemProps) {
  const on = active === id
  return (
    <li>
      <button
        type="button"
        className={`energy-legend__item energy-legend__item--${tone}${toneClass(id, active)}`}
        aria-pressed={pinned === id}
        onMouseEnter={() => onHover(id)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(id)}
        onBlur={() => onHover(null)}
        onClick={() => onPin(pinned === id ? null : id)}
      >
        <span className="energy-legend__swatch" aria-hidden="true" />
        <span className="energy-legend__copy">
          <span className="energy-legend__label">{label}</span>
          <span className="energy-legend__value">{value}</span>
          <span className="energy-legend__hint">{hint}</span>
        </span>
      </button>
    </li>
  )
}

/**
 * toneClass
 * @param id - Slice this control represents
 * @param active - Currently highlighted slice, or none
 * @returns Hover/focus modifiers for bar and legend
 */
function toneClass(id: SliceId, active: SliceId | null): string {
  if (!active) return ''
  return active === id ? ' is-on' : ' is-dim'
}

/**
 * detailFor
 * @param active - Highlighted slice, or none
 * @param model - Current balance figures
 * @returns One-line readout under the bar, or null
 */
function detailFor(active: SliceId | null, model: EnergyRiverModel): string | null {
  if (!active) return null
  if (active === 'generated') {
    return model.solarIsPotential
      ? `Modelled roof output ${formatKwh(model.generatedKwh)}`
      : `Roof output ${formatKwh(model.generatedKwh)}`
  }
  if (active === 'used') return `House use ${formatKwh(model.usedKwh)}`
  const stage = riverForkStage(model.fork)
  if (model.forkKwh <= 0) return 'Generation and use already match'
  const base = model.fork === 'surplus' ? model.generatedKwh : model.usedKwh
  const baseLabel = model.fork === 'surplus' ? 'energy generated' : 'energy used'
  return `${stage.eyebrow} ${formatKwh(model.forkKwh)} ÷ ${baseLabel} ${formatKwh(base)}`
}
