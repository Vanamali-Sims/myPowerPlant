/**
 * Wizard step: battery count, reserve percent, age, and model.
 */
import type { ProfileData } from '../../types/profile'
import type { FieldErrors } from '../../lib/validateProfile'
import { batteryModels, NOT_SURE_VALUE } from '../../data/profileOptions'
import { Callout } from '../ui/Callout'
import { Button } from '../ui/Button'
import { BulbIcon, QuestionIcon } from '../ui/icons'
import { SearchSelect } from '../ui/SearchSelect'
import { StepperField } from '../ui/StepperField'
import { TextField } from '../ui/TextField'

type Props = {
  profile: ProfileData
  errors: FieldErrors
  onChange: <K extends keyof ProfileData>(field: K, value: ProfileData[K]) => void
}

/**
 * BatteryProfileStep
 * @param props.profile - Current answers
 * @param props.onChange - Patch a single profile field
 * @returns JSX.Element
 *
 * Reserve is the share the VPP must not use — the user stays in control.
 * Not sure on model falls back to the Kew baseline capacity later.
 */
export function BatteryProfileStep({ profile, errors, onChange }: Props) {
  return (
    <>
      <StepperField
        label="Number of battery units installed"
        hint="Enter the total number of battery units installed at your property."
        info="Most homes have one battery. Count each installed unit."
        value={profile.batteryUnits}
        onChange={(value) => onChange('batteryUnits', value)}
        error={errors.batteryUnits}
      />
      <TextField
        label="Minimum percentage of battery capacity preferred to keep available"
        hint="This is the minimum battery level you prefer to keep for your own use."
        info="VPPs only use energy above this reserve. You stay in control."
        inputMode="numeric"
        suffix="%"
        value={profile.reservePercent}
        onChange={(event) => onChange('reservePercent', event.target.value)}
        error={errors.reservePercent}
      />
      <Callout tone="accent" icon={<BulbIcon />}>
        Example: Enter 20 to keep at least 20% of your battery capacity.
      </Callout>
      <TextField
        label="Age of battery"
        hint="Enter the approximate age of your battery in years."
        placeholder="e.g. 2"
        inputMode="decimal"
        suffix="years"
        value={profile.batteryAge}
        onChange={(event) => onChange('batteryAge', event.target.value)}
        error={errors.batteryAge}
        info="A newer battery usually holds more usable charge."
      />
      <SearchSelect
        label="Battery model"
        hint="Select your battery model from the list."
        placeholder="Search battery brand & model"
        heading="Popular models"
        options={batteryModels}
        extraOptions={[NOT_SURE_VALUE]}
        value={profile.batteryModel}
        onChange={(value) => onChange('batteryModel', value)}
        error={errors.batteryModel}
        info="If your model is not listed, choose Not sure and we’ll use a baseline."
      />
      <Callout
        tone="action"
        icon={<QuestionIcon />}
        title="Not sure?"
        action={
          <Button variant="outline-accent" onClick={() => onChange('batteryModel', NOT_SURE_VALUE)}>
            Not sure
          </Button>
        }
      >
        That’s okay. You can select Not sure and we’ll use a baseline value for your estimate.
        You can update this later.
      </Callout>
    </>
  )
}
