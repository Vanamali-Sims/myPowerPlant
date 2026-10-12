import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { formatShare } from '../../lib/energyRiver'
import { computeEnergyArcs } from './energyMath'
import { RollingKwh } from '../dashboard/RollingKwh'
import type { EnergyFocus } from './EnergyRing'

type Props = {
  generated: number
  used: number
  discharge: number
  ringDischarge: number
  generatedHint: string
  dischargeLabel: string
  dischargeHint: string
  focus: EnergyFocus
  onFocus: (next: EnergyFocus) => void
  onClearFocus: () => void
  entranceActive: boolean
  flowReady: boolean
}

type Pt = { x: number; y: number }

type MeasuredPaths = {
  stem: string
  left: string
  right: string
  junction: Pt
  stemLen: number
  leftLen: number
  rightLen: number
}

const FLOW_SPEED = 40
const CORNER = 8
const CONNECTOR_HEIGHT = 52

export function EnergyTree({
  generated,
  used,
  discharge,
  ringDischarge,
  generatedHint,
  dischargeLabel,
  dischargeHint,
  focus,
  onFocus,
  onClearFocus,
  entranceActive,
  flowReady,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null)
  const genRef = useRef<HTMLButtonElement>(null)
  const usedRef = useRef<HTMLButtonElement>(null)
  const dischargeRef = useRef<HTMLButtonElement>(null)
  const stemPathRef = useRef<SVGPathElement>(null)
  const leftPathRef = useRef<SVGPathElement>(null)
  const rightPathRef = useRef<SVGPathElement>(null)
  const [paths, setPaths] = useState<MeasuredPaths | null>(null)
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 })

  const arcs = computeEnergyArcs(generated, used, ringDischarge)
  const usedPctLabel = formatShare(arcs.usedShareOfGen)
  const dischargePctLabel = formatShare(arcs.dischargeShare)
  const showDischargeFlow = ringDischarge > 0

  const measure = useCallback(() => {
    const stage = stageRef.current
    const gen = genRef.current
    const usedEl = usedRef.current
    const dis = dischargeRef.current
    if (!stage || !gen || !usedEl || !dis) return

    const box = stage.getBoundingClientRect()
    if (box.width <= 0 || box.height <= 0) return

    setStageSize({ w: box.width, h: box.height })

    const centreBottom = (el: HTMLElement): Pt => {
      const r = el.getBoundingClientRect()
      return { x: r.left + r.width / 2 - box.left, y: r.bottom - box.top }
    }
    const centreTop = (el: HTMLElement): Pt => {
      const r = el.getBoundingClientRect()
      return { x: r.left + r.width / 2 - box.left, y: r.top - box.top }
    }

    const genBottom = centreBottom(gen)
    const usedTop = centreTop(usedEl)
    const disTop = centreTop(dis)
    const junction: Pt = { x: genBottom.x, y: genBottom.y + CONNECTOR_HEIGHT * 0.72 }

    const stem = linePath(genBottom, junction)
    const left = branchPath(junction, usedTop)
    const right = branchPath(junction, disTop)

    const next: MeasuredPaths = { stem, left, right, junction, stemLen: 80, leftLen: 80, rightLen: 80 }
    setPaths(next)

    requestAnimationFrame(() => {
      next.stemLen = stemPathRef.current?.getTotalLength() ?? next.stemLen
      next.leftLen = leftPathRef.current?.getTotalLength() ?? next.leftLen
      next.rightLen = rightPathRef.current?.getTotalLength() ?? next.rightLen
      setPaths({ ...next })
    })
  }, [])

  useLayoutEffect(() => {
    const run = () => measure()
    run()
    const stage = stageRef.current
    if (!stage) return
    const ro = new ResizeObserver(() => run())
    ro.observe(stage)
    window.addEventListener('resize', run)
    void document.fonts?.ready?.then(run)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', run)
    }
  }, [measure])

  useEffect(() => {
    measure()
  }, [generated, used, discharge, measure])

  const stemDur = paths ? `${paths.stemLen / FLOW_SPEED}s` : '2s'
  const leftDur = paths ? `${paths.leftLen / FLOW_SPEED}s` : '2s'
  const rightDur = paths ? `${paths.rightLen / FLOW_SPEED}s` : '2s'

  const branchDim = (branch: 'left' | 'right') => {
    if (!focus || focus === 'generated') return false
    if (focus === 'used') return branch === 'right'
    if (focus === 'discharge') return branch === 'left'
    return false
  }

  const cardClass = (id: EnergyFocus, extra = '') => {
    const active = focus === id
    return `energy-card energy-tree__card-rise ${extra}${active ? ' is-active' : ''}`
  }

  const junctionClass = [
    'energy-tree__junction',
    entranceActive ? 'energy-tree__junction-entrance' : '',
    flowReady ? 'energy-tree__junction-pulse energy-breakdown__continuous' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="energy-tree">
      <div className="energy-tree__stage" ref={stageRef}>
        {paths && stageSize.w > 0 && stageSize.h > 0 ? (
          <svg
            className="energy-tree__overlay-svg"
            width={stageSize.w}
            height={stageSize.h}
            viewBox={`0 0 ${stageSize.w} ${stageSize.h}`}
            aria-hidden="true"
          >
            <defs>
              <linearGradient
                id="energy-grad-left"
                gradientUnits="userSpaceOnUse"
                x1={paths.junction.x}
                y1={paths.junction.y}
                x2={paths.junction.x - 80}
                y2={paths.junction.y}
              >
                <stop offset="0%" stopColor="var(--energy-generated)" />
                <stop offset="100%" stopColor="var(--energy-used)" />
              </linearGradient>
              <linearGradient
                id="energy-grad-right"
                gradientUnits="userSpaceOnUse"
                x1={paths.junction.x}
                y1={paths.junction.y}
                x2={paths.junction.x + 80}
                y2={paths.junction.y}
              >
                <stop offset="0%" stopColor="var(--energy-generated)" />
                <stop offset="100%" stopColor="var(--energy-discharge)" />
              </linearGradient>
            </defs>

            <g className="energy-tree__stem-entrance">
              <path
                ref={stemPathRef}
                d={paths.stem}
                className="energy-connector__base"
                stroke="var(--energy-generated)"
              />
            </g>

            <g className="energy-tree__branch-h-entrance energy-tree__branch-h-entrance--left">
              <g className="energy-tree__branch-v-entrance">
                <path
                  ref={leftPathRef}
                  d={paths.left}
                  className={`energy-connector__base${branchDim('left') ? ' is-dim' : ''}`}
                  stroke="url(#energy-grad-left)"
                />
              </g>
            </g>
            <g className="energy-tree__branch-h-entrance energy-tree__branch-h-entrance--right">
              <g className="energy-tree__branch-v-entrance">
                <path
                  ref={rightPathRef}
                  d={paths.right}
                  className={`energy-connector__base${branchDim('right') ? ' is-dim' : ''}`}
                  stroke="url(#energy-grad-right)"
                />
              </g>
            </g>

            <circle className={junctionClass} cx={paths.junction.x} cy={paths.junction.y} r={5} />

            {flowReady ? (
              <>
                <path
                  d={paths.stem}
                  className="energy-connector__flow energy-connector__flow--stem energy-breakdown__continuous"
                  style={{ animationDuration: stemDur }}
                />
                <path
                  d={paths.left}
                  className="energy-connector__flow energy-connector__flow--used energy-breakdown__continuous"
                  stroke="url(#energy-grad-left)"
                  style={{ animationDuration: leftDur }}
                />
                {showDischargeFlow ? (
                  <path
                    d={paths.right}
                    className="energy-connector__flow energy-connector__flow--discharge energy-breakdown__continuous"
                    stroke="url(#energy-grad-right)"
                    style={{ ['--flow-dur-discharge' as string]: rightDur, animationDuration: rightDur }}
                  />
                ) : null}
              </>
            ) : null}
          </svg>
        ) : null}

        <div className="energy-tree__generated-wrap">
          <button
            type="button"
            ref={genRef}
            className={cardClass('generated', 'energy-tree__card-rise--generated ')}
            onMouseEnter={() => onFocus('generated')}
            onMouseLeave={onClearFocus}
            onFocus={() => onFocus('generated')}
            onBlur={onClearFocus}
          >
            <span className="energy-card__label-row">
              <span className="energy-card__swatch energy-card__swatch--generated" aria-hidden="true" />
              <span>Energy generated</span>
            </span>
            <span className="energy-card__value energy-card__value--lg">
              <RollingKwh value={generated} />
            </span>
            <span className="energy-card__hint">{generatedHint}</span>
          </button>
        </div>

        <div className="energy-tree__connector-slot" aria-hidden="true" />

        <div className="energy-tree__children">
          <button
            type="button"
            ref={usedRef}
            className={cardClass('used', 'energy-tree__card-rise--child ')}
            onMouseEnter={() => onFocus('used')}
            onMouseLeave={onClearFocus}
            onFocus={() => onFocus('used')}
            onBlur={onClearFocus}
          >
            <span className="energy-card__label-row">
              <span className="energy-card__swatch energy-card__swatch--used" aria-hidden="true" />
              <span>Energy used</span>
            </span>
            <span className="energy-card__value energy-card__value--sm">
              <RollingKwh value={used} delayMs={60} />
            </span>
            <span className="energy-card__hint">by the house · {usedPctLabel}</span>
          </button>

          <button
            type="button"
            ref={dischargeRef}
            className={cardClass('discharge', 'energy-tree__card-rise--child ')}
            onMouseEnter={() => onFocus('discharge')}
            onMouseLeave={onClearFocus}
            onFocus={() => onFocus('discharge')}
            onBlur={onClearFocus}
          >
            <span className="energy-card__label-row">
              <span className="energy-card__swatch energy-card__swatch--discharge" aria-hidden="true" />
              <span>{dischargeLabel}</span>
            </span>
            <span className="energy-card__value energy-card__value--sm">
              <RollingKwh value={discharge} delayMs={120} />
            </span>
            <span className="energy-card__hint">
              {dischargeHint}
              {discharge > 0 ? ` · ${dischargePctLabel}` : ' · 0 kWh'}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

function linePath(a: Pt, b: Pt): string {
  return `M ${a.x} ${a.y} L ${b.x} ${b.y}`
}

function branchPath(junction: Pt, target: Pt): string {
  const drop = Math.max(CORNER * 2, (target.y - junction.y) * 0.35)
  const midY = junction.y + drop
  if (Math.abs(target.x - junction.x) < 2) {
    return `M ${junction.x} ${junction.y} L ${target.x} ${target.y}`
  }
  const dir = target.x < junction.x ? -1 : 1
  const hx = junction.x + dir * Math.max(CORNER, Math.abs(target.x - junction.x) * 0.35)
  return [
    `M ${junction.x} ${junction.y}`,
    `L ${junction.x} ${midY - CORNER}`,
    `Q ${junction.x} ${midY} ${hx} ${midY}`,
    `L ${target.x - dir * CORNER} ${target.y - CORNER}`,
    `Q ${target.x} ${target.y - CORNER} ${target.x} ${target.y}`,
  ].join(' ')
}
