/** Screen 1 intro captions, in the order they play. */
/** Seconds each caption of the explore story stays up. */
export const STORY_SLIDE_SECONDS = 3.5

/**
 * The story was designed at 5.3 s a caption; every scene, caption and
 * progress timing is scaled by this so the drawing stays in step with the words.
 */
export const STORY_SPEED = STORY_SLIDE_SECONDS / 5.3

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
  eventLabel: 'Peak demand · 6:30 pm',
  eventValue: '+$12.40',
  eventNote: 'paid to you',
} as const

/** Screen 1: the brand intro on arrival, before the choice. */
export const BRAND_INTRO = {
  brand: 'MyPowerPlant',
  slogan: 'A platform that helps you get more from your VPP.',
  skipHint: 'Click anywhere to skip',
} as const

/** How long Bolt's centre hello stays up before fading away (first visit only). */
export const BOLT_HELLO_DISPLAY_MS = 4_500

/** Screen 2: split path choice (new to VPPs vs already in one). */
export const PATH_CHOICE = {
  title: 'Choose a path',
  replay: 'Replay intro',
  /** Spoken by Bolt after the logo lands, then swapped on hover. */
  bolt: {
    name: 'Bolt',
    hello: "Hi, I'm Bolt — I'll be showing you around.",
    explore: "Let's see how a VPP can help you save.",
    improve: "Let's maximise what your VPP can offer before the next peak.",
  },
  explore: {
    eyebrow: 'New to VPPs',
    title: ['Get started', 'with VPPs'],
    action: 'Explore getting started',
  },
  improve: {
    eyebrow: 'Already in VPP',
    title: ['Unlock my full', 'VPP potential'],
    action: 'Improve my setup',
  },
} as const

export const FLOW_CONTROLS = {
  railLabel: 'Role',
  title: 'Role & data on this device',
  lede: 'Saved in this browser only. Switch role or reset to start over.',
  switchToExplore: 'Switch to exploring VPPs',
  switchToImprove: 'Switch to improving my VPP setup',
  resetAll: 'Reset everything on this device',
  resetConfirmTitle: 'Reset everything on this device?',
  resetConfirmBody: 'Clears profile, goals, and history here. Nothing is kept on a server.',
  resetConfirmAction: 'Reset all data',
  resetCancel: 'Cancel',
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
    'Tell us about your home, solar, and battery first, then we can rank plans that fit you.',
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
