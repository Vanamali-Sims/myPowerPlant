/**
 * Improve-setup home: hero with the household's setup, then the three features.
 * Same layout and styles as the explore home page.
 */
import {
  IMPROVE_FEATURES,
  IMPROVE_FEATURES_HEADING,
  IMPROVE_HERO,
  IMPROVE_SETUP_CARD,
  IMPROVE_TRY_IT,
  type ImproveFeatureId,
} from '../../constants/improve'
import { displayValue } from '../../lib/formatProfile'
import { hasImproveAnswers, isImproveReady } from '../../lib/improveProfile'
import type { ProfileData } from '../../types/profile'
import { Button } from '../ui/Button'
import { BellIcon, BoltIcon, BulbIcon, TargetIcon } from '../ui/icons'

type Props = {
  profile: ProfileData
  /** Opens the access-features form. */
  onOpenForm: () => void
  /** Opens a feature, or the form first when the setup is not complete. */
  onOpenFeature: (id: ImproveFeatureId) => void
  onLogoClick: () => void
}

const FEATURE_ICONS: Record<ImproveFeatureId, typeof BulbIcon> = {
  whatif: BulbIcon,
  goals: TargetIcon,
  reminders: BellIcon,
}

const SETUP_ROWS: { field: keyof ProfileData; label: string }[] = [
  { field: 'vppProvider', label: 'VPP' },
  { field: 'batteryModel', label: 'Battery' },
  { field: 'reservePercent', label: 'Reserve' },
  { field: 'panelCount', label: 'Solar panels' },
  { field: 'monthlyKwh', label: 'Monthly usage' },
]

function rowValue(profile: ProfileData, field: keyof ProfileData): string | null {
  const raw = profile[field]
  if (typeof raw === 'string' && !raw.trim()) return null
  return displayValue(profile, field)
}

/**
 * ImproveHome
 * @param props.profile - Shared answers, shown in the setup card
 * @returns JSX.Element
 *
 * The hero button reads "Access features" until some answers exist, then
 * "Complete profile" while any required one is missing. Once the setup is
 * complete it scrolls to the feature cards instead of opening the form.
 */
export function ImproveHome({ profile, onOpenForm, onOpenFeature, onLogoClick }: Props) {
  const ready = isImproveReady(profile)
  const partial = !ready && hasImproveAnswers(profile)

  function heroAction() {
    if (ready) {
      document.getElementById('improve-features-title')?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    onOpenForm()
  }

  return (
    <div className="welcome improve-home">
      <button
        type="button"
        className="brand brand--button brand--desktop-hidden welcome__brand"
        onClick={onLogoClick}
        aria-label="MyPowerPlant home"
      >
        <span className="brand__mark">
          <BoltIcon width={14} height={14} />
        </span>
        MyPowerPlant
      </button>

      <section className="band welcome-hero" aria-labelledby="improve-hero-title">
        <div className="band__inner welcome-hero__inner">
          <div className="welcome-hero__copy">
            <p className="eyebrow welcome__eyebrow">{IMPROVE_HERO.eyebrow}</p>
            <h1 id="improve-hero-title" className="welcome-hero__title">
              {IMPROVE_HERO.titleLead} <em>{IMPROVE_HERO.titleEmphasis}</em>
            </h1>
            <p className="welcome-hero__lede">{IMPROVE_HERO.lede}</p>
            <Button variant="primary" className="welcome__cta" onClick={heroAction}>
              {partial ? IMPROVE_HERO.completeProfile : IMPROVE_HERO.accessFeatures}
            </Button>
          </div>

          <section className="welcome-stat improve-setup-card" aria-labelledby="improve-setup-card-title">
            <h2 id="improve-setup-card-title" className="welcome-stat__headline improve-setup-card__title">
              {IMPROVE_SETUP_CARD.title}
            </h2>
            <dl className="improve-setup-card__rows">
              {SETUP_ROWS.map((row) => {
                const value = rowValue(profile, row.field)
                return (
                  <div key={row.field} className="improve-setup-card__row">
                    <dt>{row.label}</dt>
                    <dd className={value ? '' : 'is-missing'}>{value ?? IMPROVE_SETUP_CARD.missing}</dd>
                  </div>
                )
              })}
            </dl>
            <p className="welcome-stat__source">
              {ready ? IMPROVE_SETUP_CARD.readyNote : IMPROVE_SETUP_CARD.incompleteNote}
            </p>
          </section>
        </div>
      </section>

      <section className="band welcome-wins" aria-labelledby="improve-features-title">
        <div className="band__inner">
          <p className="eyebrow welcome__eyebrow welcome-wins__eyebrow">{IMPROVE_FEATURES_HEADING.eyebrow}</p>
          <h2 id="improve-features-title" className="welcome-wins__title" tabIndex={-1}>
            {IMPROVE_FEATURES_HEADING.title}
          </h2>
          <ul className="welcome-wins__list improve-features">
            {IMPROVE_FEATURES.map((feature) => {
              const Icon = FEATURE_ICONS[feature.id]
              return (
                <li key={feature.id} className="welcome-win improve-feature">
                  <span className="welcome-win__icon">
                    <Icon width={20} height={20} />
                  </span>
                  <p className="eyebrow welcome-win__eyebrow">{feature.eyebrow}</p>
                  <h3 className="welcome-win__title">{feature.title}</h3>
                  <p className="welcome-win__body">{feature.body}</p>
                  <Button
                    variant="primary"
                    className="welcome__cta improve-feature__cta"
                    aria-label={`${IMPROVE_TRY_IT}: ${feature.eyebrow}`}
                    onClick={() => onOpenFeature(feature.id)}
                  >
                    {IMPROVE_TRY_IT}
                  </Button>
                </li>
              )
            })}
          </ul>
        </div>
      </section>
    </div>
  )
}
