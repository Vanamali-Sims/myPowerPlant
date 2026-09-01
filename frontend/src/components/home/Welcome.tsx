/**
 * Marketing home page: hero, features, how-it-works, Kew example, and articles.
 */
import {
  FEATURE_STATUS_LABEL,
  HOW_IT_WORKS,
  LEARN_MORE_POPOVER,
  SEE_ALL_POPOVER,
  WELCOME_ARTICLES,
  WELCOME_FEATURES,
  WELCOME_IMPACT_POINTS,
} from '../../constants'
import { useTransientPopover } from '../../lib/useTransientPopover'
import { Button } from '../ui/Button'
import { Popover } from '../ui/Popover'
import {
  BatteryIcon,
  BoltIcon,
  CheckIcon,
  HomeIcon,
  PeopleIcon,
  ShieldIcon,
  SunIcon,
} from '../ui/icons'

type Props = {
  hasProfile: boolean
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
export function Welcome({ hasProfile, onGetStarted, onViewDashboard, onLogoClick }: Props) {
  const [openPopover, setOpenPopover] = useTransientPopover()

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

      <section className="band band--tint">
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
              <span className="popover-anchor">
                <Button variant="ghost" onClick={() => setOpenPopover('learn-more')}>
                  Learn how VPPs actually work
                </Button>
                <Popover
                  open={openPopover === 'learn-more'}
                  message={LEARN_MORE_POPOVER}
                />
              </span>
            </div>
          </div>
          <div className="hero__art" aria-hidden="true">
            <div className="icon-cluster">
              <span className="icon-cluster__main">
                <HomeIcon width={40} height={40} />
              </span>
              <span className="icon-cluster__badge icon-cluster__badge--top">
                <SunIcon width={20} height={20} />
              </span>
              <span className="icon-cluster__badge icon-cluster__badge--bottom">
                <BatteryIcon width={20} height={20} />
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="band__inner">
          <div className="section-head">
            <h2>What MyPowerPlant checks</h2>
            <span className="popover-anchor">
              <Button variant="ghost" onClick={() => setOpenPopover('see-all')}>
                See all
              </Button>
              <Popover
                open={openPopover === 'see-all'}
                message={SEE_ALL_POPOVER}
                placement="bottom-end"
              />
            </span>
          </div>
          <div className="card-grid">
            {WELCOME_FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <div key={feature.title} className="feature-card">
                  <span className="feature-card__icon">
                    <Icon />
                  </span>
                  <h3>{feature.title}</h3>
                  <p className="feature-card__desc">{feature.description}</p>
                  <span className={`status-pill status-pill--${feature.status}`}>
                    {FEATURE_STATUS_LABEL[feature.status]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="band band--tint">
        <div className="band__inner mission">
          <div className="mission__art" aria-hidden="true">
            <div className="icon-cluster">
              <span className="icon-cluster__main">
                <ShieldIcon width={40} height={40} />
              </span>
              <span className="icon-cluster__badge icon-cluster__badge--top">
                <CheckIcon width={20} height={20} />
              </span>
              <span className="icon-cluster__badge icon-cluster__badge--bottom">
                <PeopleIcon width={20} height={20} />
              </span>
            </div>
          </div>
          <div className="mission__copy">
            <h2>Why we built MyPowerPlant</h2>
            <p>
              Most households decide whether to join a VPP based on anecdote, a friend’s
              experience, or a single flashy ad. We think that’s backwards.
            </p>
            <p>
              MyPowerPlant replaces guesswork with evidence — using your actual solar, battery
              and usage to give you a straight answer, and to keep giving you one as things
              change. This isn’t a directory to compare plans. It’s an ongoing, personal
              recommendation for your home.
            </p>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="band__inner">
          <h2 className="steps__heading">How it works</h2>
          <div className="steps">
            {HOW_IT_WORKS.map((step, index) => (
              <div key={step.title} className="step">
                <span className="step__badge">{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band band--tint">
        <div className="band__inner">
          <h2>A worked example: Matt, in Kew VIC</h2>
          <div className="text-points">
            {WELCOME_IMPACT_POINTS.map((point) => (
              <div key={point.title} className="text-point">
                <p className="text-point__title">
                  {point.title}
                  {point.estimate ? (
                    <span className="profile-estimate">Estimate</span>
                  ) : null}
                </p>
                <p className="text-point__desc">{point.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="band__inner">
          <div className="section-head">
            <h2>Learn more</h2>
          </div>
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
