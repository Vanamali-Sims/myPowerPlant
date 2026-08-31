import type { ReactNode } from 'react'
import { BoltIcon, DashboardIcon, HomeIcon, ProfileIcon } from '../ui/icons'
import { Popover } from '../ui/Popover'
import { locationFromPostcode } from '../../data/profileOptions'
import { useTransientPopover } from '../../lib/useTransientPopover'
import './AppShell.css'

export type AppNavId = 'profile' | 'home' | 'dashboard'

type Props = {
  active: AppNavId | null
  postcode: string
  hasProfile: boolean
  onNavigate: (id: AppNavId) => void
  onLogoClick: () => void
  children: ReactNode
}

const NAV: {
  id: AppNavId
  label: string
  icon: typeof ProfileIcon
  unavailableMessage: string
}[] = [
  {
    id: 'profile',
    label: 'Profile',
    icon: ProfileIcon,
    unavailableMessage: 'Complete setup to view your profile.',
  },
  {
    id: 'home',
    label: 'Home',
    icon: HomeIcon,
    unavailableMessage: 'Home isn’t set up yet.',
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: DashboardIcon,
    unavailableMessage: 'Complete setup to view your dashboard.',
  },
]

export function AppShell({
  active,
  postcode,
  hasProfile,
  onNavigate,
  onLogoClick,
  children,
}: Props) {
  const place = locationFromPostcode(postcode)
  const [openPopover, setOpenPopover] = useTransientPopover()

  function isAvailable(id: AppNavId) {
    if (id === 'home') return true
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
          <span className="brand__mark">
            <BoltIcon width={14} height={14} />
          </span>
          <span className="brand__word">MyPowerPlant</span>
        </button>
        <nav className="app-rail__nav">
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
          {place || 'VIC'}
        </span>
      </aside>
      <div className="app-shell__main">{children}</div>
    </div>
  )
}
