/**
 * Day-part bar chart comparing household use with solar generation.
 */
import type { BalancePeriod, Timeframe } from '../../lib/kpis'
import { scaleKwh } from '../../lib/kpis'

type Props = {
  periods: BalancePeriod[]
  timeframe: Timeframe
}

/**
 * EnergyBalanceChart
 * @param props.periods - Morning / afternoon / evening / night balances
 * @param props.timeframe - Scale applied to kWh before drawing
 * @returns JSX.Element
 *
 * Bar height is relative to the largest period so an empty day still renders.
 * The max fallback of 1 avoids a divide-by-zero when every value is zero.
 */
export function EnergyBalanceChart({ periods, timeframe }: Props) {
  const scaled = periods.map((period) => ({
    ...period,
    consumptionKwh: scaleKwh(period.consumptionKwh, timeframe),
    generationKwh: scaleKwh(period.generationKwh, timeframe),
  }))
  const max = Math.max(
    ...scaled.flatMap((period) => [period.consumptionKwh, period.generationKwh]),
    1,
  )

  return (
    <figure className="balance-chart">
      <div className="balance-chart__legend">
        <span>
          <i className="balance-chart__swatch balance-chart__swatch--use" />
          Household use
        </span>
        <span>
          <i className="balance-chart__swatch balance-chart__swatch--solar" />
          Solar
        </span>
      </div>
      <div className="balance-chart__plot" role="img" aria-label="Solar generation compared with household use across the day">
        {scaled.map((period) => (
          <div key={period.id} className="balance-chart__col">
            <div className="balance-chart__bars">
              <span
                className="balance-chart__bar balance-chart__bar--use"
                style={{ height: `${(period.consumptionKwh / max) * 100}%` }}
                title={`${period.label} use ${period.consumptionKwh.toFixed(1)} kWh`}
              />
              <span
                className="balance-chart__bar balance-chart__bar--solar"
                style={{ height: `${(period.generationKwh / max) * 100}%` }}
                title={`${period.label} solar ${period.generationKwh.toFixed(1)} kWh`}
              />
            </div>
            <figcaption>
              <strong>{period.label}</strong>
              <span>{period.hint}</span>
            </figcaption>
          </div>
        ))}
      </div>
    </figure>
  )
}
