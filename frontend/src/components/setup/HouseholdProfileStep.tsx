import type { ProfileData } from '../../types/profile'
import type { FieldErrors } from '../../lib/validateProfile'
import {
  coolingOptions,
  dryerUseOptions,
  fridgeOptions,
  heatingOptions,
  peopleOptions,
  roomOptions,
  yesNoNotSure,
} from '../../data/profileOptions'
import { Callout } from '../ui/Callout'
import { PinIcon, QuestionIcon } from '../ui/icons'
import { SegmentedToggle } from '../ui/SegmentedToggle'
import { SelectField } from '../ui/SelectField'
import { TextField } from '../ui/TextField'

type Props = {
  profile: ProfileData
  errors: FieldErrors
  onChange: <K extends keyof ProfileData>(field: K, value: ProfileData[K]) => void
}

export function HouseholdProfileStep({ profile, errors, onChange }: Props) {
  return (
    <>
      <TextField
        label="What is your postcode?"
        placeholder="Enter postcode"
        inputMode="numeric"
        maxLength={4}
        value={profile.postcode}
        onChange={(event) => onChange('postcode', event.target.value)}
        error={errors.postcode}
        hint={errors.postcode ? 'Example: 3000' : undefined}
        icon={<PinIcon />}
        autoComplete="postal-code"
      />
      <SelectField
        label="How many people live in your house?"
        value={profile.people}
        options={peopleOptions}
        onChange={(value) => onChange('people', value)}
        error={errors.people}
      />
      <SelectField
        label="How many rooms (total)?"
        value={profile.rooms}
        options={roomOptions}
        onChange={(value) => onChange('rooms', value)}
        error={errors.rooms}
      />
      <SegmentedToggle
        label="Do you have gas?"
        value={profile.gas}
        options={yesNoNotSure}
        onChange={(value) => onChange('gas', value)}
        error={errors.gas}
      />
      <SelectField
        label="How many refrigerators do you own?"
        value={profile.refrigerators}
        options={fridgeOptions}
        onChange={(value) => onChange('refrigerators', value)}
        error={errors.refrigerators}
      />
      <SegmentedToggle
        label="Do you have a clothes dryer?"
        value={profile.dryer}
        options={yesNoNotSure}
        onChange={(value) => onChange('dryer', value)}
        error={errors.dryer}
      />
      {profile.dryer === 'yes' ? (
        <div>
          <p className="ui-field__label">
            How many times do you use your clothes dryer on a typical:
          </p>
          <div className="setup-split">
            <SelectField
              label="Week (Monday–Friday)"
              value={profile.dryerWeek}
              options={dryerUseOptions}
              onChange={(value) => onChange('dryerWeek', value)}
              error={errors.dryerWeek}
            />
            <SelectField
              label="Weekend (Saturday–Sunday)"
              value={profile.dryerWeekend}
              options={dryerUseOptions}
              onChange={(value) => onChange('dryerWeekend', value)}
              error={errors.dryerWeekend}
            />
          </div>
        </div>
      ) : null}
      <SelectField
        label="How do you heat your home?"
        value={profile.heating}
        options={heatingOptions}
        onChange={(value) => onChange('heating', value)}
        error={errors.heating}
        info="If you’re not sure, choose Not sure and we’ll use a baseline estimate."
      />
      {profile.heating === 'not_sure' ? (
        <Callout tone="neutral" icon={<QuestionIcon />} title="Not sure">
          If you’re not sure, we’ll use a baseline option to estimate your energy usage. You
          can update this anytime.
        </Callout>
      ) : null}
      <SelectField
        label="How do you cool your home?"
        value={profile.cooling}
        options={coolingOptions}
        onChange={(value) => onChange('cooling', value)}
        error={errors.cooling}
      />
      <SegmentedToggle
        label="Do you have hot water systems?"
        value={profile.hotWater}
        options={yesNoNotSure}
        onChange={(value) => onChange('hotWater', value)}
        error={errors.hotWater}
      />
    </>
  )
}
