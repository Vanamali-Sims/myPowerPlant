import { useMemo, useState } from 'react'
import { RECOMMENDATIONS_PAGE } from '../../constants/onboarding'
import { energyProviders, locationFromPostcode } from '../../data/profileOptions'
import type { MethodologyBundle } from '../../lib/methodologyApi'
import type { ProfileData } from '../../types/profile'
import { PlansMasterDetail } from './PlansMasterDetail'
import { Button } from '../ui/Button'
import { Callout } from '../ui/Callout'
import { SelectField } from '../ui/SelectField'
import { AlertIcon, BoltIcon } from '../ui/icons'

type Props = {
  profile: ProfileData
  hasProfile: boolean
  bundle: MethodologyBundle | null
  loadError: string
  onStartSetup: () => void
  onEnrollProvider: (provider: string) => void
  onLogoClick: () => void
}

/**
 * Screen 2.4 — VPP plan recommendations and enrollment into the improve journey.
 */
export function RecommendationsView({
  profile,
  hasProfile,
  bundle,
  loadError,
  onStartSetup,
  onEnrollProvider,
  onLogoClick,
}: Props) {
  const [selectedProvider, setSelectedProvider] = useState(profile.provider || '')

  const place = locationFromPostcode(profile.postcode)

  const providerOptions = useMemo(
    () => energyProviders.map((label) => ({ value: label, label })),
    [],
  )

  function enrollFromSelect() {
    if (!selectedProvider) return
    onEnrollProvider(selectedProvider)
  }

  return (
    <div className="recommendations">
      <header className="recommendations__top">
        <button
          type="button"
          className="brand brand--button brand--desktop-hidden"
          onClick={onLogoClick}
          aria-label="MyPowerPlant home"
        >
          <span className="brand__mark">
            <BoltIcon width={14} height={14} />
          </span>
          MyPowerPlant
        </button>
      </header>

      {hasProfile && loadError ? (
        <p className="app-notice" role="status">
          Plan data could not be loaded. {loadError}
        </p>
      ) : null}

      <header className="recommendations__intro">
        <p className="eyebrow">
          {RECOMMENDATIONS_PAGE.eyebrow}
          {hasProfile && place ? ` · ${place}` : ''}
        </p>
        <h1>{RECOMMENDATIONS_PAGE.title}</h1>
        <p className="recommendations__lede">
          {hasProfile ? RECOMMENDATIONS_PAGE.lede : RECOMMENDATIONS_PAGE.ledeNoProfile}
        </p>
      </header>

      {!hasProfile ? (
        <Callout
          tone="action"
          icon={<AlertIcon />}
          title={RECOMMENDATIONS_PAGE.emptyTitle}
          action={
            <Button variant="primary" onClick={onStartSetup}>
              {RECOMMENDATIONS_PAGE.emptyAction}
            </Button>
          }
        >
          {RECOMMENDATIONS_PAGE.emptyBody}
        </Callout>
      ) : null}

      {hasProfile && bundle ? (
        <PlansMasterDetail
          profile={profile}
          plans={bundle.vppSuggestionPlans}
          batteryModels={bundle.batteryModels}
          onEnrollProvider={onEnrollProvider}
        />
      ) : null}

      {hasProfile && !bundle && !loadError ? (
        <p className="app-notice" role="status">Loading VPP plans…</p>
      ) : null}

      {hasProfile ? (
        <section
          id={RECOMMENDATIONS_PAGE.enrollSectionId}
          className="recommendations__enroll"
          aria-labelledby="recommendations-enroll-title"
          tabIndex={-1}
        >
          <p className="eyebrow">{RECOMMENDATIONS_PAGE.enrollEyebrow}</p>
          <h2 id="recommendations-enroll-title">{RECOMMENDATIONS_PAGE.enrollTitle}</h2>
          <p className="recommendations__enroll-lede">{RECOMMENDATIONS_PAGE.enrollBody}</p>
          <div className="recommendations__enroll-row">
            <SelectField
              label="Your VPP retailer"
              value={selectedProvider}
              onChange={setSelectedProvider}
              options={providerOptions}
              placeholder="Choose a provider"
            />
            <Button variant="primary" type="button" onClick={enrollFromSelect} disabled={!selectedProvider}>
              {RECOMMENDATIONS_PAGE.enrollAction}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  )
}
