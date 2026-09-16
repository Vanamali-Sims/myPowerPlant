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
import { InfoIcon } from '../ui/icons'

type SliceId = 'generated' | 'used' | 'vpp'

type EnergyRiverProps = {
  model: EnergyRiverModel
  place: string
  timeframe: Timeframe
  onTimeframe: (next: Timeframe) => void
  onSeePlans: () => void
}

/**
 * EnergyRiver
 * @param props.model - Scaled generation, use, leftover/gap, and annual estimate
 * @param props.place - Suburb and state, e.g. "Kew, VIC"
 * @param props.timeframe - Daily / weekly / fortnightly
 * @param props.onTimeframe - Switch the dashboard scale
 * @param props.onSeePlans - Jump to VPP recommendations under this card
 * @returns One dark balance card: share bar, four stats, CTA
 *
 * Savings explanation sits in a hover/focus tooltip so the default view stays
 * numbers-first. The share bar mirrors the headline percent (not a kWh split).
 */
export function EnergyRiver({
  model,
  place,
  timeframe,
  onTimeframe,
  onSeePlans,
}: EnergyRiverProps) {
  const { setRef, box } = useSlidingHighlight(timeframe, '[aria-checked="true"]')
  const [pinned, setPinned] = useState<SliceId | null>(null)
  const [hover, setHover] = useState<SliceId | null>(null)
  const [tipOpen, setTipOpen] = useState(false)
  const active = hover ?? pinned
  const liveId = useId()
  const tipId = useId()
  const stage = riverForkStage(model.fork)
  const isSurplus = model.fork === 'surplus'
  const isDeficit = model.fork === 'deficit'
  const vppTone = isSurplus ? 'discharge' : 'borrow'
  const shareFraction = model.fork === 'balanced' ? 1 : model.share
  const sharePercent = Math.round(shareFraction * 100)
  const shareLabel = formatShare(shareFraction)
  const headline = isSurplus
    ? 'of what this home generated could go to a VPP'
    : isDeficit
      ? 'of what this home used could come from a VPP'
      : 'of what this home used the roof already covers'
  const tip = savingsTip(model)

  const detail = detailFor(active, model)

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

        <div
          className="energy-bar"
          role="progressbar"
          aria-valuenow={sharePercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={headline}
          aria-describedby={liveId}
        >
          <div className="energy-bar__track">
            <div className="energy-bar__fill" style={{ width: `${sharePercent}%` }} />
            <span
              className="energy-bar__handle"
              style={{ left: `${sharePercent}%` }}
              aria-hidden="true"
            />
          </div>
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
            value={formatKwh(model.forkKwh)}
            hint={stage.hint}
            active={active}
            pinned={pinned}
            onHover={setHover}
            onPin={setPinned}
          />
          <li className="energy-legend__savings">
            <div className={`energy-savings-wrap${tipOpen ? ' is-open' : ''}`}>
              {tipOpen ? (
                <p id={tipId} className="energy-savings-tip" role="tooltip">
                  {tip}
                </p>
              ) : null}
              <button
                type="button"
                className="energy-station energy-legend__item energy-legend__item--savings"
                aria-describedby={tipOpen ? tipId : undefined}
                onMouseEnter={() => setTipOpen(true)}
                onMouseLeave={() => setTipOpen(false)}
                onFocus={() => setTipOpen(true)}
                onBlur={() => setTipOpen(false)}
              >
                <span className="energy-legend__copy">
                  <span className="energy-legend__label-row">
                    <span className="energy-legend__swatch" aria-hidden="true" />
                    <span className="energy-legend__label">Money saved · annual</span>
                    <span className="energy-savings__info" aria-hidden="true">
                      <InfoIcon width={14} height={14} />
                    </span>
                  </span>
                  <span className="energy-legend__value energy-legend__value--accent">
                    {formatAud(model.annualValueAud)}
                  </span>
                  <span className="energy-legend__hint">
                    per year
                    <span className="kpi-badge kpi-badge--estimate kpi-badge--on-deep">
                      Estimate
                    </span>
                  </span>
                </span>
              </button>
            </div>
          </li>
        </ul>

        <div className="energy-balance__foot">
          <button type="button" className="energy-plans-cta" onClick={onSeePlans}>
            See the plans
          </button>
        </div>
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
  return (
    <li>
      <button
        type="button"
        className={`energy-station energy-legend__item energy-legend__item--${tone}${toneClass(id, active)}`}
        aria-pressed={pinned === id}
        onMouseEnter={() => onHover(id)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(id)}
        onBlur={() => onHover(null)}
        onClick={() => onPin(pinned === id ? null : id)}
      >
        <span className="energy-legend__copy">
          <span className="energy-legend__label-row">
            <span className="energy-legend__swatch" aria-hidden="true" />
            <span className="energy-legend__label">{label}</span>
          </span>
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
 * @returns Hover/focus modifiers for legend
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

/**
 * savingsTip
 * @param model - Current balance figures
 * @returns Hover tooltip copy for the annual savings tile
 */
function savingsTip(model: EnergyRiverModel): string {
  const period =
    model.timeframe === 'daily' ? 'a day' : model.timeframe === 'fortnightly' ? 'a fortnight' : 'a week'
  if (model.fork === 'surplus' && model.forkKwh > 0) {
    return `If that leftover ${formatKwh(model.forkKwh)} ${period} went out through a VPP instead of a standard feed-in.`
  }
  if (model.fork === 'deficit' && model.forkKwh > 0) {
    return `If that gap of ${formatKwh(model.forkKwh)} ${period} came from a VPP instead of buying from the grid.`
  }
  return 'The roof already covers use. A VPP still pays for grid events.'
}
