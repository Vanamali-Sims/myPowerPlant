/**
 * Logged-in app-rail navigation.
 *
 * Profile and Dashboard stay locked until a profile is saved; Home is always
 * available. Unavailable copy lives here so AppShell stays presentational.
 */
import { DashboardIcon, HomeIcon, ProfileIcon } from '../components/ui/icons'

export type AppNavId = 'profile' | 'home' | 'dashboard'

export type NavItem = {
  id: AppNavId
  label: string
  icon: typeof ProfileIcon
  unavailableMessage: string
}

export const NAV: NavItem[] = [
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
