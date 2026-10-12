import { HOME_VPP_ONBOARDING } from '../../constants/improve'
import type { MethodologyBundle } from '../../lib/methodologyApi'
import type { FieldErrors } from '../../lib/validateProfile'
import type { ProfileData } from '../../types/profile'
import { FormHeader } from '../ui/FormHeader'
import { HomeVppBillCard } from './HomeVppBillCard'
import { HomeVppDetailsCard } from './HomeVppDetailsCard'

type Props = {
  profile: ProfileData
  bundle: MethodologyBundle | null
  errors: FieldErrors
  onChange: (profile: ProfileData) => void
  onPatch: <K extends keyof ProfileData>(field: K, value: ProfileData[K]) => void
  onLogoClick: () => void
  /** Checks a field as focus leaves it. */
  onFieldBlur?: () => void
}

export function HomeVppOnboarding({ profile, bundle, errors, onChange, onPatch, onLogoClick, onFieldBlur }: Props) {
  return (
    <div className="home-vpp" onBlur={onFieldBlur}>
      <FormHeader
        postcode={profile.postcode}
        onPostcodeChange={(postcode) => onPatch('postcode', postcode)}
        onLogoClick={onLogoClick}
        postcodeError={errors.postcode}
      />
      <header className="home-vpp__intro">
        <h1 className="home-vpp__title">{HOME_VPP_ONBOARDING.pageTitle}</h1>
        <p className="home-vpp__lede">{HOME_VPP_ONBOARDING.pageLede}</p>
      </header>
      <div className="home-vpp__grid">
        <HomeVppBillCard profile={profile} uploadError={errors.billUpload} onChange={onChange} />
        <HomeVppDetailsCard profile={profile} bundle={bundle} errors={errors} onChange={onPatch} />
      </div>
    </div>
  )
}
