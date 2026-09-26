/**
 * Logged-in chrome: dark icon rail, wordmark, and location pill.
 */
import type { ReactNode } from 'react'
import { DEFAULT_LOCATION_LABEL, NAV, type AppNavId } from '../../constants'
import { locationFromPostcode } from '../../data/profileOptions'
import { useSlidingHighlight } from '../../lib/useSlidingHighlight'
import { useTransientPopover } from '../../lib/useTransientPopover'
import { MyPowerPlantMark } from '../ui/MyPowerPlantMark'
import { Popover } from '../ui/Popover'

export type { AppNavId }

type Props = {
  active: AppNavId | null
  postcode: string
  hasProfile: boolean
  onNavigate: (id: AppNavId) => void
  onLogoClick: () => void
  children: ReactNode
  chat?: ReactNode
}

/**
 * AppShell
 * @param props.active - Which rail item is current, or null during setup
 * @param props.children - The screen rendered in the main column
 * @returns JSX.Element
 *
 * Profile stays locked until a profile is saved.
 * Home, Dashboard, and Reminders are always available so Matt can open VPP
 * Suggestions or get reminders and see the onboarding prompt before
 * completing setup.
 */
export function AppShell({
  active,
  postcode,
  hasProfile,
  onNavigate,
  onLogoClick,
  children,
  chat,
}: Props) {
  const place = locationFromPostcode(postcode)
  const [openPopover, setOpenPopover] = useTransientPopover()
  const { setRef: setNavRef, box: navBox } = useSlidingHighlight(active, '.app-rail__item.is-active')

  function isAvailable(id: AppNavId) {
    if (id === 'home' || id === 'dashboard' || id === 'reminders') return true
    return hasProfile
  }

  function handleClick(item: (typeof NAV)[number]) {
    if (!isAvailable(item.id)) {
      setOpenPopover(item.id)
      return
    }
    setOpenPopover(null)
    onNavigate(item.id)
  }

  return (
    <div className="app-shell">
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
          {NAV.map((item) => {
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
        <span className="app-rail__place">
          <span className="location-pill__dot" />
          {place || DEFAULT_LOCATION_LABEL}
        </span>
      </aside>
      <div className="app-shell__main">
        {children}
        {chat}
      </div>
    </div>
  )
}
