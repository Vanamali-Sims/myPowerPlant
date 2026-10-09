import { useId, useState } from 'react'
import {
  DASHBOARD_PLANS_CAPTION,
  DASHBOARD_PLANS_CTA,
  DASHBOARD_POTENTIAL_SAVINGS_LABEL,
  TIMEFRAMES,
} from '../../constants/dashboard'
import { formatAud, formatKwh, type Timeframe } from '../../lib/kpis'
import { riverForkStage, riverPeriod, type EnergyRiverModel } from '../../lib/energyRiver'
import { useSlidingHighlight } from '../../lib/useSlidingHighlight'
import { EnergyBreakdown } from '../energy/EnergyBreakdown'
import { InfoIcon } from '../ui/icons'

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
 * @returns One dark balance card: animated breakdown, savings CTA
 */
export function EnergyRiver({
  model,
  place,
  timeframe,
  onTimeframe,
  onSeePlans,
}: EnergyRiverProps) {
  const { setRef, box } = useSlidingHighlight(timeframe, '[aria-checked="true"]')
  const [tipOpen, setTipOpen] = useState(false)
  const tipId = useId()
  const stage = riverForkStage(model.fork)
  const isSurplus = model.fork === 'surplus'
  const isDeficit = model.fork === 'deficit'
  const headline = isSurplus
    ? 'of what this home generated could go to a VPP'
    : isDeficit
      ? 'of what this home used could come from a VPP'
      : 'of what this home used the roof already covers'
  const tip = savingsTip(model)

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

        <EnergyBreakdown
          model={model}
          dischargeLabel={stage.eyebrow}
          dischargeHint={stage.hint}
          headlineText={headline}
        />

        <div className="energy-balance__foot">
          <div className={`energy-savings-wrap energy-savings-wrap--foot${tipOpen ? ' is-open' : ''}`}>
            {tipOpen ? (
              <p id={tipId} className="energy-savings-tip" role="tooltip">
                {tip}
              </p>
            ) : null}
            <button
              type="button"
              className="energy-savings-foot"
              aria-describedby={tipOpen ? tipId : undefined}
              onMouseEnter={() => setTipOpen(true)}
              onMouseLeave={() => setTipOpen(false)}
              onFocus={() => setTipOpen(true)}
              onBlur={() => setTipOpen(false)}
            >
              <span className="energy-legend__copy">
                <span className="energy-legend__label-row">
                  <span className="energy-legend__swatch energy-legend__swatch--savings" aria-hidden="true" />
                  <span className="energy-legend__label">{DASHBOARD_POTENTIAL_SAVINGS_LABEL}</span>
                  <span className="energy-savings__info" aria-hidden="true">
                    <InfoIcon width={14} height={14} />
                  </span>
                </span>
                <span className="energy-legend__value energy-legend__value--accent">
                  {formatAud(model.annualValueAud)}
                </span>
                <span className="energy-legend__hint">
                  per year
                  <span className="kpi-badge kpi-badge--estimate kpi-badge--on-deep">Estimate</span>
                </span>
              </span>
            </button>
          </div>
          <div className="energy-plans-row">
            <button type="button" className="energy-plans-cta" onClick={onSeePlans}>
              {DASHBOARD_PLANS_CTA}
            </button>
            <p className="energy-plans-caption">{DASHBOARD_PLANS_CAPTION}</p>
          </div>
        </div>
      </article>
    </section>
  )
}

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
