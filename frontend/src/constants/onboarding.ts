export const VPP_INTRO = {
  eyebrow: 'Virtual Power Plants',
  title: 'Your solar, battery, and neighbourhood — connected',
  lede:
    'A VPP shares spare battery power when the grid needs it. You stay in control and can earn credits instead of only feeding in at a low rate.',
  skip: 'Skip',
  continue: 'Continue',
}

export const PATH_CHOICE = {
  title: 'How can we help today?',
  lede: 'Pick the path that fits where you are with a Virtual Power Plant.',
  explore: {
    title: 'Get started with VPPs',
    body: 'See if a VPP is worth it, model your home, and compare Victorian plans.',
    action: 'Explore getting started',
  },
  improve: {
    title: 'Let’s improve my VPP setup',
    body: 'Try battery settings, set savings goals, and get reminders before peak events.',
    action: 'Improve my setup',
  },
}

export const RAIN_HUB = {
  title: 'Great! What would you like to do?',
  cards: {
    whatif: {
      title: 'What if',
      body: 'Try different battery settings and see how your VPP earnings would change.',
      action: 'Explore scenarios',
    },
    goals: {
      title: 'Goal',
      body: 'Set a savings target and track how close your VPP credits get you.',
      action: 'Set a goal',
    },
    reminders: {
      title: 'Reminder',
      body: 'Get a nudge before peak events, bill dates, or a settings check-in.',
      action: 'Add a reminder',
    },
  },
}

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
