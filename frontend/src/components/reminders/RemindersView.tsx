/**
 * Get Reminded tab: choose a reminder period and see recommended days to
 * join a discharge event or opt out of one, based on the solar forecast.
 */
import { useState } from 'react'
import { DEFAULT_EVENT_TYPE, DEFAULT_REMINDER_PERIOD_DAYS, EVENT_TYPE_OPTIONS, REMINDER_PERIOD_OPTIONS } from '../../constants'
import { locationFromPostcode } from '../../data/profileOptions'
import type { ProfileData } from '../../types/profile'
import type { EventType } from '../../types/reminders'
import { Callout } from '../ui/Callout'
import { AlertIcon, BoltIcon } from '../ui/icons'
import { LocationControl } from '../ui/LocationControl'
import { SegmentedToggle } from '../ui/SegmentedToggle'
import { SelectField } from '../ui/SelectField'

/** Shown alongside the forecast when no postcode is set, matching the solar forecast fallback. */
const DEFAULT_LOCATION_PLACE = 'Melbourne, VIC'

type Props = {
  profile: ProfileData
  onLogoClick: () => void
}

/**
 * RemindersView
 * @param props.profile - Saved household profile, used to seed the starting location
 * @param props.onLogoClick - Return to the home screen from the wordmark
 * @returns JSX.Element
 *
 * The reminder period and event type chosen here drive which days show up
 * in the discharge and opt-out lists once those are wired up. The postcode
 * starts from the saved profile but can be changed on this page alone, to
 * preview a different location's forecast without editing the profile.
 */
export function RemindersView({ profile, onLogoClick }: Props) {
  const [reminderPeriodDays, setReminderPeriodDays] = useState(DEFAULT_REMINDER_PERIOD_DAYS)
  const [eventType, setEventType] = useState<EventType>(DEFAULT_EVENT_TYPE)
  const [postcode, setPostcode] = useState(profile.postcode)

  const usingDefaultLocation = postcode.trim() === ''
  const place = locationFromPostcode(postcode) || DEFAULT_LOCATION_PLACE

  return (
    <div className="reminders">
      <header className="reminders__top">
        <button
          type="button"
          className="brand brand--button brand--desktop-hidden"
          onClick={onLogoClick}
          aria-label="MyPowerPlant home"
        >
          <span className="brand__mark">
            <BoltIcon width={14} height={14} />
          </span>
          MyPowerPlant
        </button>
        <LocationControl postcode={postcode} onPostcodeChange={setPostcode} />
      </header>

      <div className="reminders__intro">
        <h1>Get Reminded</h1>
        <p>
          Pick how far ahead to look, then switch between discharge and opt-out events to see
          the days that fit your solar forecast.
        </p>
      </div>

      {usingDefaultLocation ? (
        <Callout tone="neutral" icon={<AlertIcon />} title={`Using a default location: ${place}`}>
          No postcode is set yet, so this forecast uses a default location. Enter a postcode
          above to preview your own area, or set it in your profile to use it everywhere.
        </Callout>
      ) : null}

      <div className="reminders__controls">
        <div className="reminders__period">
          <SelectField
            label="Reminder period"
            value={reminderPeriodDays}
            options={REMINDER_PERIOD_OPTIONS}
            onChange={setReminderPeriodDays}
          />
        </div>
        <SegmentedToggle
          label="Alert type"
          value={eventType}
          options={EVENT_TYPE_OPTIONS}
          onChange={setEventType}
        />
      </div>
    </div>
  )
}
