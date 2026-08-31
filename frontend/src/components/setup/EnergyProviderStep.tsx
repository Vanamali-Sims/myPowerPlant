import type { ProfileData } from '../../types/profile'
import type { FieldErrors } from '../../lib/validateProfile'
import { energyProviders } from '../../data/profileOptions'
import { Button } from '../ui/Button'
import { Callout } from '../ui/Callout'
import { LockIcon, QuestionIcon } from '../ui/icons'
import { SearchSelect } from '../ui/SearchSelect'

type Props = {
  profile: ProfileData
  errors: FieldErrors
  onChange: <K extends keyof ProfileData>(field: K, value: ProfileData[K]) => void
}

export function EnergyProviderStep({ profile, errors, onChange }: Props) {
  return (
    <>
      <SearchSelect
        label="Who is your current electricity provider?"
        placeholder="Search or select your provider"
        heading="Popular providers"
        options={energyProviders}
        extraOptions={['Other', 'Not sure']}
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
          <Button variant="outline-accent" onClick={() => onChange('provider', 'Not sure')}>
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
