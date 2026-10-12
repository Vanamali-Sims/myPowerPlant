/**
 * Marketing home page: hero with the savings comparison, three reasons to
 * join a VPP, and a closing call to action.
 */
import {
  WELCOME_CLOSING,
  WELCOME_HERO,
  WELCOME_SAVINGS_STAT,
  WELCOME_WINS,
  WELCOME_WINS_HEADING,
  type WelcomeWin,
} from '../../constants'
import { Button } from '../ui/Button'
import { BoltIcon, CoinIcon, SunIcon, SwapIcon } from '../ui/icons'

type Props = {
  hasProfile: boolean
  onGetStarted: () => void
  onViewDashboard: () => void
  onLogoClick: () => void
}

/** The tallest bar fills three quarters of the track, leaving room for its value above. */
const MAX_BAR_PERCENT = Math.max(...WELCOME_SAVINGS_STAT.bars.map((bar) => bar.percent))

const WIN_ICONS: Record<WelcomeWin['id'], typeof SunIcon> = {
  savings: CoinIcon,
  grid: SwapIcon,
  renewables: SunIcon,
}

/**
 * Welcome
 * @param props.hasProfile - Whether this device already has a saved profile
 * @param props.onGetStarted - Open the setup wizard
 * @param props.onViewDashboard - Open the dashboard once a profile exists
 * @returns JSX.Element
 *
 * Copy comes from constants/welcome so this file is layout. "Simulate my
 * savings" starts setup, or opens the dashboard once setup is complete.
 */
export function Welcome({ hasProfile, onGetStarted, onViewDashboard, onLogoClick }: Props) {
  const simulate = hasProfile ? onViewDashboard : onGetStarted

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

      <section className="band welcome-hero" aria-labelledby="welcome-hero-title">
        <div className="band__inner welcome-hero__inner">
          <div className="welcome-hero__copy">
            <p className="eyebrow welcome__eyebrow">{WELCOME_HERO.eyebrow}</p>
            <h1 id="welcome-hero-title" className="welcome-hero__title" tabIndex={-1}>
              {WELCOME_HERO.titleLead} <em>{WELCOME_HERO.titleEmphasis}</em>
            </h1>
            <p className="welcome-hero__lede">{WELCOME_HERO.lede}</p>
            <Button variant="primary" className="welcome__cta" onClick={simulate}>
              {WELCOME_HERO.cta}
            </Button>
          </div>

          <figure className="welcome-stat">
            <div className="welcome-stat__head">
              <span className="welcome-stat__multiple" aria-hidden="true">
                {WELCOME_SAVINGS_STAT.multiple}
              </span>
              <p className="welcome-stat__headline">
                <span className="visually-hidden">{WELCOME_SAVINGS_STAT.multiple} </span>
                {WELCOME_SAVINGS_STAT.headline}
                <br />
                {WELCOME_SAVINGS_STAT.subline}
              </p>
            </div>
            <ul className="welcome-stat__bars">
              {WELCOME_SAVINGS_STAT.bars.map((bar) => (
                <li key={bar.id} className={`welcome-stat__bar welcome-stat__bar--${bar.id}`}>
                  <span className="welcome-stat__track" aria-hidden="true">
                    <span className="welcome-stat__value">{bar.value}</span>
                    <span
                      className="welcome-stat__fill"
                      style={{ height: `${(bar.percent / MAX_BAR_PERCENT) * 75}%` }}
                    />
                  </span>
                  <span className="welcome-stat__label">
                    {bar.label}
                    <span className="visually-hidden">: {bar.value} saved off a regular bill</span>
                  </span>
                </li>
              ))}
            </ul>
            <figcaption className="welcome-stat__source">{WELCOME_SAVINGS_STAT.source}</figcaption>
          </figure>
        </div>
      </section>

      <section className="band welcome-wins" aria-labelledby="welcome-wins-title">
        <div className="band__inner">
          <p className="eyebrow welcome__eyebrow welcome-wins__eyebrow">{WELCOME_WINS_HEADING.eyebrow}</p>
          <h2 id="welcome-wins-title" className="welcome-wins__title">
            {WELCOME_WINS_HEADING.title}
          </h2>
          <ul className="welcome-wins__list">
            {WELCOME_WINS.map((win) => {
              const Icon = WIN_ICONS[win.id]
              return (
                <li key={win.id} className="welcome-win">
                  <span className="welcome-win__icon">
                    <Icon width={20} height={20} />
                  </span>
                  <p className="eyebrow welcome-win__eyebrow">{win.eyebrow}</p>
                  <h3 className="welcome-win__title">{win.title}</h3>
                  <p className="welcome-win__body">{win.body}</p>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      <section className="band band--deep welcome-closing" aria-labelledby="welcome-closing-title">
        <div className="band__inner welcome-closing__inner">
          <h2 id="welcome-closing-title" className="welcome-closing__title">
            {WELCOME_CLOSING.title}
          </h2>
        </div>
      </section>
    </div>
  )
}
