import { useEffect, useRef, useState } from 'react'
import type { Timeframe } from '../../lib/kpis'
import { riverHeadlineShare, formatShare } from '../../lib/energyRiver'
import type { EnergyRiverModel } from '../../lib/energyRiver'
import { EnergyRing, type EnergyFocus } from './EnergyRing'
import { EnergyTree } from './EnergyTree'
import './energy.css'

type Props = {
  model: EnergyRiverModel
  dischargeLabel: string
  dischargeHint: string
  headlineText: string
}

let entrancePlayedGlobally = false

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function EnergyBreakdown({ model, dischargeLabel, dischargeHint, headlineText }: Props) {
  const [focus, setFocus] = useState<EnergyFocus>(null)
  const [entrance, setEntrance] = useState(() => !entrancePlayedGlobally && !prefersReducedMotion())
  const [flowReady, setFlowReady] = useState(() => entrancePlayedGlobally || prefersReducedMotion())
  const [pauseContinuous, setPauseContinuous] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const generated = model.generatedKwh
  const used = model.usedKwh
  const ringDischarge = model.fork === 'surplus' ? model.forkKwh : 0
  const forkCardKwh = model.forkKwh

  const shareLabel = formatShare(riverHeadlineShare(model))

  const generatedHint = model.solarIsPotential ? 'modelled from the roof' : 'from the roof'

  useEffect(() => {
    if (!entrance) return
    entrancePlayedGlobally = true
    const flowTimer = window.setTimeout(() => setFlowReady(true), 2200)
    const doneTimer = window.setTimeout(() => setEntrance(false), 2800)
    return () => {
      window.clearTimeout(flowTimer)
      window.clearTimeout(doneTimer)
    }
  }, [entrance])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const syncPause = (inView: boolean) => {
      setPauseContinuous(!inView || document.visibilityState === 'hidden')
    }
    const io = new IntersectionObserver(
      ([entry]) => syncPause(entry.isIntersecting),
      { threshold: 0.15 },
    )
    io.observe(root)
    const onVis = () => {
      const inView = root.getBoundingClientRect().bottom > 0 && root.getBoundingClientRect().top < window.innerHeight
      syncPause(inView)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  const reducedMotion = prefersReducedMotion()

  const showEntrance = entrance && !reducedMotion
  const showFlow = (flowReady || !showEntrance) && !reducedMotion

  const className = [
    'energy-breakdown',
    showEntrance ? 'energy-breakdown--entrance' : '',
    showFlow ? 'energy-breakdown--flow' : '',
    pauseContinuous ? 'is-pause-continuous' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={className} ref={rootRef}>
      <div className="energy-breakdown__grid">
        <div className="energy-breakdown__ring-col">
          <EnergyRing
            generated={generated}
            used={used}
            discharge={ringDischarge}
            focus={focus}
            defaultPctLabel={shareLabel}
            defaultSubLabel={headlineText}
            entrance={showEntrance}
          />
          <p className="energy-breakdown__hint">Hover or tap a number to explore</p>
        </div>
        <div className="energy-breakdown__tree-col">
          <EnergyTree
            generated={generated}
            used={used}
            discharge={forkCardKwh}
            ringDischarge={ringDischarge}
            generatedHint={generatedHint}
            dischargeLabel={dischargeLabel}
            dischargeHint={dischargeHint}
            focus={focus}
            onFocus={setFocus}
            onClearFocus={() => setFocus(null)}
            entranceActive={showEntrance}
            flowReady={showFlow}
          />
        </div>
      </div>
    </div>
  )
}

export type { Timeframe }
