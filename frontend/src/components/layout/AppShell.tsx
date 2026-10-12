/**
 * Logged-in chrome: dark icon rail, wordmark, and location pill.
 */
import type { ReactNode } from 'react'
import { DEFAULT_LOCATION_LABEL, FLOW_CONTROLS, MATT_NAV, RAIN_NAV, type AppNavId } from '../../constants'
import type { UserJourney } from '../../lib/journeyStorage'
import { locationFromPostcode } from '../../data/profileOptions'
import { useSlidingHighlight } from '../../lib/useSlidingHighlight'
import { useTransientPopover } from '../../lib/useTransientPopover'
import { MyPowerPlantMark } from '../ui/MyPowerPlantMark'
import { Popover } from '../ui/Popover'
import { ResetIcon } from '../ui/icons'

export type { AppNavId }

type Props = {
  journey: UserJourney
  active: AppNavId | null
  showRail: boolean
  postcode: string
  hasProfile: boolean
  onNavigate: (id: AppNavId) => void
  onLogoClick: () => void
  onOpenPathControls?: () => void
  children: ReactNode
  chat?: ReactNode
}

/**
 * AppShell
 * @param props.journey - Matt or Rain navigation set
 * @param props.showRail - False on Rain hub (cards only)
 * @returns JSX.Element
 */
export function AppShell({
  journey,
  active,
  showRail,
  postcode,
  hasProfile,
  onNavigate,
  onLogoClick,
  onOpenPathControls,
  children,
  chat,
}: Props) {
  const nav = journey === 'rain' ? RAIN_NAV : MATT_NAV
  const place = locationFromPostcode(postcode)
  const [openPopover, setOpenPopover] = useTransientPopover()
  const { setRef: setNavRef, box: navBox } = useSlidingHighlight(active, '.app-rail__item.is-active')

  function isAvailable(id: AppNavId) {
    // Rain features open the access-features form first when answers are missing.
    if (journey === 'rain') return true
    if (id === 'home' || id === 'dashboard' || id === 'recommendations') return true
    return hasProfile
  }

  function handleClick(item: (typeof nav)[number]) {
    if (!isAvailable(item.id)) {
      setOpenPopover(item.id)
      return
    }
    setOpenPopover(null)
    onNavigate(item.id)
  }

  return (
    <div className={`app-shell${showRail ? '' : ' app-shell--no-rail'}`}>
      {showRail ? (
        <aside className="app-rail" aria-label="App">
          <button
            type="button"
            className="brand brand--inverse brand--button"
            onClick={onLogoClick}
            aria-label="MyPowerPlant home"
          >
            <span className="brand__mark brand__mark--logo">
              <MyPowerPlantMark width={28} height={28} />
            </span>
            <span className="brand__word">MyPowerPlant</span>
          </button>
          <nav ref={setNavRef} className="app-rail__nav">
            <span
              aria-hidden="true"
              className={`app-rail__highlight${navBox.visible ? ' is-visible' : ''}${
                navBox.ready ? ' is-ready' : ''
              }`}
              style={{
                transform: `translate3d(0, ${navBox.top}px, 0)`,
                height: navBox.height,
              }}
            />
            {nav.map((item) => {
              const Icon = item.icon
              const available = isAvailable(item.id)
              return (
                <div key={item.id} className="popover-anchor app-rail__item-wrap">
                  <button
                    type="button"
                    className={`app-rail__item${active === item.id ? ' is-active' : ''}${
                      available ? '' : ' is-unavailable'
                    }`}
                    onClick={() => handleClick(item)}
                    aria-current={active === item.id ? 'page' : undefined}
                    aria-disabled={!available}
                    title={available ? item.label : item.unavailableMessage}
                  >
                    <Icon />
                    {item.label}
                  </button>
                  <Popover
                    open={openPopover === item.id}
                    message={item.unavailableMessage}
                    placement="right"
                  />
                </div>
              )
            })}
          </nav>
          {onOpenPathControls ? (
            <button
              type="button"
              className="app-rail__item app-rail__item--path"
              onClick={onOpenPathControls}
              title={FLOW_CONTROLS.title}
            >
              <ResetIcon width={18} height={18} />
              {FLOW_CONTROLS.railLabel}
            </button>
          ) : null}
          <span className="app-rail__place">
            <span className="location-pill__dot" />
            {place || DEFAULT_LOCATION_LABEL}
          </span>
        </aside>
      ) : null}
      <div className="app-shell__main">
        {children}
        {chat}
      </div>
    </div>
  )
}
