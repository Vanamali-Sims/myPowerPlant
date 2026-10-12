/**
 * Persona-specific app-rail navigation.
 *
 * Matt: home, dashboard, recommendations, path; profile is docked at the rail foot.
 * Rain: home, what if, goals, reminders, path; profile is docked at the rail foot.
 */
import { FLOW_CONTROLS } from './onboarding'
import {
  BellIcon,
  BulbIcon,
  DashboardIcon,
  HomeIcon,
  ProfileIcon,
  ResetIcon,
  ShieldIcon,
  TargetIcon,
} from '../components/ui/icons'

export type MattNavId = 'home' | 'dashboard' | 'recommendations' | 'path'
export type RainNavId = 'home' | 'whatif' | 'goals' | 'reminders' | 'path'
export type AppNavId = MattNavId | RainNavId | 'profile'

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
    id: 'path',
    label: FLOW_CONTROLS.railLabel,
    icon: ResetIcon,
    unavailableMessage: 'Path controls are not available here.',
  },
]

export const PROFILE_RAIL_ITEM: NavItem = {
  id: 'profile',
  label: 'Profile',
  icon: ProfileIcon,
  unavailableMessage: 'Complete setup to view your profile.',
}

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
    id: 'path',
    label: FLOW_CONTROLS.railLabel,
    icon: ResetIcon,
    unavailableMessage: 'Path controls are not available here.',
  },
]

/** Docked at the bottom of the rail (above location), separate from {@link MATT_NAV} / {@link RAIN_NAV}. */
export const RAIN_PROFILE_RAIL_ITEM: NavItem = {
  id: 'profile',
  label: 'Profile',
  icon: ProfileIcon,
  unavailableMessage: 'Your profile appears once you add your setup.',
}

/** @deprecated Use MATT_NAV or RAIN_NAV — kept for any legacy imports */
export const NAV = MATT_NAV
