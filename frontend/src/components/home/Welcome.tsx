import { Button } from '../ui/Button'
import { Popover } from '../ui/Popover'
import {
  BatteryIcon,
  BoltIcon,
  CheckIcon,
  DashboardIcon,
  HomeIcon,
  PeopleIcon,
  ShieldIcon,
  SunIcon,
} from '../ui/icons'
import { useTransientPopover } from '../../lib/useTransientPopover'
import './Welcome.css'

type Status = 'available' | 'soon'

type FeatureCard = {
  icon: typeof SunIcon
  title: string
  description: string
  status: Status
}

const FEATURES: FeatureCard[] = [
  {
    icon: SunIcon,
    title: 'Your solar & battery',
    description:
      'Tell us about your solar panels and battery — the make, the size, how you use them.',
    status: 'available',
  },
  {
    icon: BoltIcon,
    title: 'Your household usage',
    description:
      'Add details from your own electricity bills so your recommendation reflects how your home actually uses power.',
    status: 'available',
  },
  {
    icon: DashboardIcon,
    title: 'Your ongoing recommendation',
    description:
      'See whether joining a VPP makes sense for your home, and how — kept up to date as your setup changes.',
    status: 'soon',
  },
]

type ImpactPoint = {
  title: string
  description: string
  estimate?: boolean
}

const IMPACT_POINTS: ImpactPoint[] = [
  {
    title: 'Solar & battery',
    description:
      'Matt has a rooftop solar system paired with a home battery — the kind of setup MyPowerPlant is built around.',
  },
  {
    title: 'Battery reserve',
    description:
      'He keeps a portion of his battery charge in reserve at all times, balancing backup power with VPP participation.',
  },
  {
    title: 'Potential to save',
    description:
      'Depending on his usage and battery size, joining a VPP could lower Matt’s running costs. This isn’t a guaranteed figure — it depends on your own home.',
    estimate: true,
  },
]

const STEPS = [
  {
    title: 'Tell us about your home',
    description:
      'Answer a short set of questions about your household, usage, solar and battery.',
  },
  {
    title: 'We look at your numbers',
    description:
      'MyPowerPlant checks your setup against real assessment criteria, not guesswork.',
  },
  {
    title: 'Get your recommendation',
    description:
      'See whether joining a VPP makes sense for you, and how — updated as things change.',
  },
]

const ARTICLES = [
  {
    tag: 'Basics',
    title: 'How does a virtual power plant work?',
    excerpt:
      'A plain-language explainer from Solar Victoria on what a VPP is and how home batteries take part.',
    source: 'solar.vic.gov.au',
    href: 'https://www.solar.vic.gov.au/how-does-virtual-power-plant-work',
  },
  {
    tag: 'Solar & battery',
    title: 'Is your battery virtual power plant ready?',
    excerpt:
      'Solar Victoria on what makes a home battery eligible to join a VPP, and what to check first.',
    source: 'solar.vic.gov.au',
    href: 'https://www.solar.vic.gov.au/virtual-power-plant-ready',
  },
  {
    tag: 'Providers & schemes',
    title: 'Virtual power plants explained',
    excerpt:
      'The Clean Energy Regulator on how VPPs fit into the small-scale renewable energy scheme.',
    source: 'cer.gov.au',
    href: 'https://cer.gov.au/schemes/renewable-energy-target/small-scale-renewable-energy-scheme/small-scale-renewable-energy-systems/solar-batteries/virtual-power-plants',
  },
]

type Props = {
  onGetStarted: () => void
  onLogoClick: () => void
}

export function Welcome({ onGetStarted, onLogoClick }: Props) {
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
              <Button variant="primary" onClick={onGetStarted}>
                Get Started
              </Button>
              <span className="popover-anchor">
                <Button variant="ghost" onClick={() => setOpenPopover('learn-more')}>
                  Learn how VPPs actually work
                </Button>
                <Popover
                  open={openPopover === 'learn-more'}
                  message="A dedicated guide is coming soon — see the linked articles below in the meantime."
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
                message="The full features list is coming soon."
                placement="bottom-end"
              />
            </span>
          </div>
          <div className="card-grid">
            {FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <div key={feature.title} className="feature-card">
                  <span className="feature-card__icon">
                    <Icon />
                  </span>
                  <h3>{feature.title}</h3>
                  <p className="feature-card__desc">{feature.description}</p>
                  <span className={`status-pill status-pill--${feature.status}`}>
                    {feature.status === 'available' ? 'Available now' : 'Coming soon'}
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
            {STEPS.map((step, index) => (
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
            {IMPACT_POINTS.map((point) => (
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
            {ARTICLES.map((article) => (
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
