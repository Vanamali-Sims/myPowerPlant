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
  lede: 'Set up your profile by sharing your current usage and setup.',
  accessFeatures: 'Access Features',
  completeProfile: 'Complete profile',
  hint: 'Get started in just 2 minutes.',
} as const

/** Shown by Bolt when What if, Goals, or Reminders are tapped before setup is complete. */
export const IMPROVE_LOCKED_FEATURES = {
  boltMessage:
    "You've got to complete your profile to unlock those features and your full potential, mate.",
} as const

/** Used where a profile answer has not been given yet. */
export const IMPROVE_SETUP_CARD = {
  missing: 'Not added yet',
} as const

/** Combined bill upload and household details on improve setup step 1 (desktop). */
export const HOME_VPP_ONBOARDING = {
  pageTitle: 'Your home and VPP',
  pageLede: 'Upload your bill, then tell us about your solar, battery and VPP.',
  billTitle: 'Upload your electricity bill',
  billLede: 'PDF from your retailer. Powershop bills are supported.',
  dropTitle: 'Drop your bill PDF here',
  browseLink: 'browse your files',
  chips: ['Usage', 'Cost', 'Postcode'] as const,
  privacy:
    'Read on this device, never uploaded. We only keep the usage, cost, and postcode you confirm.',
  detailsTitle: 'Your details',
  detailsLede: 'Not sure of an answer? Pick "use a baseline" and we\'ll use a typical value.',
  saveLabel: 'Save changes',
  vppPlaceholder: 'Select a VPP',
  vppNotJoined: "I haven't joined one yet",
  vppNotListed: 'Not listed',
  vppBaseline: "I'm not sure, use a baseline",
} as const

/** Select value for an empty vppProvider when the household has not joined a VPP. */
export const VPP_NOT_JOINED_SELECT = 'none'

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
  action: string
  ariaLabel: string
}[] = [
  {
    id: 'whatif',
    eyebrow: 'What if',
    pill: 'Nothing changes',
    title: 'Test a scenario',
    body:
      'See how your yearly VPP savings would change with a bigger battery, more panels, a different backup reserve or new daily use.',
    action: 'Try What if',
    ariaLabel: 'Open What if: test a scenario',
  },
  {
    id: 'goals',
    eyebrow: 'Goals',
    pill: 'Powers your tree',
    title: 'Set and track goals',
    body:
      'Pick a savings and carbon target, upload your battery file each month, and watch your tree grow as you get closer.',
    action: 'Open Goals',
    ariaLabel: 'Open Goals: set and track goals',
  },
  {
    id: 'reminders',
    eyebrow: 'Reminders',
    pill: 'Next discharge day',
    title: 'Never miss an event',
    body:
      'A solar forecast for the week shows the best days to share or opt out, with one-click calendar reminders.',
    action: 'Get reminders',
    ariaLabel: 'Open Reminders: never miss an event',
  },
]

/** Shown once when the form opens with answers from the explore form. */
export const IMPROVE_PREFILL_NOTICE = {
  title: 'We used your earlier answers',
  body: 'We filled in what you told us in the explore form. Check them, and add anything that is missing.',
  action: 'Got it',
} as const

export const IMPROVE_STEPS: { id: ImproveStepId; title: string; lede: string }[] = [
  {
    id: 'home',
    title: 'Your electricity bill',
    lede: 'Upload a PDF from your retailer. We read usage and postcode on this device only, then you add solar and battery on the next steps.',
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
  household: 'From your bill',
  householdLede: 'Postcode, usage, and charges read on this device. VPP and household size are set on What if.',
  baseline: 'What if baseline',
  baselineLede: 'What if starts every scenario from this setup. Change it here to change the starting point.',
  goals: 'Your goals',
  goalsEmpty: 'No goals yet. Set them on the Goals tab from a month of your battery file.',
  goalsNoBaseline: 'Your goals were set before battery files were used. Set a new baseline on the Goals tab to edit them here.',
  reminders: 'Reminders you downloaded',
  remindersEmpty: 'No reminders yet. Add event days to your calendar from the Reminders tab.',
  resetHint: 'Start the improve setup again. This cannot be undone.',
  resetKeepsExplore:
    'This clears your VPP, your goals and history, and your downloaded reminders from this device. Answers from the explore form stay, so the setup form fills them in again.',
  resetClearsAll:
    'This clears your setup answers, your goals and history, and your downloaded reminders from this device. You can fill the setup form again afterwards.',
} as const
