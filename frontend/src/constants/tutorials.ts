/**
 * Guided tutorial: the steps for each flow and the dialog and assistant copy.
 *
 * A step points at a real control through its data-tour attribute, never a
 * CSS class, so restyling a page cannot break the tutorial. Several elements
 * may share one data-tour value; the spotlight then covers all of them.
 */

export type TutorialFlow = 'explore' | 'improve'

export type TutorialPlacement = 'top' | 'right' | 'bottom' | 'left'

/** data-tour values on the controls the tutorial points at. */
export const TUTORIAL_TARGETS = {
  /** What if, Goals and Reminders in the improve rail. */
  features: 'improve-features',
  path: 'path-reset',
  bot: 'assistant-bot',
} as const

export type TutorialTarget = (typeof TUTORIAL_TARGETS)[keyof typeof TUTORIAL_TARGETS]

export type TutorialStep = {
  id: string
  /** data-tour value of the element(s) to spotlight. */
  target: TutorialTarget
  title: string
  body: string
  /** Preferred side for the tooltip; it flips when there is no room. */
  placement: TutorialPlacement
}

export const TUTORIAL_STEPS: Record<TutorialFlow, TutorialStep[]> = {
  explore: [
    {
      id: 'path',
      target: TUTORIAL_TARGETS.path,
      title: 'Role',
      body: 'Switch to improving your setup, or start over on this device. Nothing changes until you confirm.',
      placement: 'right',
    },
    {
      id: 'bot',
      target: TUTORIAL_TARGETS.bot,
      title: 'I’m here to help',
      body: 'From here you can change your postcode, update your profile once it’s set up, and replay this tutorial.',
      placement: 'left',
    },
  ],
  improve: [
    {
      id: 'features',
      target: TUTORIAL_TARGETS.features,
      title: 'Your features',
      body: 'Here are your features: goal tracking, What if simulation, and discharge and opt-out reminders.',
      placement: 'right',
    },
    {
      id: 'path',
      target: TUTORIAL_TARGETS.path,
      title: 'Role',
      body: 'Switch to exploring VPPs, or start over on this device. Nothing changes until you confirm.',
      placement: 'right',
    },
    {
      id: 'bot',
      target: TUTORIAL_TARGETS.bot,
      title: 'I’m here to help',
      body: 'Here you can replay this tutorial any time.',
      placement: 'left',
    },
  ],
}

export const TUTORIAL_COPY = {
  back: 'Back',
  next: 'Next',
  done: 'Done',
  skip: 'Skip',
  stepOf: (step: number, total: number) => `Step ${step} of ${total}`,
} as const

/** The robot in the bottom corner and its menu. */
export const ASSISTANT_COPY = {
  menuLabel: 'Assistant',
  actions: 'Actions',
  tutorial: 'Tutorial',
  tutorialNew: 'not seen yet',
} as const
