/**
 * Poster infographic: generated → used → VPP borrow or discharge.
 *
 * One continuous river tapers with kWh. Surplus discharges in eucalypt;
 * a shortfall borrows in terracotta. The third stage label switches with
 * the sign. Numbers stay in HTML so colour is never the only signal.
 */
import { useId, type ComponentType, type SVGProps } from 'react'
import { KIND_LABELS, RIVER_DISCLAIMER } from '../../constants'
import {
  VIEW_H,
  VIEW_W,
  flowingRiverCenterline,
  flowingRiverPath,
  riverBody,
  riverCarbonNote,
  riverForkStage,
  riverThickness,
  type EnergyRiverModel,
  type RiverFork,
} from '../../lib/energyRiver'
import { formatAud, formatKwh } from '../../lib/kpis'
import { ClusterIcon, HomeIcon, SunIcon } from '../ui/icons'

type Props = {
  model: EnergyRiverModel
}

type IconType = ComponentType<SVGProps<SVGSVGElement>>

type Stage = {
  id: string
  icon: IconType
  eyebrow: string
  value: string
  hint: string
  money?: string
  badge?: boolean
  tone?: RiverFork
}

/**
 * EnergyRiver
 * @param props.model - Scaled generation, use, leftover or gap, and dollar estimate
 * @returns JSX.Element
 *
 * Three stages. A single SVG river runs behind the icons so the stream is
 * continuous. Narrow viewports stack into a waterfall.
 */
export function EnergyRiver({ model }: Props) {
  const summary = riverBody(model)
  const carbon = riverCarbonNote(model)
  const fork = riverForkStage(model.fork)
  const forkKwh = model.fork === 'balanced' ? 0 : model.forkKwh
  const stages: Stage[] = [
    {
      id: 'generated',
      icon: SunIcon,
      eyebrow: model.solarIsPotential ? 'Energy potential' : 'Energy generated',
      value: formatKwh(model.generatedKwh),
      hint: model.solarIsPotential ? 'If this roof had solar' : 'From the roof',
    },
    {
      id: 'used',
      icon: HomeIcon,
      eyebrow: 'Energy used',
      value: formatKwh(model.usedKwh),
      hint: 'By the house',
    },
    {
      id: 'vpp',
      icon: ClusterIcon,
      eyebrow: fork.eyebrow,
      value: formatKwh(forkKwh),
      money: model.fork === 'balanced' ? undefined : formatAud(model.forkValueAud),
      hint: fork.hint,
      badge: true,
      tone: model.fork,
    },
  ]
  const thicknesses: [number, number, number] = [
    riverThickness(model.generatedKwh, model.maxFlowKwh),
    riverThickness(model.usedKwh, model.maxFlowKwh),
    riverThickness(Math.max(forkKwh, 0), model.maxFlowKwh),
  ]

  return (
    <figure className={`energy-river energy-river--${model.fork}`}>
      <div className="energy-river__track" role="img" aria-label={summary}>
        <RiverFlow thicknesses={thicknesses} fork={model.fork} />
        {stages.map((stage) => (
          <RiverNode key={stage.id} {...stage} />
        ))}
      </div>
      <figcaption className="energy-river__caption">
        <p className="energy-river__verdict">{summary}</p>
        {carbon ? <p className="energy-river__carbon">{carbon}</p> : null}
        <p className="energy-river__note">{RIVER_DISCLAIMER}</p>
      </figcaption>
    </figure>
  )
}

function RiverNode({
  icon: Icon,
  eyebrow,
  value,
  hint,
  money,
  badge = false,
  tone,
}: Stage) {
  return (
    <div className={`energy-river__node${tone ? ` energy-river__node--${tone}` : ''}`}>
      <span className="energy-river__icon">
        <Icon width={22} height={22} />
      </span>
      <p className="eyebrow">{eyebrow}</p>
      <p className="energy-river__value">
        <span key={value} className="energy-river__figure">
          {value}
        </span>
        {money ? (
          <span key={money} className="energy-river__money">
            {money}
          </span>
        ) : null}
        {badge ? <span className="kpi-badge kpi-badge--estimate">{KIND_LABELS.estimate}</span> : null}
      </p>
      <p className="energy-river__hint">{hint}</p>
    </div>
  )
}

function RiverFlow({
  thicknesses,
  fork,
}: {
  thicknesses: [number, number, number]
  fork: RiverFork
}) {
  const id = useId().replace(/:/g, '')
  const gidH = `${id}-h`
  const gidV = `${id}-v`

  return (
    <>
      <svg
        className="energy-river__flow energy-river__flow--h"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gidH} x1="0" y1="0" x2="1" y2="0">
            <FlowStops fork={fork} />
          </linearGradient>
        </defs>
        <path
          className="energy-river__band"
          d={flowingRiverPath(thicknesses, 'horizontal')}
          fill={`url(#${gidH})`}
        />
        <path
          className={`energy-river__current${fork === 'deficit' ? ' is-in' : ''}`}
          d={flowingRiverCenterline(thicknesses, 'horizontal')}
        />
      </svg>
      <svg
        className="energy-river__flow energy-river__flow--v"
        viewBox={`0 0 ${VIEW_H} ${VIEW_W}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gidV} x1="0" y1="0" x2="0" y2="1">
            <FlowStops fork={fork} />
          </linearGradient>
        </defs>
        <path
          className="energy-river__band"
          d={flowingRiverPath(thicknesses, 'vertical')}
          fill={`url(#${gidV})`}
        />
        <path
          className={`energy-river__current${fork === 'deficit' ? ' is-in' : ''}`}
          d={flowingRiverCenterline(thicknesses, 'vertical')}
        />
      </svg>
    </>
  )
}

function FlowStops({ fork }: { fork: RiverFork }) {
  if (fork === 'deficit') {
    return (
      <>
        <stop offset="0%" stopColor="var(--euc-400)" />
        <stop offset="48%" stopColor="var(--euc-700)" />
        <stop offset="62%" stopColor="var(--terra-400)" />
        <stop offset="100%" stopColor="var(--terra-800)" />
      </>
    )
  }
  if (fork === 'balanced') {
    return (
      <>
        <stop offset="0%" stopColor="var(--euc-200)" />
        <stop offset="100%" stopColor="var(--euc-400)" />
      </>
    )
  }
  return (
    <>
      <stop offset="0%" stopColor="var(--euc-400)" />
      <stop offset="100%" stopColor="var(--euc-800)" />
    </>
  )
}
