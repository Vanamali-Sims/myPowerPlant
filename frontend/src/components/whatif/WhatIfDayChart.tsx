/**
 * Typical day: household use against solar. A dashed line is the saved setup.
 * Hover reads the hour from the same points the line is drawn with.
 */
import { useState } from 'react'
import { formatHour, type HourPoint } from '../../lib/typicalDay'

type Props = {
  now: HourPoint[]
  draft: HourPoint[]
  showPrevious: boolean
}

const W = 760
const P = { l: 40, r: 14, t: 28 }
const PH = 220

function niceTop(max: number): number {
  if (max <= 0) return 1
  const padded = max * 1.15
  const exp = 10 ** Math.floor(Math.log10(padded))
  const fraction = padded / exp
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10
  return nice * exp
}

function curve(points: Array<[number, number]>, base: number, move = true): string {
  if (!points.length) return ''
  let path = `${move ? 'M' : 'L'}${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] ?? points[index]
    const p1 = points[index]
    const p2 = points[index + 1]
    const p3 = points[index + 2] ?? p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = Math.min(base, p1[1] + (p2[1] - p0[1]) / 6)
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = Math.min(base, p2[1] - (p3[1] - p1[1]) / 6)
    path += `C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
  }
  return path
}

/**
 * WhatIfDayChart
 */
export function WhatIfDayChart({ now, draft, showPrevious }: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const plotW = W - P.l - P.r
  const base = P.t + PH
  const max = Math.max(
    0.5,
    ...now.flatMap((point) => [point.loadKwh, point.solarKwh]),
    ...draft.flatMap((point) => [point.loadKwh, point.solarKwh]),
  )
  const top = niceTop(max)
  const xAt = (hour: number) => P.l + (hour / 23) * plotW
  const yAt = (value: number) => base - (value / top) * PH
  const pts = (points: HourPoint[], key: 'loadKwh' | 'solarKwh') =>
    points.map((point) => [xAt(point.hour), yAt(point[key])] as [number, number])

  const solar = pts(draft, 'solarKwh')
  const load = pts(draft, 'loadKwh')
  const solarPrev = pts(now, 'solarKwh')
  const loadPrev = pts(now, 'loadKwh')
  const close = `L${xAt(23).toFixed(1)},${base}L${xAt(0).toFixed(1)},${base}Z`
  const solarGain =
    draft.reduce((sum, point) => sum + point.solarKwh, 0) >= now.reduce((sum, point) => sum + point.solarKwh, 0)
  const ticks = [0, 6, 12, 18, 23]
  const active = hover != null ? draft[hover] : null
  const previous = hover != null ? now[hover] : null
  const tipLeft = hover == null ? 0 : Math.min((xAt(hover) / W) * 100, 74)

  return (
    <div
      className="whatif-chartwrap"
      onPointerLeave={() => setHover(null)}
    >
      <svg
        className="whatif-chart"
        viewBox={`0 0 ${W} ${base + 28}`}
        role="img"
        aria-label="Typical day, solar and home use"
      >
        <defs>
          <linearGradient id="whatifSolarFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#de6a34" stopOpacity="0.32" />
            <stop offset="1" stopColor="#de6a34" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="whatifLoadFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1f4a3c" stopOpacity="0.12" />
            <stop offset="1" stopColor="#1f4a3c" stopOpacity="0" />
          </linearGradient>
          <pattern id="whatifHatchUp" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="2.4" height="6" fill="#2f7a55" opacity="0.5" />
          </pattern>
          <pattern id="whatifHatchDown" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="2.4" height="6" fill="#b94f21" opacity="0.5" />
          </pattern>
        </defs>
        {draft.map((point) =>
          point.solarKwh > point.loadKwh ? (
            <rect
              key={point.hour}
              className="whatif-chart__band"
              x={xAt(point.hour)}
              y={P.t}
              width={plotW / 23}
              height={PH}
            />
          ) : null,
        )}
        {[0, 0.5, 1].map((share) => {
          const y = yAt(top * share)
          const label = top * share
          return (
            <g key={share}>
              <line className="whatif-chart__grid" x1={P.l} x2={W - P.r} y1={y} y2={y} />
              <text className="whatif-chart__axis" x={P.l - 8} y={y + 4} textAnchor="end">
                {label.toFixed(top < 5 ? 1 : 0)}
              </text>
            </g>
          )
        })}
        <text className="whatif-chart__axis" x={P.l} y={P.t - 12}>
          kWh per hour
        </text>
        {showPrevious ? (
          <path
            d={`${curve(solar, base)}${curve([...solarPrev].reverse(), base, false)}Z`}
            fill={solarGain ? 'url(#whatifHatchUp)' : 'url(#whatifHatchDown)'}
          />
        ) : null}
        <path d={`${curve(solar, base)}${close}`} fill="url(#whatifSolarFill)" />
        <path d={`${curve(load, base)}${close}`} fill="url(#whatifLoadFill)" />
        {showPrevious ? <path className="whatif-chart__solar-ghost" d={curve(solarPrev, base)} /> : null}
        {showPrevious ? <path className="whatif-chart__load-ghost" d={curve(loadPrev, base)} /> : null}
        <path className="whatif-chart__solar" d={curve(solar, base)} />
        <path className="whatif-chart__load" d={curve(load, base)} />
        {ticks.map((hour) => (
          <text
            key={hour}
            className="whatif-chart__axis"
            x={xAt(hour)}
            y={base + 20}
            textAnchor={hour === 0 ? 'start' : hour === 23 ? 'end' : 'middle'}
          >
            {hour === 23 ? '11pm' : formatHour(hour)}
          </text>
        ))}
        {active && hover != null ? (
          <>
            <line className="whatif-chart__cursor" x1={xAt(hover)} x2={xAt(hover)} y1={P.t} y2={base} />
            <circle className="whatif-chart__dot whatif-chart__dot--solar" cx={xAt(hover)} cy={yAt(active.solarKwh)} r="4.5" />
            <circle className="whatif-chart__dot whatif-chart__dot--load" cx={xAt(hover)} cy={yAt(active.loadKwh)} r="4.5" />
          </>
        ) : null}
        <rect
          x={P.l}
          y="0"
          width={plotW}
          height={base + 28}
          fill="transparent"
          onPointerMove={(event) => {
            const box = event.currentTarget.getBoundingClientRect()
            const x = ((event.clientX - box.left) / box.width) * plotW
            const hour = Math.max(0, Math.min(23, Math.round((x / plotW) * 23)))
            setHover(hour)
          }}
        />
      </svg>
      {active && previous && hover != null ? (
        <div className="whatif-tip" style={{ left: `${tipLeft}%` }}>
          <b>{formatHour(hover)}</b>
          <div>
            <span>Solar</span>
            {active.solarKwh.toFixed(2)} kWh
          </div>
          <div>
            <span>Home</span>
            {active.loadKwh.toFixed(2)} kWh
          </div>
          {showPrevious && Math.abs(active.solarKwh - previous.solarKwh) > 0.005 ? (
            <div>
              <span>vs now</span>
              {active.solarKwh - previous.solarKwh > 0 ? '+' : '−'}
              {Math.abs(active.solarKwh - previous.solarKwh).toFixed(2)} kWh
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
