import type { ProfileData } from '../../types/profile'
import type { FieldErrors } from '../../lib/validateProfile'
import { yesNo } from '../../data/profileOptions'
import { Callout } from '../ui/Callout'
import { DirectionGrid } from '../ui/DirectionGrid'
import { QuestionIcon } from '../ui/icons'
import { SegmentedToggle } from '../ui/SegmentedToggle'
import { TextField } from '../ui/TextField'

type Props = {
  profile: ProfileData
  errors: FieldErrors
  onChange: <K extends keyof ProfileData>(field: K, value: ProfileData[K]) => void
}

export function SolarDetailsStep({ profile, errors, onChange }: Props) {
  const hasSolar = profile.hasSolar === 'yes'
  const showBaseline = hasSolar && profile.solarDirection === 'not_sure'

  return (
    <>
      <SegmentedToggle
        label="Do you have solar?"
        value={profile.hasSolar}
        options={yesNo}
        onChange={(value) => onChange('hasSolar', value)}
        error={errors.hasSolar}
      />
      {hasSolar ? (
        <>
          <DirectionGrid
            label="What direction do your solar panels face?"
            value={profile.solarDirection}
            onChange={(value) => onChange('solarDirection', value)}
            error={errors.solarDirection}
            info="North-facing panels usually generate more in Australia. If you are unsure, choose Not sure."
          />
          <TextField
            label="How many solar panels do you have?"
            placeholder="Enter number"
            inputMode="numeric"
            suffix="panels"
            value={profile.panelCount}
            onChange={(event) => onChange('panelCount', event.target.value)}
            error={errors.panelCount}
            info="Count the panels on your roof, not the inverter size."
          />
          <TextField
            label="What is the average power rating of each panel?"
            placeholder="Enter power rating"
            inputMode="numeric"
            suffix="W (watts)"
            value={profile.panelWatts}
            onChange={(event) => onChange('panelWatts', event.target.value)}
            error={errors.panelWatts}
            hint={errors.panelWatts ? 'Example: 300' : undefined}
            info="This is the watt rating on each panel, often 300–400 W."
          />
          {showBaseline ? (
            <Callout tone="neutral" icon={<QuestionIcon />} title="Not sure">
              We’ll use a baseline value for your estimate. You can update this later.
            </Callout>
          ) : null}
        </>
      ) : null}
    </>
  )
}
