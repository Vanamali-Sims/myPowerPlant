/**
 * Persona-specific app-rail navigation.
 *
 * Matt: home, dashboard, recommendations, profile.
 * Rain: home, what if, goals, reminders, profile.
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
export type RainNavId = 'home' | 'whatif' | 'goals' | 'reminders' | 'profile'
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
    id: 'home',
    label: 'Home',
    icon: HomeIcon,
    unavailableMessage: 'Home isn’t set up yet.',
  },
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
  {
    id: 'profile',
    label: 'Profile',
    icon: ProfileIcon,
    unavailableMessage: 'Your profile appears once you add your setup.',
  },
]

/** @deprecated Use MATT_NAV or RAIN_NAV — kept for any legacy imports */
export const NAV = MATT_NAV
