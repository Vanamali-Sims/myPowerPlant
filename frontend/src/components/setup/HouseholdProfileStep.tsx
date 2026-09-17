/**
 * Wizard step: people, rooms, appliances, heating, and cooling.
 */
import { FIELD_BOUNDS } from '../../constants/validation'
import type { ProfileData } from '../../types/profile'
import type { FieldErrors } from '../../lib/validateProfile'
import { coolingOptions, heatingOptions, yesNoNotSure } from '../../data/profileOptions'
import { Callout } from '../ui/Callout'
import { FieldGroup } from '../ui/FieldGroup'
import { PinIcon, QuestionIcon } from '../ui/icons'
import { SegmentedToggle } from '../ui/SegmentedToggle'
import { SelectField } from '../ui/SelectField'
import { TextField } from '../ui/TextField'

type Props = {
  profile: ProfileData
  errors: FieldErrors
  onChange: <K extends keyof ProfileData>(field: K, value: ProfileData[K]) => void
}

/**
 * HouseholdProfileStep
 * @param props.profile - Current answers
 * @param props.onChange - Patch a single profile field
 * @returns JSX.Element
 *
 * Dryer frequency fields only appear when the household has a dryer.
 * Postcode length is taken from FIELD_BOUNDS so it matches validation.
 */
export function HouseholdProfileStep({ profile, errors, onChange }: Props) {
  return (
    <>
      <FieldGroup title="Your home" hint="Sets the baseline we compare everything else against.">

        <TextField
          label="What is your postcode?"
          placeholder="Enter postcode"
          inputMode="numeric"
          maxLength={FIELD_BOUNDS.postcodeLength}
          value={profile.postcode}
          onChange={(event) => onChange('postcode', event.target.value)}
          error={errors.postcode}
          hint={errors.postcode ? 'Example: 3000' : undefined}
          icon={<PinIcon />}
          autoComplete="postal-code"
        />
        <TextField
          label="How many people live in your house?"
          placeholder="Enter number"
          inputMode="numeric"
          suffix="people"
          value={profile.people}
          onChange={(event) => onChange('people', event.target.value)}
          error={errors.people}
          hint={errors.people ? `Example: ${FIELD_BOUNDS.people.example}` : undefined}
        />
        <TextField
          label="How many rooms (total)?"
          placeholder="Enter number"
          inputMode="numeric"
          suffix="rooms"
          value={profile.rooms}
          onChange={(event) => onChange('rooms', event.target.value)}
          error={errors.rooms}
          hint={errors.rooms ? `Example: ${FIELD_BOUNDS.rooms.example}` : undefined}
        />
      </FieldGroup>

      <FieldGroup title="Appliances" hint="The things that actually draw the power.">
  <SegmentedToggle
          label="Do you have gas?"
          value={profile.gas}
          options={yesNoNotSure}
          onChange={(value) => onChange('gas', value)}
          error={errors.gas}
        />
        <TextField
          label="How many refrigerators do you own?"
          placeholder="Enter number"
          inputMode="numeric"
          suffix="fridges"
          value={profile.refrigerators}
          onChange={(event) => onChange('refrigerators', event.target.value)}
          error={errors.refrigerators}
          hint={errors.refrigerators ? `Enter 0 if you have none. Example: ${FIELD_BOUNDS.refrigerators.example}` : undefined}
        />
        <TextField
          label="How many hours a week is your TV on?"
          placeholder="Enter number"
          inputMode="numeric"
          suffix="hrs / week"
          value={profile.tvHoursPerWeek}
          onChange={(event) => onChange('tvHoursPerWeek', event.target.value)}
          error={errors.tvHoursPerWeek}
          info="Leave blank to use a typical estimate. Enter 0 if you don’t have a TV."
        />
        <TextField
          label="How many washing-machine loads do you run a week?"
          placeholder="Enter number"
          inputMode="numeric"
          suffix="loads / week"
          value={profile.washerCyclesPerWeek}
          onChange={(event) => onChange('washerCyclesPerWeek', event.target.value)}
          error={errors.washerCyclesPerWeek}
          info="Leave blank to use a typical estimate. Enter 0 if you don’t have a washing machine."
        />
        <TextField
          label="How many dishwasher cycles do you run a week?"
          placeholder="Enter number"
          inputMode="numeric"
          suffix="cycles / week"
          value={profile.dishwasherCyclesPerWeek}
          onChange={(event) => onChange('dishwasherCyclesPerWeek', event.target.value)}
          error={errors.dishwasherCyclesPerWeek}
          info="Leave blank to use a typical estimate. Enter 0 if you don’t have a dishwasher."
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
              <TextField
                label="Week (Monday–Friday)"
                placeholder="Enter number"
                inputMode="numeric"
                suffix="uses"
                value={profile.dryerWeek}
                onChange={(event) => onChange('dryerWeek', event.target.value)}
                error={errors.dryerWeek}
                hint={errors.dryerWeek ? `Example: ${FIELD_BOUNDS.dryerWeek.example}` : undefined}
              />
              <TextField
                label="Weekend (Saturday–Sunday)"
                placeholder="Enter number"
                inputMode="numeric"
                suffix="uses"
                value={profile.dryerWeekend}
                onChange={(event) => onChange('dryerWeekend', event.target.value)}
                error={errors.dryerWeekend}
                hint={errors.dryerWeekend ? `Example: ${FIELD_BOUNDS.dryerWeekend.example}` : undefined}
              />
            </div>
          </div>
        ) : null}
      </FieldGroup>

      <FieldGroup title="Heating and cooling" hint="Usually the largest single swing in a Victorian bill.">
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
        {profile.cooling === 'air_conditioning' ? (
          <TextField
            label="How many hours a week is your air conditioner used?"
            placeholder="Enter number"
            inputMode="numeric"
            suffix="hrs / week"
            value={profile.airconHoursPerWeek}
            onChange={(event) => onChange('airconHoursPerWeek', event.target.value)}
            error={errors.airconHoursPerWeek}
            info="Leave blank to use a typical estimate."
          />
        ) : null}
        <SegmentedToggle
          label="Do you have hot water systems?"
          value={profile.hotWater}
          options={yesNoNotSure}
          onChange={(value) => onChange('hotWater', value)}
          error={errors.hotWater}
        />
      </FieldGroup>
    </>
  )
}
