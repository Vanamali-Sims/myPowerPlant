/**
 * Copy for the improve-setup flow: home page, the access-features form, and
 * the improve-flow profile. Kept here so the components are layout only.
 */
import type { ImproveStepId } from '../lib/improveProfile'

/** Hero copy. `titleEmphasis` is set in italics between `titleLead` and `titleTail`. */
export const IMPROVE_HERO = {
  eyebrow: 'For homes already in a VPP',
  titleLead: 'Unlock the',
  titleEmphasis: 'full potential',
  titleTail: 'of your VPP.',
  lede: 'Set up your profile by sharing your current usage and profile.',
  accessFeatures: 'Access Features',
  completeProfile: 'Complete profile',
  hint: 'Get started in just 2 minutes.',
} as const

/** Used where a profile answer has not been given yet. */
export const IMPROVE_SETUP_CARD = {
  missing: 'Not added yet',
} as const

/** Dashboard beside the hero, filled from the household's goals, forecast, and uploads. */
export const IMPROVE_DASHBOARD = {
  title: 'Your dashboard',
  tree: { eyebrow: 'Your tree', noGoals: 'Set a savings and a carbon goal to grow your tree.', setGoals: 'Set goals' },
  savingsLabel: 'Savings goal',
  carbonLabel: 'Carbon goal',
  nextDay: {
    eyebrow: 'Next discharge day',
    forecast: (kwh: string) => `${kwh} forecast`,
    loading: 'Checking the forecast…',
    none: 'None in the next 14 days',
    noneNote: 'No day clears your reserve margin yet.',
    unavailable: 'Forecast unavailable',
    unavailableNote: 'Try again later, or open Reminders.',
    needsSetup: 'Add your setup',
    needsSetupNote: 'We use your panels and reserve to pick the day.',
  },
  lastUpload: {
    eyebrow: 'Last CSV uploaded',
    uploaded: (day: string) => `Uploaded ${day}`,
    baseline: (day: string) => `Goal baseline · uploaded ${day}`,
    none: 'None yet',
    noneNote: 'Upload your battery CSV on the Goals tab.',
  },
  footnote: 'Add your setup to fill in your dashboard.',
  action: 'Add my setup',
} as const

export type ImproveFeatureId = 'whatif' | 'goals' | 'reminders'

export const IMPROVE_FEATURES_HEADING = {
  eyebrow: 'Our features',
  title: 'Enhance VPP experience through these features.',
} as const

export const IMPROVE_FEATURES: {
  id: ImproveFeatureId
  eyebrow: string
  pill: string
  title: string
  body: string
  points: string[]
  action: string
}[] = [
  {
    id: 'whatif',
    eyebrow: 'What if',
    pill: 'Sandbox · your setup stays the same',
    title: 'Test a scenario',
    body: 'See how your yearly VPP savings would change.',
    points: ['Bigger battery or more panels', 'Different backup reserve', 'Change in daily use'],
    action: 'Try What if',
  },
  {
    id: 'goals',
    eyebrow: 'Goals',
    pill: 'Powers ‘Your tree’',
    title: 'Set and track goals',
    body: 'Stay motivated with progress you can actually see.',
    points: ['Savings and carbon targets', 'Monthly battery file upload', 'Tree grows as you progress'],
    action: 'Open Goals',
  },
  {
    id: 'reminders',
    eyebrow: 'Reminders',
    pill: 'Powers ‘Next best day’',
    title: 'Never miss an event',
    body: 'Know the right day to act, without checking every morning.',
    points: ['Solar forecast for the week', 'Best days to share or opt out', 'One-click calendar reminders'],
    action: 'Get reminders',
  },
]

/** Shown once when the form opens with answers from the explore form. */
export const IMPROVE_PREFILL_NOTICE = {
  title: 'We used your earlier answers',
  body: 'We filled in what you told us in the Simulate my savings form. Check them, and add anything that is missing.',
  action: 'Got it',
} as const

export const IMPROVE_STEPS: { id: ImproveStepId; title: string; lede: string }[] = [
  {
    id: 'home',
    title: 'Your home and VPP',
    lede: 'Tell us which VPP you have joined and how much electricity your home uses.',
  },
  {
    id: 'solar',
    title: 'Your solar panels',
    lede: 'Your panels set how much energy your battery has to work with.',
  },
  {
    id: 'battery',
    title: 'Your battery',
    lede: 'Your battery and the reserve you keep decide what you can share with your VPP.',
  },
]

export const IMPROVE_FORM_DONE = 'Save and continue'

/** Sections of the improve-flow profile. */
export const IMPROVE_PROFILE = {
  title: 'Your profile',
  lede: 'Everything What if, Goals, and Reminders use. Change it here and every feature uses the new answers.',
  household: 'Your home and VPP',
  baseline: 'What if baseline',
  baselineLede: 'What if starts every scenario from this setup. Change it here to change the starting point.',
  goals: 'Your goals',
  goalsEmpty: 'No goals yet. Set them on the Goals tab from a month of your battery file.',
  goalsNoBaseline: 'Your goals were set before battery files were used. Set a new baseline on the Goals tab to edit them here.',
  reminders: 'Reminders you downloaded',
  remindersEmpty: 'No reminders yet. Add event days to your calendar from the Reminders tab.',
  resetHint: 'Start the improve setup again. This cannot be undone.',
  resetKeepsExplore:
    'This clears your VPP, your goals and history, and your downloaded reminders from this device. Answers from the Simulate my savings form stay, so the setup form fills them in again.',
  resetClearsAll:
    'This clears your setup answers, your goals and history, and your downloaded reminders from this device. You can fill the setup form again afterwards.',
} as const
