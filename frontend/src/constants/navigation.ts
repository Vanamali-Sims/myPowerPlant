/**
 * Logged-in app-rail navigation.
 *
 * Profile stays locked until a profile is saved; Home, Dashboard,
 * Reminders, and Goals are always available. Unavailable copy lives here so AppShell
 * stays presentational.
 */
import { BellIcon, DashboardIcon, HomeIcon, ProfileIcon, TargetIcon } from '../components/ui/icons'

export type AppNavId = 'profile' | 'home' | 'dashboard' | 'reminders' | 'goals'

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
    unavailableMessage: 'Dashboard is available. Complete setup for a personalised report.',
  },
  {
    id: 'reminders',
    label: 'Reminders',
    icon: BellIcon,
    unavailableMessage: 'Reminders are available. Complete setup for personalised days.',
  },
  {
    id: 'goals',
    label: 'Goals',
    icon: TargetIcon,
    unavailableMessage: 'Goals are available. Complete setup to set your own goals.',
  },
]
