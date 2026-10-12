import type { CSSProperties } from 'react'
import { formatKwh } from '../../lib/kpis'
import { formatShare } from '../../lib/energyRiver'
import { computeEnergyArcs } from './energyMath'

export type EnergyFocus = 'generated' | 'used' | 'discharge' | null

type Props = {
  generated: number
  used: number
  discharge: number
  focus: EnergyFocus
  defaultPctLabel: string
  defaultSubLabel: string
  entrance: boolean
}

const CX = 150
const CY = 150
const R_OUTER = 140
const R_INNER = 107

export function EnergyRing({
  generated,
  used,
  discharge,
  focus,
  defaultPctLabel,
  defaultSubLabel,
  entrance,
}: Props) {
  const arcs = computeEnergyArcs(generated, used, discharge)
  const hasGen = generated > 0 && Number.isFinite(generated)

  const ariaLabel = hasGen
    ? `${formatKwh(generated)} generated: ${formatKwh(used)} used by the house, ${formatKwh(discharge)} could go to a VPP.`
    : 'No generation data for this period.'

  const centre = centreContent(focus, generated, used, discharge, arcs, defaultPctLabel, defaultSubLabel)

  const dimClass =
    focus === 'used'
      ? ' is-dim-discharge is-dim-generated'
      : focus === 'discharge'
        ? ' is-dim-used is-dim-generated'
        : ''

  const style = {
    '--used-len': String(arcs.usedLen),
    '--discharge-len': String(arcs.dischargeLen),
  } as CSSProperties

  return (
    <div className={`energy-ring${focus ? ` is-focus-${focus}` : ''}${dimClass}`} style={style}>
      <svg
        className="energy-ring__svg"
        viewBox="0 0 300 300"
        role="img"
        aria-label={ariaLabel}
      >
        <defs>
          <filter id="energy-discharge-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>
        <circle
          className="energy-ring__track energy-ring__outer-track"
          cx={CX}
          cy={CY}
          r={R_OUTER}
          pathLength={100}
        />
        {hasGen ? (
          <circle
            className="energy-ring__outer-fill"
            cx={CX}
            cy={CY}
            r={R_OUTER}
            pathLength={100}
            strokeDasharray="100 100"
            strokeDashoffset={entrance ? undefined : 0}
            transform={`rotate(-90 ${CX} ${CY})`}
          />
        ) : null}

        <circle
          className="energy-ring__track energy-ring__inner-track"
          cx={CX}
          cy={CY}
          r={R_INNER}
          pathLength={100}
        />

        {hasGen && arcs.usedLen > 0 ? (
          <circle
            className="energy-ring__used"
            cx={CX}
            cy={CY}
            r={R_INNER}
            pathLength={100}
            strokeDasharray={`${arcs.usedLen} 100`}
            strokeDashoffset={entrance ? undefined : 0}
            transform={`rotate(${arcs.usedRotate} ${CX} ${CY})`}
          />
        ) : null}

        {hasGen && arcs.dischargeLen > 0 ? (
          <g className="energy-ring__discharge-wrap energy-breakdown__continuous">
            <circle
              className="energy-ring__discharge-glow"
              cx={CX}
              cy={CY}
              r={R_INNER}
              pathLength={100}
              strokeDasharray={`${arcs.dischargeLen} 100`}
              strokeDashoffset={0}
              filter="url(#energy-discharge-blur)"
              transform={`rotate(${arcs.dischargeRotate} ${CX} ${CY})`}
            />
            <circle
              className="energy-ring__discharge"
              cx={CX}
              cy={CY}
              r={R_INNER}
              pathLength={100}
              strokeDasharray={`${arcs.dischargeLen} 100`}
              strokeDashoffset={entrance ? undefined : 0}
              transform={`rotate(${arcs.dischargeRotate} ${CX} ${CY})`}
            />
          </g>
        ) : null}
      </svg>

      <div className="energy-ring__centre" aria-hidden="true">
        <p className={`energy-ring__pct${centre.hover ? ' energy-ring__pct--hover' : ''}`}>{centre.primary}</p>
        <p className="energy-ring__sub">{centre.secondary}</p>
      </div>
    </div>
  )
}

function centreContent(
  focus: EnergyFocus,
  generated: number,
  used: number,
  discharge: number,
  arcs: ReturnType<typeof computeEnergyArcs>,
  defaultPct: string,
  defaultSub: string,
): { primary: string; secondary: string; hover: boolean } {
  if (!focus) {
    return { primary: defaultPct, secondary: defaultSub, hover: false }
  }
  if (focus === 'generated') {
    return {
      primary: formatKwh(generated),
      secondary: 'generated from the roof',
      hover: true,
    }
  }
  if (focus === 'used') {
    return {
      primary: formatKwh(used),
      secondary: `used by the house, ${formatShare(arcs.usedShareOfGen)} of it`,
      hover: true,
    }
  }
  return {
    primary: formatKwh(discharge),
    secondary: `could go to a VPP, ${formatShare(arcs.dischargeShare)} of it`,
    hover: true,
  }
}
