/**
 * Field groups for the improve-setup form, shared by the form steps and the
 * improve-flow profile so both ask the same questions the same way.
 */
import { useId } from 'react'
import { FIELD_BOUNDS } from '../../constants/validation'
import { batteryModels, NOT_SURE_VALUE } from '../../data/profileOptions'
import { VPP_NOT_LISTED, type ImproveStepId } from '../../lib/improveProfile'
import type { FieldErrors } from '../../lib/validateProfile'
import type { ProfileData } from '../../types/profile'
import { DirectionGrid } from '../ui/DirectionGrid'
import { SearchSelect } from '../ui/SearchSelect'
import { StepperField } from '../ui/StepperField'
import { TextField } from '../ui/TextField'

type Props = {
  step: ImproveStepId
  profile: ProfileData
  errors: FieldErrors
  onChange: <K extends keyof ProfileData>(field: K, value: ProfileData[K]) => void
  /** VPP brands from the Plans list; empty while plans load, which shows a text box instead. */
  vppOptions?: string[]
}

/**
 * ImproveFields
 * @param props.step - Which group of questions to show
 * @param props.onChange - Patch a single profile field
 * @returns The inputs for that group; optional ones say so in their label
 */
export function ImproveFields({ step, profile, errors, onChange, vppOptions = [] }: Props) {
  const id = useId()

  if (step === 'home') {
    return (
      <>
        {vppOptions.length ? (
          <SearchSelect
            label="Which VPP have you joined?"
            hint="Select your VPP from the list."
            placeholder="Search VPP providers"
            heading="VPP providers"
            options={vppOptions}
            extraOptions={[VPP_NOT_LISTED]}
            value={profile.vppProvider}
            onChange={(value) => onChange('vppProvider', value)}
            error={errors.vppProvider}
            info="The company that runs your virtual power plant. If yours is missing, choose Not listed."
          />
        ) : (
          <TextField
            id={`${id}-vpp`}
            label="Which VPP have you joined?"
            placeholder="e.g. Tesla Energy Plan"
            autoComplete="off"
            maxLength={60}
            value={profile.vppProvider}
            onChange={(event) => onChange('vppProvider', event.target.value)}
            error={errors.vppProvider}
            info="The company that runs your virtual power plant. It may be different from your electricity retailer."
          />
        )}
        <TextField
          id={`${id}-postcode`}
          label="What is your postcode?"
          placeholder="e.g. 3101"
          inputMode="numeric"
          numeric="integer"
          maxLength={FIELD_BOUNDS.postcodeLength}
          value={profile.postcode}
          onChange={(event) => onChange('postcode', event.target.value)}
          error={errors.postcode}
        />
        <TextField
          id={`${id}-people`}
          label="How many people live in your house?"
          placeholder={`e.g. ${FIELD_BOUNDS.people.example}`}
          inputMode="numeric"
          numeric="integer"
          suffix="people"
          value={profile.people}
          onChange={(event) => onChange('people', event.target.value)}
          error={errors.people}
        />
        <TextField
          id={`${id}-kwh`}
          label="Average electricity usage for a month"
          placeholder={`e.g. ${FIELD_BOUNDS.monthlyKwh.example}`}
          inputMode="decimal"
          numeric="decimal"
          suffix="kWh"
          value={profile.monthlyKwh}
          onChange={(event) => onChange('monthlyKwh', event.target.value)}
          error={errors.monthlyKwh}
          info="Shown on your electricity bill as usage or consumption. Divide a quarterly figure by 3."
        />
        <TextField
          id={`${id}-bill`}
          label="Average monthly electricity bill (optional)"
          placeholder="Enter amount"
          inputMode="decimal"
          numeric="decimal"
          prefix="$"
          suffix="AUD"
          value={profile.monthlyBill}
          onChange={(event) => onChange('monthlyBill', event.target.value)}
          error={errors.monthlyBill}
        />
      </>
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
