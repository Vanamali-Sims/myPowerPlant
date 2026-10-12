/**
 * The band under the energy breakdown: three steps to start saving, the
 * plans button, and the yearly saving. It spans the breakdown grid and lines
 * its saving up under the VPP card, joined to it by an animated line.
 */
import { useId, useState } from 'react'
import { DASHBOARD_PATH, DASHBOARD_PLANS_CTA, DASHBOARD_POTENTIAL_SAVINGS_LABEL } from '../../constants/dashboard'
import type { EnergyRiverModel } from '../../lib/energyRiver'
import { formatAud, formatKwh } from '../../lib/kpis'
import { InfoIcon } from '../ui/icons'

type Props = {
  model: EnergyRiverModel
  onSeePlans: () => void
}

/**
 * EnergyPath
 * @param props.model - Balance figures; the VPP amount and yearly saving come from here
 * @param props.onSeePlans - Open the matching VPP plans
 * @returns JSX.Element
 */
export function EnergyPath({ model, onSeePlans }: Props) {
  const [tipOpen, setTipOpen] = useState(false)
  const tipId = useId()
  const matched =
    model.fork !== 'balanced' && model.forkKwh > 0
      ? DASHBOARD_PATH.steps[0].hint(formatKwh(model.forkKwh))
      : DASHBOARD_PATH.matchedToHome

  return (
    <section className={`energy-path energy-path--${model.fork}`} aria-label={DASHBOARD_PATH.eyebrow}>
      <div className="energy-path__start">
        <div className="energy-path__steps-wrap">
          <p className="energy-path__eyebrow">{DASHBOARD_PATH.eyebrow}</p>
          <ol className="energy-path__steps">
            {DASHBOARD_PATH.steps.map((step, index) => (
              <li key={step.title} className={`energy-path__step${index === 0 ? ' is-current' : ''}`}>
                <span className="energy-path__num" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="energy-path__title">{step.title}</span>
                <span className="energy-path__hint">{index === 0 ? matched : step.hint('')}</span>
              </li>
            ))}
          </ol>
        </div>
        <span className="energy-path__cta-wrap">
          <button type="button" className="energy-path__cta" onClick={onSeePlans}>
            {DASHBOARD_PLANS_CTA}
            <svg className="energy-path__arrow" aria-hidden="true" width="18" height="18" viewBox="0 0 18 18">
              <path
                d="M3 9 H14 M9.5 4.5 L14 9 L9.5 13.5"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </span>
      </div>

      <div className="energy-path__money">
        <div className="energy-path__link" aria-hidden="true">
          <span className="energy-path__link-line" />
          <span className="energy-path__link-flow" />
          <span className="energy-path__via">{DASHBOARD_PATH.via[model.fork]}</span>
        </div>
        <div className={`energy-savings-wrap energy-path__savings${tipOpen ? ' is-open' : ''}`}>
          {tipOpen ? (
            <p id={tipId} className="energy-savings-tip" role="tooltip">
              {savingsTip(model)}
            </p>
          ) : null}
          <button
            type="button"
            className="energy-path__savings-button"
            aria-describedby={tipOpen ? tipId : undefined}
            onMouseEnter={() => setTipOpen(true)}
            onMouseLeave={() => setTipOpen(false)}
            onFocus={() => setTipOpen(true)}
            onBlur={() => setTipOpen(false)}
          >
            <span className="energy-path__savings-label">
              <span className="energy-path__swatch" aria-hidden="true" />
              {DASHBOARD_POTENTIAL_SAVINGS_LABEL}
              <InfoIcon width={18} height={18} />
            </span>
            <span className="energy-path__savings-value">{formatAud(model.annualValueAud)}</span>
            <span className="energy-path__savings-hint">
              per year
              <span className="energy-path__badge">Estimate</span>
            </span>
          </button>
        </div>
      </div>
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
