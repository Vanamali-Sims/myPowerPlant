/**
 * Copy for the improve-setup flow: home page, the access-features form, and
 * the improve-flow profile. Kept here so the components are layout only.
 */
import type { ImproveStepId } from '../lib/improveProfile'

/** Hero copy. `titleEmphasis` is set in italics after `titleLead`. */
export const IMPROVE_HERO = {
  eyebrow: 'For homes already in a VPP',
  titleLead: 'Use your VPP setup',
  titleEmphasis: 'more efficiently.',
  lede: 'Try battery settings, set savings goals, and get reminders before peak events.',
  accessFeatures: 'Access features',
  completeProfile: 'Complete profile',
} as const

/** Summary card beside the hero. */
export const IMPROVE_SETUP_CARD = {
  title: 'Your setup',
  missing: 'Not added yet',
  readyNote: 'All three features use these answers.',
  incompleteNote: 'Add the missing answers to open the features.',
} as const

export type ImproveFeatureId = 'whatif' | 'goals' | 'reminders'

export const IMPROVE_FEATURES_HEADING = {
  eyebrow: 'Your features',
  title: 'Three ways to get more from your battery.',
} as const

export const IMPROVE_FEATURES: {
  id: ImproveFeatureId
  eyebrow: string
  title: string
  body: string
}[] = [
  {
    id: 'whatif',
    eyebrow: 'What if',
    title: 'Test a change first',
    body: 'Try a bigger battery, a different reserve, more panels, or a change in daily use, and see how your yearly VPP payment would move before you change anything.',
  },
  {
    id: 'goals',
    eyebrow: 'Goals',
    title: 'Set and track goals',
    body: 'Choose a savings goal and a carbon goal from a month of your own battery file, then upload each month to watch your progress grow.',
  },
  {
    id: 'reminders',
    eyebrow: 'Reminders',
    title: 'Never miss an event',
    body: 'See the days your solar forecast suits a discharge event, or when to opt out, and add them to your calendar in one click.',
  },
]

export const IMPROVE_TRY_IT = 'Try it'

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
