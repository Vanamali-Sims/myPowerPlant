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
  onPanelCountDraft,
  onDirectionDraft,
}: Props) {
  if (profile.hasSolar !== 'yes') {
    return (
      <div className="chat-actions__block">
        <h3 className="chat-actions__label">Solar panels &amp; direction</h3>
        <p className="chat-panel__hint">
          Turn on solar in your profile to preview panel or direction changes.
        </p>
      </div>
    )
  }

  return (
    <div className="chat-whatif-household">
      <div className="chat-whatif-household__body">
        <WhatIfStepperRow
          label="Solar panels"
          saved={profile.panelCount}
          draft={panelCountDraft}
          min={FIELD_BOUNDS.panelCount.min}
          max={FIELD_BOUNDS.panelCount.max}
          startAt={FIELD_BOUNDS.panelCount.example}
          onDraft={onPanelCountDraft}
        />
      </div>
      <div className="chat-actions__block">
        <h3 className="chat-actions__label">Panel direction</h3>
        <p className="chat-panel__hint">
          Now: {solarDirections.find((row) => row.value === profile.solarDirection)?.label ?? 'not set'}
        </p>
        <div className="chat-actions__row">
          <select
            className="chat-whatif__select"
            value={directionDraft}
            onChange={(event) =>
              onDirectionDraft(event.target.value as ProfileData['solarDirection'])
            }
          >
            <option value="">Direction</option>
            {solarDirections.map((row) => (
              <option key={row.value} value={row.value}>
                {row.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
