import { TIMEFRAMES } from '../../constants/dashboard'
import type { Timeframe } from '../../lib/kpis'
import { riverForkStage, riverPeriod, type EnergyRiverModel } from '../../lib/energyRiver'
import { useSlidingHighlight } from '../../lib/useSlidingHighlight'
import { EnergyBreakdown } from '../energy/EnergyBreakdown'
import { EnergyPath } from './EnergyPath'

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
 * @returns One dark balance card: animated breakdown, then the steps, plans button and yearly saving
 */
export function EnergyRiver({
  model,
  place,
  timeframe,
  onTimeframe,
  onSeePlans,
}: EnergyRiverProps) {
  const { setRef, box } = useSlidingHighlight(timeframe, '[aria-checked="true"]')
  const stage = riverForkStage(model.fork)
  const isSurplus = model.fork === 'surplus'
  const isDeficit = model.fork === 'deficit'
  // Two lines, broken as in the design, so the label sits inside the ring's hole.
  const headline = isSurplus
    ? 'of what this home\ngenerated could go to a VPP'
    : isDeficit
      ? 'of what this home\nused could come from a VPP'
      : 'of what this home used\nthe roof already covers'

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
          footer={<EnergyPath model={model} onSeePlans={onSeePlans} />}
        />
      </article>
    </section>
  )
}
