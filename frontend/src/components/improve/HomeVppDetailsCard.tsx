import { useId } from 'react'
import { FIELD_BOUNDS } from '../../constants/validation'
import { HOME_VPP_ONBOARDING, VPP_NOT_JOINED_SELECT } from '../../constants/improve'
import { batteryModels, NOT_SURE_VALUE } from '../../data/profileOptions'
import { VPP_NOT_LISTED, vppProviderOptions } from '../../lib/improveProfile'
import type { MethodologyBundle } from '../../lib/methodologyApi'
import type { FieldErrors } from '../../lib/validateProfile'
import type { ProfileData, SolarDirection } from '../../types/profile'
import { SearchSelect } from '../ui/SearchSelect'

const DIRECTION_OPTIONS: { value: SolarDirection | ''; label: string }[] = [
  { value: '', label: 'Select a direction' },
  { value: 'N', label: 'North' },
  { value: 'NE', label: 'North-east' },
  { value: 'E', label: 'East' },
  { value: 'W', label: 'West' },
  { value: 'NW', label: 'North-west' },
  { value: 'S', label: 'South' },
  { value: 'not_sure', label: "I'm not sure, use a baseline" },
]

type Props = {
  profile: ProfileData
  bundle: MethodologyBundle | null
  errors: FieldErrors
  onChange: <K extends keyof ProfileData>(field: K, value: ProfileData[K]) => void
}

export function HomeVppDetailsCard({ profile, bundle, errors, onChange }: Props) {
  const id = useId()
  const vppOptions = vppProviderOptions(bundle)

  return (
    <section className="home-vpp-card home-vpp-details" aria-labelledby="home-vpp-details-title">
      <h2 id="home-vpp-details-title" className="home-vpp-card__title">
        {HOME_VPP_ONBOARDING.detailsTitle}
      </h2>
      <p className="home-vpp-card__lede">{HOME_VPP_ONBOARDING.detailsLede}</p>

      <div className="home-vpp-details__grid">
        <div className="home-vpp-field">
          <label className="home-vpp-field__label" htmlFor={`${id}-panels`}>
            Panel count
          </label>
          <input
            id={`${id}-panels`}
            className="home-vpp-field__control"
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="e.g. 16"
            value={profile.panelCount}
            onChange={(event) => onChange('panelCount', event.target.value)}
            aria-invalid={Boolean(errors.panelCount)}
            aria-describedby={errors.panelCount ? `${id}-panels-error` : undefined}
          />
          {errors.panelCount ? (
            <p id={`${id}-panels-error`} className="home-vpp-field__error" role="alert">
              {errors.panelCount}
            </p>
          ) : null}
        </div>

        <div className="home-vpp-field">
          <label className="home-vpp-field__label" htmlFor={`${id}-direction`}>
            Panel direction
          </label>
          <select
            id={`${id}-direction`}
            className="home-vpp-field__control"
            value={profile.solarDirection}
            onChange={(event) => onChange('solarDirection', event.target.value as SolarDirection | '')}
            aria-invalid={Boolean(errors.solarDirection)}
            aria-describedby={errors.solarDirection ? `${id}-direction-error` : undefined}
          >
            {DIRECTION_OPTIONS.map((option) => (
              <option key={option.label} value={option.value} disabled={option.value === ''}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.solarDirection ? (
            <p id={`${id}-direction-error`} className="home-vpp-field__error" role="alert">
              {errors.solarDirection}
            </p>
          ) : null}
        </div>

        <div className="home-vpp-field home-vpp-field--full">
          <SearchSelect
            label="Battery model"
            placeholder="Search battery models"
            heading="Battery models"
            options={batteryModels}
            extraOptions={[NOT_SURE_VALUE]}
            value={profile.batteryModel}
            onChange={(value) => onChange('batteryModel', value)}
            error={errors.batteryModel}
          />
          <p className="home-vpp-details__helper">
            Can&apos;t find yours?{' '}
            <button
              type="button"
              className="home-vpp-details__link"
              onClick={() => onChange('batteryModel', NOT_SURE_VALUE)}
            >
              Use a baseline battery
            </button>
          </p>
        </div>

        <div className="home-vpp-field">
          <label className="home-vpp-field__label" htmlFor={`${id}-people`}>
            People in home
          </label>
          <input
            id={`${id}-people`}
            className="home-vpp-field__control"
            type="number"
            min={FIELD_BOUNDS.people.min}
            max={FIELD_BOUNDS.people.max}
            inputMode="numeric"
            value={profile.people}
            onChange={(event) => onChange('people', event.target.value)}
            aria-invalid={Boolean(errors.people)}
            aria-describedby={errors.people ? `${id}-people-error` : undefined}
          />
          {errors.people ? (
            <p id={`${id}-people-error`} className="home-vpp-field__error" role="alert">
              {errors.people}
            </p>
          ) : null}
        </div>

        <div className="home-vpp-field">
          <label className="home-vpp-field__label" htmlFor={`${id}-vpp`}>
            Which VPP joined
          </label>
          <select
            id={`${id}-vpp`}
            className="home-vpp-field__control"
            value={
              profile.vppProvider === '' && !profile.fieldSources.vppProvider
                ? ''
                : profile.vppProvider === ''
                  ? VPP_NOT_JOINED_SELECT
                  : profile.vppProvider
            }
            onChange={(event) => {
              const next = event.target.value
              onChange(
                'vppProvider',
                next === VPP_NOT_JOINED_SELECT ? '' : next,
              )
            }}
            aria-invalid={Boolean(errors.vppProvider)}
            aria-describedby={errors.vppProvider ? `${id}-vpp-error` : undefined}
          >
            <option value="" disabled>{HOME_VPP_ONBOARDING.vppPlaceholder}</option>
            <option value={VPP_NOT_JOINED_SELECT}>{HOME_VPP_ONBOARDING.vppNotJoined}</option>
            {vppOptions.map((brand) => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
            <option value={VPP_NOT_LISTED}>{HOME_VPP_ONBOARDING.vppNotListed}</option>
            <option value={NOT_SURE_VALUE}>{HOME_VPP_ONBOARDING.vppBaseline}</option>
          </select>
          {errors.vppProvider ? (
            <p id={`${id}-vpp-error`} className="home-vpp-field__error" role="alert">
              {errors.vppProvider}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
