import type { ReactNode } from 'react'
import { BoltIcon, DashboardIcon, HomeIcon, ProfileIcon } from '../ui/icons'
import { locationFromPostcode } from '../../data/profileOptions'
import './AppShell.css'

export type AppNavId = 'profile' | 'home' | 'dashboard'

type Props = {
  active: AppNavId | null
  postcode: string
  onNavigate: (id: AppNavId) => void
  children: ReactNode
}

const NAV: { id: AppNavId; label: string; icon: typeof ProfileIcon; available: boolean }[] = [
  { id: 'profile', label: 'Profile', icon: ProfileIcon, available: true },
  { id: 'home', label: 'Home', icon: HomeIcon, available: false },
  { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon, available: false },
]

export function AppShell({ active, postcode, onNavigate, children }: Props) {
  const place = locationFromPostcode(postcode)

  return (
    <div className="app-shell">
      <aside className="app-rail" aria-label="App">
        <div className="brand brand--inverse">
          <span className="brand__mark">
            <BoltIcon width={14} height={14} />
          </span>
          <span className="brand__word">MyPowerPlant</span>
        </div>
        <nav className="app-rail__nav">
          {NAV.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                className={`app-rail__item${active === item.id ? ' is-active' : ''}`}
                onClick={() => onNavigate(item.id)}
                aria-current={active === item.id ? 'page' : undefined}
                title={item.available ? item.label : `${item.label} — coming soon`}
              >
                <Icon />
                {item.label}
              </button>
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
