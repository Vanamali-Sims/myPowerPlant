/** Screen 1 intro captions, in the order they play. */
export const INTRO_STEPS = [
  {
    tag: 'Solar',
    title: ['Every rooftop', 'catches the sun.'],
    body: 'Panels make the most energy in the middle of the day.',
  },
  {
    tag: 'Storage',
    title: ['Your battery keeps', 'what you don’t use.'],
    body: 'Instead of exporting it for cents, store it for later.',
  },
  {
    tag: 'Connection',
    title: ['Thousands of batteries.', 'One power plant.'],
    body: 'Linked together, homes can act like a power station.',
  },
  {
    tag: 'Reward',
    title: ['Share at peak times.', 'Get paid back.'],
    body: 'When the grid needs power most, your energy is worth more.',
  },
] as const

export const INTRO_COPY = {
  place: 'MyPowerPlant · Victoria',
  skipHint: 'Click anywhere to skip',
  brand: 'MyPowerPlant',
  tagline: 'Share, receive, save.',
  eventLabel: 'Peak demand · 6:30 pm',
  eventValue: '+$12.40',
  eventNote: 'paid to you',
} as const

/** Screen 2: "Which describes you?" choice. */
export const PATH_CHOICE = {
  title: 'Which describes you?',
  replay: 'Replay intro',
  explore: {
    eyebrow: 'New to VPPs',
    title: ['Get started', 'with VPPs'],
    body: 'See if a VPP is worth it, model your home and simulate savings, and get recommended Victorian plans.',
    action: 'Explore getting started',
  },
  improve: {
    eyebrow: 'Already have a battery',
    title: ['Improve my', 'VPP setup'],
    body: 'Try get reminders, goal tracker, and what if scenarios before peak events.',
    action: 'Improve my setup',
  },
} as const

export const FLOW_CONTROLS = {
  railLabel: 'Path',
  title: 'Path & data on this device',
  lede: 'Your answers and goals stay in this browser only. You can change path or wipe everything here.',
  switchToExplore: 'Switch to exploring VPPs',
  switchToImprove: 'Switch to improving my VPP setup',
  resetAll: 'Reset everything on this device',
  resetConfirmTitle: 'Reset all data on this device?',
  resetConfirmBody:
    'This clears your household profile, goals, and history on this device, then starts you from the beginning. We do not keep a server copy.',
  resetConfirmAction: 'Reset all data',
}

export const RECOMMENDATIONS_PAGE = {
  eyebrow: 'VPP plans',
  title: 'VPP plans that can help you achieve this saving',
  lede:
    'These Victorian plans fit this battery. Pick one on the left to see the detail, or stay on your top match.',
  listHeading: (count: number) =>
    `${count} plan${count === 1 ? '' : 's'} fit this battery`,
  notListedFootnote:
    "'Not listed' means the plan's published details don't state it. Check the provider's terms before you switch.",
  ledeNoProfile:
    'Tell us about your home, solar, and battery first — then we can rank plans that fit you.',
  emptyTitle: 'Set up your household profile',
  emptyBody:
    'Plan cards and matches use your saved answers on this device. Complete the questionnaire to see which VPP offers suit your home.',
  emptyAction: 'Start questionnaire',
  enrollEyebrow: 'Already joined?',
  enrollTitle: 'I started participating in a VPP',
  enrollBody:
    'Tell us which retailer runs your VPP so we can switch you to tools for improving your setup.',
  enrollAction: 'Continue as a VPP participant',
  planEnrollAction: 'I’m on this plan',
  planDifferentAction: 'I’ve chosen a different plan',
  enrollSectionId: 'recommendations-vpp-enroll',
}
