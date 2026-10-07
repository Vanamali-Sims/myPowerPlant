/**
 * Energy paths on the dark stage. Widths and labels come from the KPI week
 * divided by seven. The battery ring is the reserve the user set, not a
 * simulated charge. Dots are drawn by React so a parent redraw cannot wipe them.
 */
import { useEffect, useId, useLayoutEffect, useRef } from 'react'
import { formatKwh } from '../../lib/kpis'
import { flowDotCount, flowStroke } from '../../lib/whatif/flowScale'

export type FlowFigures = {
  solarKwh: number
  homeKwh: number
  toVppKwh: number
  boughtKwh: number
  selfKwh: number
  toBatteryKwh: number
  fromBatteryKwh: number
  reserve: number
}

type Props = {
  figures: FlowFigures
}

type LaneKey = 'sh' | 'sb' | 'bh' | 'sg' | 'gh'

const LANES: Array<{ key: LaneKey; field: keyof FlowFigures; color: string; d: string }> = [
  { key: 'sh', field: 'selfKwh', color: '#f0a36b', d: 'M210,80 C210,150 280,176 326,176' },
  { key: 'sb', field: 'toBatteryKwh', color: '#7fd1a8', d: 'M210,80 L210,268' },
  { key: 'bh', field: 'fromBatteryKwh', color: '#7fd1a8', d: 'M210,268 C210,202 280,176 326,176' },
  { key: 'sg', field: 'toVppKwh', color: '#f0a36b', d: 'M210,80 C210,150 140,176 94,176' },
  { key: 'gh', field: 'boughtKwh', color: '#a9bbb2', d: 'M94,176 L326,176' },
]

type DotSpec = { id: string; lane: LaneKey; color: string; offset: number }

function dotsFor(figures: FlowFigures): DotSpec[] {
  const specs: DotSpec[] = []
  for (const lane of LANES) {
    const amount = figures[lane.field]
    const count = typeof amount === 'number' ? flowDotCount(amount) : 0
    for (let index = 0; index < count; index += 1) {
      specs.push({
        id: `${lane.key}-${index}`,
        lane: lane.key,
        color: lane.color,
        offset: count === 1 ? 0 : index / count,
      })
    }
  }
  return specs
}

/**
 * WhatIfFlow
 */
export function WhatIfFlow({ figures }: Props) {
  const glowId = useId().replace(/:/g, '')
  const pathRefs = useRef<Partial<Record<LaneKey, SVGPathElement>>>({})
  const dotRefs = useRef<Record<string, SVGCircleElement | null>>({})
  const clock = useRef(0)
  const dots = dotsFor(figures)

  const place = (time: number) => {
    for (const dot of dots) {
      const node = dotRefs.current[dot.id]
      const path = pathRefs.current[dot.lane]
      if (!node || !path) continue
      const length = path.getTotalLength()
      if (length <= 0) continue
      const t = (time / 2600 + dot.offset) % 1
      const point = path.getPointAtLength(length * t)
      node.setAttribute('cx', String(point.x))
      node.setAttribute('cy', String(point.y))
      node.setAttribute('opacity', String(Math.min(1, Math.sin(t * Math.PI) * 1.6)))
    }
  }
  const placeRef = useRef<(time: number) => void>(() => {})

  useLayoutEffect(() => {
    placeRef.current = place
    placeRef.current(clock.current)
  })

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      placeRef.current(0)
      return
    }
    let frame = 0
    const loop = (time: number) => {
      clock.current = time
      placeRef.current(time)
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [])

  const ring = 169.6 * (1 - Math.min(1, Math.max(0, figures.reserve)))

  return (
    <div className="whatif-flow">
      <svg className="whatif-flow__svg" viewBox="0 0 420 340" aria-hidden="true">
        <defs>
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g>
          {LANES.map((lane) => {
            const amount = figures[lane.field]
            const quiet = typeof amount !== 'number' || amount < 0.05
            return (
              <path
                key={lane.key}
                ref={(node) => {
                  pathRefs.current[lane.key] = node ?? undefined
                }}
                className="whatif-flow__track"
                d={lane.d}
                style={{
                  strokeWidth: typeof amount === 'number' ? flowStroke(amount) : 1.6,
                  stroke: quiet ? 'rgba(244,241,232,0.16)' : lane.color,
                  strokeOpacity: quiet ? 1 : 0.55,
                }}
              />
            )
          })}
        </g>
        <g filter={`url(#${glowId})`}>
          {dots.map((dot) => (
            <circle
              key={dot.id}
              ref={(node) => {
                dotRefs.current[dot.id] = node
              }}
              r="3.2"
              fill={dot.color}
            />
          ))}
        </g>
        <g transform="translate(210,52)">
          <circle className="whatif-flow__node" r="27" />
          <g className="whatif-flow__icon">
            <circle r="5.5" />
            <path d="M0,-11V-9M0,9V11M-11,0H-9M9,0H11M-7.8,-7.8L-6.4,-6.4M6.4,6.4L7.8,7.8M-7.8,7.8L-6.4,6.4M6.4,-6.4L7.8,-7.8" />
          </g>
        </g>
        <text className="whatif-flow__lbl" x="246" y="46">
          Solar
        </text>
        <text className="whatif-flow__val" x="246" y="64">
          {formatKwh(figures.solarKwh)}
        </text>
        <g transform="translate(354,176)">
          <circle className="whatif-flow__node" r="27" />
          <path className="whatif-flow__icon" d="M-9,1L0,-8L9,1M-6,-1V9H6V-1" />
        </g>
        <text className="whatif-flow__lbl" x="354" y="222" textAnchor="middle">
          Home
        </text>
        <text className="whatif-flow__val" x="354" y="240" textAnchor="middle">
          {formatKwh(figures.homeKwh)}
        </text>
        <g transform="translate(66,176)">
          <circle className="whatif-flow__node" r="27" />
          <path className="whatif-flow__icon" d="M-7,10L0,-10L7,10M-4.5,2H4.5M-2.6,-4H2.6" />
        </g>
        <text className="whatif-flow__lbl" x="66" y="222" textAnchor="middle">
          To VPP
        </text>
        <text className="whatif-flow__val" x="66" y="240" textAnchor="middle">
          {formatKwh(figures.toVppKwh)}
        </text>
        <text className="whatif-flow__sub" x="66" y="258" textAnchor="middle">
          bought {formatKwh(figures.boughtKwh)}
        </text>
        <g transform="translate(210,296)">
          <circle className="whatif-flow__node" r="27" />
          <circle className="whatif-flow__ring-track" r="27" />
          <circle
            className="whatif-flow__ring"
            r="27"
            transform="rotate(-90)"
            strokeDasharray="169.6"
            strokeDashoffset={ring}
          />
          <g className="whatif-flow__icon">
            <rect x="-5.5" y="-8" width="11" height="17" rx="2" />
            <path d="M-2.5,-10H2.5" />
          </g>
        </g>
        <text className="whatif-flow__lbl" x="246" y="290">
          Battery
        </text>
        <text className="whatif-flow__val" x="246" y="308">
          kept {Math.round(figures.reserve * 100)}%
        </text>
      </svg>
      <div className="whatif-flow__legend">
        <span>
          <i className="whatif-flow__dot whatif-flow__dot--solar" />
          Solar
        </span>
        <span>
          <i className="whatif-flow__dot whatif-flow__dot--battery" />
          Battery
        </span>
        <span>
          <i className="whatif-flow__dot whatif-flow__dot--grid" />
          Grid
        </span>
      </div>
    </div>
  )
}
