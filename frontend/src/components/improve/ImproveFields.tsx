/**
 * Field groups for the improve-setup form, shared by the form steps and the
 * improve-flow profile so both ask the same questions the same way.
 */
import { useId } from 'react'
import { FIELD_BOUNDS } from '../../constants/validation'
import { batteryModels, NOT_SURE_VALUE } from '../../data/profileOptions'
import type { ImproveStepId } from '../../lib/improveProfile'
import type { FieldErrors } from '../../lib/validateProfile'
import type { ProfileData } from '../../types/profile'
import { BillUploadSection } from './BillUploadSection'
import { DirectionGrid } from '../ui/DirectionGrid'
import { SearchSelect } from '../ui/SearchSelect'
import { StepperField } from '../ui/StepperField'
import { TextField } from '../ui/TextField'

type Props = {
  step: ImproveStepId
  profile: ProfileData
  errors: FieldErrors
  onChange: <K extends keyof ProfileData>(field: K, value: ProfileData[K]) => void
  /** Replace the whole profile after a bill upload merge. */
  onApplyProfile: (profile: ProfileData) => void
}

/**
 * ImproveFields
 * @param props.step - Which group of questions to show
 * @param props.onChange - Patch a single profile field
 * @returns The inputs for that group; optional ones say so in their label
 */
export function ImproveFields({ step, profile, errors, onChange, onApplyProfile }: Props) {
  const id = useId()

  if (step === 'home') {
    return (
      <BillUploadSection
        profile={profile}
        uploadError={errors.billUpload}
        onChange={onApplyProfile}
      />
    )
  }

  if (step === 'solar') {
    return (
      <>
        <TextField
          id={`${id}-panels`}
          label="How many solar panels do you have?"
          placeholder="Enter number"
          inputMode="numeric"
          numeric="integer"
          suffix="panels"
          value={profile.panelCount}
          onChange={(event) => onChange('panelCount', event.target.value)}
          error={errors.panelCount}
          info="Count the panels on your roof, not the inverter size."
        />
        <DirectionGrid
          label="What direction do your solar panels face?"
          value={profile.solarDirection}
          onChange={(value) => onChange('solarDirection', value)}
          error={errors.solarDirection}
          info="North-facing panels usually generate more in Australia. If you are unsure, choose Not sure."
        />
        <TextField
          id={`${id}-watts`}
          label="Average power rating of each panel (optional)"
          placeholder="Enter power rating"
          inputMode="numeric"
          numeric="integer"
          suffix="W (watts)"
          value={profile.panelWatts}
          onChange={(event) => onChange('panelWatts', event.target.value)}
          error={errors.panelWatts}
          info="The watt rating on each panel, often 300–400 W. Leave it empty to use a typical rating."
        />
      </>
    )
  }

  return (
    <>
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
      <TextField
        id={`${id}-reserve`}
        label="What percentage of your battery would you like to keep in reserve?"
        hint="Your VPP only uses energy above this level."
        inputMode="numeric"
        numeric="integer"
        suffix="%"
        value={profile.reservePercent}
        onChange={(event) => onChange('reservePercent', event.target.value)}
        error={errors.reservePercent}
      />
      <StepperField
        label="Number of battery units installed (optional)"
        hint="Most homes have one battery."
        value={profile.batteryUnits}
        onChange={(value) => onChange('batteryUnits', value)}
        error={errors.batteryUnits}
      />
    </>
  )
}
