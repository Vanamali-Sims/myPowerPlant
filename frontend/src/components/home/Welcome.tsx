/**
 * Marketing home page: hero, VPP explainer carousel, and article links.
 */
import { WELCOME_ARTICLES, type VppExplainerHousehold } from '../../constants'
import { Button } from '../ui/Button'
import { HeroHouse } from './HeroHouse'
import { VppExplainerCarousel } from './VppExplainerCarousel'
import { BoltIcon } from '../ui/icons'

type Props = {
  hasProfile: boolean
  /** Weekly shortfall when modelled; omit/null keeps hypothetical carousel copy. */
  householdData?: VppExplainerHousehold | null
  onGetStarted: () => void
  onViewDashboard: () => void
  onLogoClick: () => void
}

/**
 * Welcome
 * @param props.hasProfile - Whether this device already has a saved profile
 * @param props.onGetStarted - Open the setup wizard
 * @returns JSX.Element
 *
 * Copy and feature lists come from constants/welcome so this file is layout.
 * The primary button switches to “View dashboard” after setup is complete.
 */
export function Welcome({
  hasProfile,
  householdData = null,
  onGetStarted,
  onViewDashboard,
  onLogoClick,
}: Props) {
  return (
    <div className="welcome">
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

      <section className="band band--deep">
        <div className="band__inner hero">
          <div className="hero__copy">
            <p className="eyebrow">For homes with solar and battery</p>
            <h1>See if a Virtual Power Plant is worth it for your home.</h1>
            <p className="hero__lede">
              A Virtual Power Plant, or VPP, links your home battery and solar with other homes
              nearby. MyPowerPlant looks at your actual home — not averages — and gives you one
              clear, ongoing recommendation: whether joining makes sense, and how.
            </p>
            <div className="hero__actions">
              {hasProfile ? (
                <Button variant="primary" onClick={onViewDashboard}>
                  View dashboard
                </Button>
              ) : (
                <Button variant="primary" onClick={onGetStarted}>
                  Get Started
                </Button>
              )}
            </div>
          </div>
          <div className="hero__art" aria-hidden="true">
            <HeroHouse />
          </div>
        </div>
      </section>

      <section className="band">
        <div className="band__inner">
          <VppExplainerCarousel
            isOnboarded={hasProfile}
            householdData={householdData}
            onFillDetails={onGetStarted}
            onSeeNumbers={onViewDashboard}
          />
        </div>
      </section>

      <section className="band">
        <div className="band__inner">
          <div className="card-grid">
            {WELCOME_ARTICLES.map((article) => (
              <a
                key={article.title}
                className="article-card"
                href={article.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="status-pill status-pill--soon">{article.tag}</span>
                <h3>{article.title}</h3>
                <p>{article.excerpt}</p>
                <span className="article-card__source">{article.source} ↗</span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
