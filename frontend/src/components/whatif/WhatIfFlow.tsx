/**
 * House energy-flow diagram on the What if stage card (surplus or deficit).
 * SVG geometry from context/vpp-flow-reference.html — do not redraw by hand.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

export type FlowMode = 'surplus' | 'deficit'

export type WhatIfFlowProps = {
  solarKwh: number
  homeKwh: number
  annualPayment: number
}

function formatKwh(value: number): string {
  return `${value.toFixed(1)} kWh`
}

function flowDuration(kwh: number): number {
  return Math.min(1.6, Math.max(0.8, 1.6 - (kwh / 24) * 0.8))
}

function useTweened(value: number, ms = 400): number {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    if (Math.abs(value - from.current) < 0.05) {
      setShown(value)
      return
    }
    const start = from.current
    from.current = value
    const t0 = performance.now()
    let frame = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / ms)
      setShown(start + (value - start) * t)
      if (t < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [value, ms])
  return shown
}

function surplusAria(solar: number, home: number, vpp: number): string {
  return `Solar panels make ${formatKwh(solar)}, the battery powers ${formatKwh(home)} of home use, and ${formatKwh(vpp)} leaves through the door to the VPP`
}

function deficitAria(solar: number, home: number, vpp: number): string {
  return `Solar panels make ${formatKwh(solar)}, ${formatKwh(vpp)} comes in through the door from the VPP into the battery, which powers ${formatKwh(home)} of home use`
}

type DiagramValues = {
  solar: number
  home: number
  vpp: number
  flowDur: (baseSeconds: number) => string
}

function FlowMarkers() {
  return (
    <defs>
      <marker
        id="apArrow"
        viewBox="0 0 8 8"
        refX="6"
        refY="4"
        markerWidth="7"
        markerHeight="7"
        markerUnits="userSpaceOnUse"
        orient="auto"
      >
        <path
          d="M1 1L6 4L1 7"
          fill="none"
          stroke="#E8E2D6"
          strokeOpacity="0.6"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </marker>
      <marker
        id="vppArrow"
        viewBox="0 0 8 8"
        refX="6"
        refY="4"
        markerWidth="7"
        markerHeight="7"
        markerUnits="userSpaceOnUse"
        orient="auto"
      >
        <path
          d="M1 1L6 4L1 7"
          fill="none"
          stroke="#9DB7F5"
          strokeOpacity="0.65"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </marker>
    </defs>
  )
}

function SurplusDiagram({ solar, home, vpp, flowDur }: DiagramValues) {
  const vppText = `+${vpp.toFixed(1)} kWh`
  return (
    <>
      <FlowMarkers />
      <path d="M20 120L270 24L520 120V316H20Z" fill="#E8E2D6" fillOpacity="0.03" />
      <path
        d="M520 205V120L270 24L20 120V316H520V255"
        fill="none"
        stroke="#E8E2D6"
        strokeOpacity="0.4"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <text x="200" y="112" textAnchor="middle" fontSize="11" letterSpacing="1.5" fontWeight="600" fill="#A9BDB4">
        YOUR HOUSE
      </text>
      <g transform="translate(300 35.5) rotate(21)">
        <rect
          className="panelglow"
          x="0"
          y="-15"
          width="118"
          height="12"
          rx="2"
          fill="#F0A35E"
          stroke="#F0A35E"
          strokeWidth="1.5"
        />
        <path d="M29.5 -15V-3M59 -15V-3M88.5 -15V-3M0 -9H118" stroke="#133029" strokeWidth="1.2" />
      </g>
      <g className="q1">
        <path className="track" stroke="#F0A35E" d="M456 44L406 55" />
        <path
          className="flow"
          stroke="#F0A35E"
          style={{ animationDuration: flowDur(0.9) }}
          d="M456 44L406 55"
        />
      </g>
      <g transform="translate(480 38)" fill="none" stroke="#F0A35E" strokeWidth="2.2" strokeLinecap="round">
        <circle r="11" fill="#F0A35E" fillOpacity="0.2" />
        <path
          d="M0 -16v-5M0 16v5M-16 0h-5M16 0h5M-11.3 -11.3l-3.5 -3.5M11.3 11.3l3.5 3.5M-11.3 11.3l-3.5 3.5M11.3 -11.3l3.5 -3.5"
        />
      </g>
      <text x="514" y="30" fontSize="11" letterSpacing="1.5" fill="#A9BDB4">SOLAR</text>
      <text x="514" y="58" fontSize="25" fontWeight="600" fill="#E8E2D6">{formatKwh(solar)}</text>
      <g className="q1">
        <path className="track" stroke="#F0A35E" d="M360 66C372 120 385 160 388 198" />
        <path
          className="flow"
          stroke="#F0A35E"
          style={{ animationDuration: flowDur(1) }}
          d="M360 66C372 120 385 160 388 198"
        />
      </g>
      <g className="q2">
        <path className="track" stroke="#6FD3A8" d="M358 230H182" />
        <path
          className="flow"
          stroke="#6FD3A8"
          style={{ animationDuration: flowDur(1.1) }}
          d="M358 230H182"
        />
      </g>
      <g className="q2">
        <path className="thin" stroke="#E8E2D6" markerEnd="url(#apArrow)" d="M119 230H88" />
        <path className="thin" stroke="#E8E2D6" markerEnd="url(#apArrow)" d="M126 208L108 195" />
        <path className="thin" stroke="#E8E2D6" markerEnd="url(#apArrow)" d="M147 200L142 184" />
      </g>
      <g transform="translate(68 230)">
        <circle r="16" fill="#1B4136" stroke="#E8E2D6" strokeOpacity="0.35" />
        <g transform="scale(0.7) translate(-12 -12)" fill="none" stroke="#E8E2D6" strokeWidth="1.8" strokeLinecap="round">
          <rect x="6" y="2" width="12" height="20" rx="2" />
          <path d="M6 10h12M9 5v2M9 13v3" />
        </g>
      </g>
      <g transform="translate(92 182)">
        <circle r="16" fill="#1B4136" stroke="#E8E2D6" strokeOpacity="0.35" />
        <g transform="scale(0.7) translate(-12 -12)" fill="none" stroke="#E8E2D6" strokeWidth="1.8" strokeLinecap="round">
          <rect x="3" y="5" width="18" height="12" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </g>
      </g>
      <g transform="translate(138 164)">
        <circle r="16" fill="#1B4136" stroke="#E8E2D6" strokeOpacity="0.35" />
        <g transform="scale(0.7) translate(-12 -12)" fill="none" stroke="#E8E2D6" strokeWidth="1.8" strokeLinecap="round">
          <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z" />
        </g>
      </g>
      <g className="q3">
        <path className="track" stroke="#9DB7F5" d="M422 230H628" />
        <path
          className="flow"
          stroke="#9DB7F5"
          style={{ animationDuration: flowDur(1.5) }}
          d="M422 230H628"
        />
      </g>
      <g className="q4">
        <path
          d="M628 166L680 161M706 168L731 202M739 226L733 266"
          fill="none"
          stroke="#9DB7F5"
          strokeOpacity="0.15"
          strokeWidth="1.2"
          strokeDasharray="2 4"
        />
        <path className="mesh" stroke="#9DB7F5" markerEnd="url(#vppArrow)" d="M673 203L687 175" />
        <path className="mesh" stroke="#9DB7F5" markerEnd="url(#vppArrow)" d="M689 223L723 216" />
        <path className="mesh" stroke="#9DB7F5" markerEnd="url(#vppArrow)" d="M684 247L716 270" />
        <path className="mesh" stroke="#9DB7F5" markerEnd="url(#vppArrow)" d="M642 206L624 182" />
      </g>
      <g transform="translate(614 168)">
        <circle r="14" fill="#1B4136" stroke="#9DB7F5" strokeOpacity="0.45" />
        <path
          transform="scale(0.6) translate(-12 -12)"
          d="M4 11 12 4l8 7v9H4z"
          fill="none"
          stroke="#9DB7F5"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </g>
      <g transform="translate(694 160)">
        <circle r="14" fill="#1B4136" stroke="#9DB7F5" strokeOpacity="0.45" />
        <path
          transform="scale(0.6) translate(-12 -12)"
          d="M4 11 12 4l8 7v9H4z"
          fill="none"
          stroke="#9DB7F5"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </g>
      <g transform="translate(740 212)">
        <circle r="14" fill="#1B4136" stroke="#9DB7F5" strokeOpacity="0.45" />
        <path
          transform="scale(0.6) translate(-12 -12)"
          d="M4 11 12 4l8 7v9H4z"
          fill="none"
          stroke="#9DB7F5"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </g>
      <g transform="translate(730 280)">
        <circle r="14" fill="#1B4136" stroke="#9DB7F5" strokeOpacity="0.45" />
        <path
          transform="scale(0.6) translate(-12 -12)"
          d="M4 11 12 4l8 7v9H4z"
          fill="none"
          stroke="#9DB7F5"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </g>
      <text x="694" y="134" textAnchor="middle" fontSize="11" fill="#A9BDB4">other VPP homes</text>
      <g transform="translate(390 230)">
        <circle r="30" fill="#1B4136" stroke="#6FD3A8" strokeOpacity="0.6" strokeWidth="1.5" />
        <g transform="translate(-12 -12)" fill="none" stroke="#6FD3A8" strokeWidth="1.8" strokeLinecap="round">
          <rect x="7" y="5" width="10" height="16" rx="2" />
          <path d="M10 3h4" />
        </g>
      </g>
      <g transform="translate(150 230)">
        <circle r="30" fill="#1B4136" stroke="#E8E2D6" strokeOpacity="0.5" strokeWidth="1.5" />
        <g transform="translate(-12 -12)" fill="none" stroke="#E8E2D6" strokeWidth="1.8" strokeLinejoin="round">
          <path d="M4 11 12 4l8 7v9H4z" />
        </g>
      </g>
      <g transform="translate(660 230)">
        <circle r="30" fill="#1B4136" stroke="#9DB7F5" strokeOpacity="0.6" strokeWidth="1.5" />
        <g transform="translate(-12 -12)" fill="none" stroke="#9DB7F5" strokeWidth="1.8" strokeLinecap="round">
          <path d="M12 3 7 21M12 3l5 18M8.4 15h7.2M9.6 10h4.8M5 7h14" />
        </g>
      </g>
      <text x="390" y="282" textAnchor="middle" fontSize="11" letterSpacing="1.5" fill="#A9BDB4">BATTERY</text>
      <text x="150" y="282" textAnchor="middle" fontSize="11" letterSpacing="1.5" fill="#A9BDB4">HOME USE</text>
      <text x="150" y="310" textAnchor="middle" fontSize="25" fontWeight="600" fill="#E8E2D6">{formatKwh(home)}</text>
      <text x="572" y="208" textAnchor="middle" fontSize="13" fontWeight="600" fill="#8FE0BC">out the door →</text>
      <text x="660" y="282" textAnchor="middle" fontSize="11" letterSpacing="1.5" fill="#A9BDB4">VPP</text>
      <g transform="translate(642 314)">
        <rect x="-62" y="-19" width="124" height="38" rx="19" fill="#6FD3A8" fillOpacity="0.16" />
        <text y="8" textAnchor="middle" fontSize="22" fontWeight="600" fill="#8FE0BC">{vppText}</text>
      </g>
    </>
  )
}

function DeficitDiagram({ solar, home, vpp, flowDur }: DiagramValues) {
  const vppText = `−${vpp.toFixed(1)} kWh`
  return (
    <>
      <FlowMarkers />
      <path d="M20 120L270 24L520 120V316H20Z" fill="#E8E2D6" fillOpacity="0.03" />
      <path
        d="M520 205V120L270 24L20 120V316H520V255"
        fill="none"
        stroke="#E8E2D6"
        strokeOpacity="0.4"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <text x="200" y="112" textAnchor="middle" fontSize="11" letterSpacing="1.5" fontWeight="600" fill="#A9BDB4">
        YOUR HOUSE
      </text>
      <g transform="translate(300 35.5) rotate(21)">
        <rect
          className="panelglow"
          x="0"
          y="-15"
          width="118"
          height="12"
          rx="2"
          fill="#F0A35E"
          stroke="#F0A35E"
          strokeWidth="1.5"
        />
        <path d="M29.5 -15V-3M59 -15V-3M88.5 -15V-3M0 -9H118" stroke="#133029" strokeWidth="1.2" />
      </g>
      <g className="q1">
        <path className="track" stroke="#F0A35E" d="M456 44L406 55" />
        <path
          className="flow"
          stroke="#F0A35E"
          style={{ animationDuration: flowDur(0.9) }}
          d="M456 44L406 55"
        />
      </g>
      <g transform="translate(480 38)" fill="none" stroke="#F0A35E" strokeWidth="2.2" strokeLinecap="round">
        <circle r="11" fill="#F0A35E" fillOpacity="0.2" />
        <path
          d="M0 -16v-5M0 16v5M-16 0h-5M16 0h5M-11.3 -11.3l-3.5 -3.5M11.3 11.3l3.5 3.5M-11.3 11.3l-3.5 3.5M11.3 -11.3l3.5 -3.5"
        />
      </g>
      <text x="514" y="30" fontSize="11" letterSpacing="1.5" fill="#A9BDB4">SOLAR</text>
      <text x="514" y="58" fontSize="25" fontWeight="600" fill="#E8E2D6">{formatKwh(solar)}</text>
      <g className="q1">
        <path className="track" stroke="#F0A35E" d="M360 66C372 120 385 160 388 198" />
        <path
          className="flow"
          stroke="#F0A35E"
          style={{ animationDuration: flowDur(1.3) }}
          d="M360 66C372 120 385 160 388 198"
        />
      </g>
      <g className="q2">
        <path
          d="M628 166L680 161M706 168L731 202M739 226L733 266"
          fill="none"
          stroke="#9DB7F5"
          strokeOpacity="0.15"
          strokeWidth="1.2"
          strokeDasharray="2 4"
        />
        <path className="mesh" stroke="#9DB7F5" markerEnd="url(#vppArrow)" d="M687 175L673 203" />
        <path className="mesh" stroke="#9DB7F5" markerEnd="url(#vppArrow)" d="M723 216L689 223" />
        <path className="mesh" stroke="#9DB7F5" markerEnd="url(#vppArrow)" d="M716 270L684 247" />
        <path className="mesh" stroke="#9DB7F5" markerEnd="url(#vppArrow)" d="M624 182L642 206" />
      </g>
      <g className="q2">
        <path className="track" stroke="#9DB7F5" d="M422 230H628" />
        <path
          className="flow rev"
          stroke="#9DB7F5"
          style={{ animationDuration: flowDur(1.4) }}
          d="M422 230H628"
        />
      </g>
      <g className="q3">
        <path className="track" stroke="#6FD3A8" d="M358 230H182" />
        <path
          className="flow"
          stroke="#6FD3A8"
          style={{ animationDuration: flowDur(1.1) }}
          d="M358 230H182"
        />
      </g>
      <g className="q4">
        <path className="thin" stroke="#E8E2D6" markerEnd="url(#apArrow)" d="M119 230H88" />
        <path className="thin" stroke="#E8E2D6" markerEnd="url(#apArrow)" d="M126 208L108 195" />
        <path className="thin" stroke="#E8E2D6" markerEnd="url(#apArrow)" d="M147 200L142 184" />
      </g>
      <g transform="translate(68 230)">
        <circle r="16" fill="#1B4136" stroke="#E8E2D6" strokeOpacity="0.35" />
        <g transform="scale(0.7) translate(-12 -12)" fill="none" stroke="#E8E2D6" strokeWidth="1.8" strokeLinecap="round">
          <rect x="6" y="2" width="12" height="20" rx="2" />
          <path d="M6 10h12M9 5v2M9 13v3" />
        </g>
      </g>
      <g transform="translate(92 182)">
        <circle r="16" fill="#1B4136" stroke="#E8E2D6" strokeOpacity="0.35" />
        <g transform="scale(0.7) translate(-12 -12)" fill="none" stroke="#E8E2D6" strokeWidth="1.8" strokeLinecap="round">
          <rect x="3" y="5" width="18" height="12" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </g>
      </g>
      <g transform="translate(138 164)">
        <circle r="16" fill="#1B4136" stroke="#E8E2D6" strokeOpacity="0.35" />
        <g transform="scale(0.7) translate(-12 -12)" fill="none" stroke="#E8E2D6" strokeWidth="1.8" strokeLinecap="round">
          <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z" />
        </g>
      </g>
      <g transform="translate(614 168)">
        <circle r="14" fill="#1B4136" stroke="#9DB7F5" strokeOpacity="0.45" />
        <path
          transform="scale(0.6) translate(-12 -12)"
          d="M4 11 12 4l8 7v9H4z"
          fill="none"
          stroke="#9DB7F5"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </g>
      <g transform="translate(694 160)">
        <circle r="14" fill="#1B4136" stroke="#9DB7F5" strokeOpacity="0.45" />
        <path
          transform="scale(0.6) translate(-12 -12)"
          d="M4 11 12 4l8 7v9H4z"
          fill="none"
          stroke="#9DB7F5"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </g>
      <g transform="translate(740 212)">
        <circle r="14" fill="#1B4136" stroke="#9DB7F5" strokeOpacity="0.45" />
        <path
          transform="scale(0.6) translate(-12 -12)"
          d="M4 11 12 4l8 7v9H4z"
          fill="none"
          stroke="#9DB7F5"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </g>
      <g transform="translate(730 280)">
        <circle r="14" fill="#1B4136" stroke="#9DB7F5" strokeOpacity="0.45" />
        <path
          transform="scale(0.6) translate(-12 -12)"
          d="M4 11 12 4l8 7v9H4z"
          fill="none"
          stroke="#9DB7F5"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </g>
      <text x="694" y="134" textAnchor="middle" fontSize="11" fill="#A9BDB4">other VPP homes</text>
      <g transform="translate(390 230)">
        <circle r="30" fill="#1B4136" stroke="#6FD3A8" strokeOpacity="0.6" strokeWidth="1.5" />
        <g transform="translate(-12 -12)" fill="none" stroke="#6FD3A8" strokeWidth="1.8" strokeLinecap="round">
          <rect x="7" y="5" width="10" height="16" rx="2" />
          <path d="M10 3h4" />
        </g>
      </g>
      <g transform="translate(150 230)">
        <circle r="30" fill="#1B4136" stroke="#E8E2D6" strokeOpacity="0.5" strokeWidth="1.5" />
        <g transform="translate(-12 -12)" fill="none" stroke="#E8E2D6" strokeWidth="1.8" strokeLinejoin="round">
          <path d="M4 11 12 4l8 7v9H4z" />
        </g>
      </g>
      <g transform="translate(660 230)">
        <circle r="30" fill="#1B4136" stroke="#9DB7F5" strokeOpacity="0.6" strokeWidth="1.5" />
        <g transform="translate(-12 -12)" fill="none" stroke="#9DB7F5" strokeWidth="1.8" strokeLinecap="round">
          <path d="M12 3 7 21M12 3l5 18M8.4 15h7.2M9.6 10h4.8M5 7h14" />
        </g>
      </g>
      <text x="390" y="282" textAnchor="middle" fontSize="11" letterSpacing="1.5" fill="#A9BDB4">BATTERY</text>
      <text x="150" y="282" textAnchor="middle" fontSize="11" letterSpacing="1.5" fill="#A9BDB4">HOME USE</text>
      <text x="150" y="310" textAnchor="middle" fontSize="25" fontWeight="600" fill="#E8E2D6">{formatKwh(home)}</text>
      <text x="572" y="208" textAnchor="middle" fontSize="13" fontWeight="600" fill="#F2B880">← in the door</text>
      <text x="660" y="282" textAnchor="middle" fontSize="11" letterSpacing="1.5" fill="#A9BDB4">VPP</text>
      <g transform="translate(642 314)">
        <rect x="-58" y="-19" width="116" height="38" rx="19" fill="#F2B880" fillOpacity="0.16" />
        <text y="8" textAnchor="middle" fontSize="22" fontWeight="600" fill="#F2B880">{vppText}</text>
      </g>
    </>
  )
}

export function WhatIfFlow({ solarKwh, homeKwh }: WhatIfFlowProps) {
  const net = solarKwh - homeKwh
  const mode: FlowMode = net >= 0 ? 'surplus' : 'deficit'
  const vppKwh = Math.abs(net)

  const [displayMode, setDisplayMode] = useState(mode)
  const fading = mode !== displayMode

  useEffect(() => {
    if (mode === displayMode) return
    const timer = window.setTimeout(() => setDisplayMode(mode), 200)
    return () => window.clearTimeout(timer)
  }, [mode, displayMode])

  const solarShown = useTweened(solarKwh)
  const homeShown = useTweened(homeKwh)
  const vppShown = useTweened(vppKwh)

  const dotSpeed = flowDuration(Math.max(solarKwh, homeKwh, vppKwh))
  const flowDur = (baseSeconds: number) => `${((baseSeconds * dotSpeed) / 1.1).toFixed(2)}s`

  const label = useMemo(
    () =>
      displayMode === 'surplus'
        ? surplusAria(solarShown, homeShown, vppShown)
        : deficitAria(solarShown, homeShown, vppShown),
    [displayMode, solarShown, homeShown, vppShown],
  )

  const values: DiagramValues = { solar: solarShown, home: homeShown, vpp: vppShown, flowDur }

  return (
    <div
      className={`whatif-diagram-wrap whatif-diagram-wrap--${displayMode}${fading ? ' whatif-diagram-wrap--fading' : ''}`}
      style={{ '--house-flow-dur': `${dotSpeed}s` } as CSSProperties}
    >
      <svg className="whatif-diagram" viewBox="0 0 760 340" role="img" aria-label={label}>
        {displayMode === 'surplus' ? <SurplusDiagram {...values} /> : <DeficitDiagram {...values} />}
      </svg>
    </div>
  )
}
