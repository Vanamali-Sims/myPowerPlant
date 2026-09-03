/**
 * Wizard step: bills, peak period, usage level, and work-from-home.
 */
import type { ProfileData } from '../../types/profile'
import type { FieldErrors } from '../../lib/validateProfile'
import {
  peakPeriodOptions,
  usageLevelOptions,
  yesNoNotSure,
} from '../../data/profileOptions'
import { BarsIcon, BoltIcon, LeafIcon, PlugIcon } from '../ui/icons'
import { ChoiceList } from '../ui/ChoiceList'
import { RadioList } from '../ui/RadioList'
import { SegmentedToggle } from '../ui/SegmentedToggle'
import { TextField } from '../ui/TextField'

type Props = {
  profile: ProfileData
  errors: FieldErrors
  onChange: <K extends keyof ProfileData>(field: K, value: ProfileData[K]) => void
}

/**
 * HouseholdUsageStep
 * @param props.profile - Current answers
 * @param props.onChange - Patch a single profile field
 * @returns JSX.Element
 *
 * Usage-level icons are mapped here because they are presentation, not data.
 * The bill field accepts digits (and a decimal) only so letters cannot be typed first.
 */
export function HouseholdUsageStep({ profile, errors, onChange }: Props) {
  return (
    <>
      <TextField
        label="Average monthly electricity bill?"
        placeholder="Enter amount"
        inputMode="decimal"
        numeric="decimal"
        prefix="$"
        suffix="AUD"
        value={profile.monthlyBill}
        onChange={(event) => onChange('monthlyBill', event.target.value)}
        error={errors.monthlyBill}
      />
      <RadioList
        label="What time of day do you use the most energy?"
        value={profile.peakPeriod}
        options={peakPeriodOptions}
        onChange={(value) => onChange('peakPeriod', value)}
        error={errors.peakPeriod}
      />
      <ChoiceList
        label="How would you describe your energy usage?"
        value={profile.usageLevel}
        onChange={(value) => onChange('usageLevel', value)}
        error={errors.usageLevel}
        options={usageLevelOptions.map((option) => ({
          ...option,
          icon:
            option.value === 'low' ? (
              <LeafIcon />
            ) : option.value === 'moderate' ? (
              <PlugIcon />
            ) : option.value === 'high' ? (
              <BarsIcon />
            ) : (
              <BoltIcon />
            ),
        }))}
      />
      <SegmentedToggle
        label="Does anyone work or study from home regularly?"
        value={profile.wfh}
        options={yesNoNotSure}
        onChange={(value) => onChange('wfh', value)}
        error={errors.wfh}
      />
    </>
  )
}
