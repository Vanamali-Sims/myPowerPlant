/**
 * Wizard step: current electricity retailer.
 */
import type { ProfileData } from '../../types/profile'
import type { FieldErrors } from '../../lib/validateProfile'
import { energyProviders, NOT_SURE_VALUE, OTHER_VALUE } from '../../data/profileOptions'
import { Button } from '../ui/Button'
import { Callout } from '../ui/Callout'
import { LockIcon, QuestionIcon } from '../ui/icons'
import { SearchSelect } from '../ui/SearchSelect'

type Props = {
  profile: ProfileData
  errors: FieldErrors
  onChange: <K extends keyof ProfileData>(field: K, value: ProfileData[K]) => void
}

/**
 * EnergyProviderStep
 * @param props.profile - Current answers
 * @param props.onChange - Patch a single profile field
 * @returns JSX.Element
 *
 * Other and Not sure are first-class extra options, not free text only.
 * The retailer is used to mark a “current” VPP plan on the dashboard.
 */
export function EnergyProviderStep({ profile, errors, onChange }: Props) {
  return (
    <>
      <SearchSelect
        label="Who is your current electricity provider?"
        placeholder="Search or select your provider"
        heading="Popular providers"
        options={energyProviders}
        extraOptions={[OTHER_VALUE, NOT_SURE_VALUE]}
        value={profile.provider}
        onChange={(value) => onChange('provider', value)}
        error={errors.provider}
        info="Your current retailer helps us compare VPP offers that fit your setup."
      />
      <Callout
        tone="action"
        icon={<QuestionIcon />}
        title="Not sure?"
        action={
          <Button variant="outline-accent" onClick={() => onChange('provider', NOT_SURE_VALUE)}>
            Not sure
          </Button>
        }
      >
        That’s okay. We’ll use a baseline assumption for your analysis. You can update this
        later.
      </Callout>
      <p className="setup-secure">
        <LockIcon width={14} height={14} />
        Your information is secure and used only to generate your personalised energy insights.
      </p>
    </>
  )
}
