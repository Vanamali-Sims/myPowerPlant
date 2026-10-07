/**
 * Solar tab on the What if page: adjust panel count and orientation together.
 *
 * Pure editor — the page around it recomputes the live dashboard on every
 * change, so this component only owns the controls. Both controls feed the
 * same combined draft, so they can be changed independently or together.
 */
import { solarDirections } from '../../data/profileOptions'
import { FIELD_BOUNDS } from '../../constants/validation'
import type { ProfileData } from '../../types/profile'
import { WhatIfStepperRow } from './WhatIfStepperRow'

type Props = {
  profile: ProfileData
  panelCountDraft: string
  directionDraft: ProfileData['solarDirection']
  panelDelta?: number | null
  directionDelta?: number | null
  onPanelCountDraft: (value: string) => void
  onDirectionDraft: (value: ProfileData['solarDirection']) => void
}

/**
 * WhatIfSolarTab
 */
export function WhatIfSolarTab({
  profile,
  panelCountDraft,
  directionDraft,
  panelDelta = null,
  directionDelta = null,
  onPanelCountDraft,
  onDirectionDraft,
}: Props) {
  if (profile.hasSolar !== 'yes') {
    return <p className="whatif-note">Turn on solar in your profile to preview panel or direction changes.</p>
  }

  const directionChanged = directionDraft !== profile.solarDirection
  const directionChip =
    directionChanged && directionDelta != null && Math.abs(directionDelta) >= 1 ? (
      <b className={`whatif-dchip ${directionDelta > 0 ? 'is-up' : 'is-down'}`} title="This change on its own">
        {directionDelta > 0 ? '+' : '−'}${Math.round(Math.abs(directionDelta)).toLocaleString('en-AU')}
      </b>
    ) : null

  return (
    <>
      <WhatIfStepperRow
        label="Panels"
        saved={profile.panelCount}
        draft={panelCountDraft}
        min={FIELD_BOUNDS.panelCount.min}
        max={FIELD_BOUNDS.panelCount.max}
        startAt={FIELD_BOUNDS.panelCount.example}
        deltaAud={panelDelta}
        onDraft={onPanelCountDraft}
      />
      <div className={`whatif-row whatif-row--block${directionChanged ? ' is-changed' : ''}`}>
        <div className="whatif-lab">
          <span>Roof faces</span>
          <small className="whatif-meta">
            {directionChanged
              ? `was ${solarDirections.find((row) => row.value === profile.solarDirection)?.label ?? '—'}`
              : ''}
            {directionChip}
          </small>
        </div>
        <div className="whatif-seg" role="group" aria-label="Roof faces">
          {solarDirections.map((row) => (
            <button
              key={row.value}
              type="button"
              aria-pressed={directionDraft === row.value}
              onClick={() => onDirectionDraft(row.value)}
            >
              {row.label}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
