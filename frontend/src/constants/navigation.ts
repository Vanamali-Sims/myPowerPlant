/**
 * Persona-specific app-rail navigation.
 *
 * Matt: home, dashboard, recommendations, profile.
 * Rain: what if, goals, reminders (shown on tool pages, not on the hub).
 */
import {
  BellIcon,
  BulbIcon,
  DashboardIcon,
  HomeIcon,
  ProfileIcon,
  ShieldIcon,
  TargetIcon,
} from '../components/ui/icons'

export type MattNavId = 'home' | 'dashboard' | 'recommendations' | 'profile'
export type RainNavId = 'whatif' | 'goals' | 'reminders'
export type AppNavId = MattNavId | RainNavId

export type NavItem = {
  id: AppNavId
  label: string
  icon: typeof ProfileIcon
  unavailableMessage: string
}

export const MATT_NAV: NavItem[] = [
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
    unavailableMessage: 'Complete setup for a personalised dashboard.',
  },
  {
    id: 'recommendations',
    label: 'Plans',
    icon: ShieldIcon,
    unavailableMessage: 'Complete setup for personalised plan matches.',
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: ProfileIcon,
    unavailableMessage: 'Complete setup to view your profile.',
  },
]

export const RAIN_NAV: NavItem[] = [
  {
    id: 'whatif',
    label: 'What if',
    icon: BulbIcon,
    unavailableMessage: 'What if needs your household answers on this device.',
  },
  {
    id: 'goals',
    label: 'Goals',
    icon: TargetIcon,
    unavailableMessage: 'Goals need your household answers on this device.',
  },
  {
    id: 'reminders',
    label: 'Reminders',
    icon: BellIcon,
    unavailableMessage: 'Reminders need your household answers on this device.',
  },
]

/** @deprecated Use MATT_NAV or RAIN_NAV — kept for any legacy imports */
export const NAV = MATT_NAV
