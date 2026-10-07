/**
 * Two bars: VPP payment over a year, saved setup against the draft.
 */
import { formatAud } from '../../lib/kpis'

type Props = {
  nowAud: number
  draftAud: number
}

/**
 * WhatIfYearBars
 */
export function WhatIfYearBars({ nowAud, draftAud }: Props) {
  const peak = Math.max(nowAud, draftAud, 1)
  const nowHeight = Math.max(4, (Math.max(nowAud, 0) / peak) * 100)
  const draftHeight = Math.max(4, (Math.max(draftAud, 0) / peak) * 100)

  return (
    <div
      className="whatif-bars"
      role="img"
      aria-label={`VPP payment this year ${formatAud(nowAud)} now, ${formatAud(draftAud)} with this change`}
    >
      <div className="whatif-bars__col">
        <span className="whatif-bars__value">{formatAud(nowAud)}</span>
        <div className="whatif-bars__track">
          <div className="whatif-bars__fill whatif-bars__fill--now" style={{ height: `${nowHeight}%` }} />
        </div>
        <span className="whatif-bars__label">This year</span>
      </div>
      <div className="whatif-bars__col">
        <span className="whatif-bars__value">{formatAud(draftAud)}</span>
        <div className="whatif-bars__track">
          <div className="whatif-bars__fill whatif-bars__fill--draft" style={{ height: `${draftHeight}%` }} />
        </div>
        <span className="whatif-bars__label">With this change</span>
      </div>
    </div>
  )
}
