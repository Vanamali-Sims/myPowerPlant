/**
 * Navigation and timeframe replies for chat actions (Epic 6.5.2).
 */
import type { AppNavId } from '../../constants/navigation'
import type { Timeframe } from '../kpis'
import type { ChatNavigateTarget } from './matchChat'

const VIEW_LABEL: Record<AppNavId | 'setup', string> = {
  home: 'Home',
  setup: 'Setup',
  profile: 'Profile',
  dashboard: 'Dashboard',
  whatif: 'What if',
  reminders: 'Reminders',
}

const TIMEFRAME_LABEL: Record<Timeframe, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  fortnightly: 'Fortnightly',
}

export function navigateReply(target: ChatNavigateTarget): string {
  return `Opening ${VIEW_LABEL[target]}.`
}

export function timeframeReply(timeframe: Timeframe): string {
  return `Timeframe is now ${TIMEFRAME_LABEL[timeframe]}. Dashboard cards and my next figures will use it.`
}

export const RESET_PROMPT =
  'This clears every answer on this device and returns you to Setup. Confirm to reset, or send another message to leave your profile as it is.'
