/**
 * Welcome-page marketing copy.
 *
 * Kept out of Welcome.tsx so a teammate can edit home-page content without
 * reading the layout component.
 */
import {
  BoltIcon,
  DashboardIcon,
  SunIcon,
} from '../components/ui/icons'

export type FeatureStatus = 'available' | 'soon'

export type WelcomeFeature = {
  icon: typeof SunIcon
  title: string
  description: string
  status: FeatureStatus
}

/** Optional modelled week for the VPP explainer when a profile exists. */
export type VppExplainerHousehold = {
  generatedKwh: number
  usedKwh: number
  gapKwh: number
  /** Gap × retail rate for the same week — always shown as an estimate. */
  gapCostAud: number | null
  /** Same gap priced as a VPP borrow — estimate only; omit to hide With-VPP dollars. */
  vppGapCostAud?: number | null
}

export type VppExplainerStepId = 'shortfall' | 'compare' | 'trade' | 'cta'

export type VppExplainerStep = {
  id: VppExplainerStepId
  headline: string
  body: string
}

export type VppExplainerCompareMode = 'without' | 'with'

export type VppExplainerCompareCopy = {
  eyebrow: string
  title: string
  without: {
    title: string
    detail: string
    costLabel: string
    costAud: number | null
    footer: string
  }
  with: {
    title: string
    detail: string
    costLabel: string
    costAud: number | null
    footer: string
  }
}

export const WELCOME_FEATURES: WelcomeFeature[] = [
  {
    icon: SunIcon,
    title: 'Your solar & battery',
    description:
      'Tell us about your solar panels and battery — the make, the size, how you use them.',
    status: 'available',
  },
  {
    icon: BoltIcon,
    title: 'Your household usage',
    description:
      'Add details from your own electricity bills so your recommendation reflects how your home actually uses power.',
    status: 'available',
  },
  {
    icon: DashboardIcon,
    title: 'Your ongoing recommendation',
    description:
      'See whether joining a VPP makes sense for your home, and how — kept up to date as your setup changes.',
    status: 'available',
  },
]

/** Hero copy. `titleEmphasis` is set in italics after `titleLead`. */
export const WELCOME_HERO = {
  eyebrow: 'For homes with solar + battery',
  titleLead: 'Your battery could be',
  titleEmphasis: 'paying you.',
  lede: 'Share your stored energy through a VPP and save on every bill.',
  cta: 'Simulate my savings',
} as const

/** Hero comparison card: share of a regular bill saved, without and with a VPP. */
export const WELCOME_SAVINGS_STAT = {
  multiple: '2×',
  headline: 'the potential savings.',
  subline: 'Same solar, same battery.',
  bars: [
    { id: 'solar', label: 'Solar + battery', value: '~30%', percent: 30 },
    { id: 'vpp', label: '+ VPP', value: '~60%', percent: 60 },
  ],
  source: 'Saved off a regular bill; varies by state. Source: ACCC, June 2026.',
} as const

export type WelcomeWin = {
  id: 'savings' | 'grid' | 'renewables'
  eyebrow: string
  title: string
  body: string
}

export const WELCOME_WINS_HEADING = {
  eyebrow: 'Why join a VPP',
  title: 'One battery. Three wins.',
} as const

export const WELCOME_WINS: WelcomeWin[] = [
  {
    id: 'savings',
    eyebrow: 'Financial savings',
    title: 'Lower bills',
    body: 'Earn credits on your bill for the energy you share.',
  },
  {
    id: 'grid',
    eyebrow: 'Grid stability',
    title: 'It runs both ways',
    body: 'Draw from the grid when you’re short, supply to it when it needs you.',
  },
  {
    id: 'renewables',
    eyebrow: 'Promoting renewables',
    title: 'No sunshine wasted',
    body: 'Spare solar is stored and shared, not thrown away.',
  },
]

export const WELCOME_CLOSING = {
  title: 'Stop leaving savings on the table.',
} as const

export const FEATURE_STATUS_LABEL: Record<FeatureStatus, string> = {
  available: 'Available now',
  soon: 'Coming soon',
}

export const SEE_ALL_POPOVER = 'The full features list is coming soon.'

/** Hypothetical week used when the visitor has no profile (or no shortfall). */
export const VPP_EXPLAINER_EXAMPLE = {
  generatedKwh: 40,
  usedKwh: 55,
  gapKwh: 15,
  gapCostAud: 7.2,
  vppGapCostAud: 5.1,
} as const

/** Draw / supply cards on the “it runs both ways” slide. */
export const VPP_EXPLAINER_FLOW = {
  intro: 'Nearby batteries act like a second grid you can draw from or add to.',
  cards: [
    {
      id: 'draw',
      title: 'Draw from the VPP grid',
      body: 'When this home is short, neighbours cover the gap instead of the retail grid.',
    },
    {
      id: 'supply',
      title: 'Supply to the VPP grid',
      body: 'Spare charge goes to a neighbour, and this home gets credited.',
    },
  ],
} as const

/** Closing carousel slide — scrolls to the how-it-helps section, no route change. */
export const VPP_EXPLAINER_CTA = {
  eyebrow: 'Ready when you are',
  title: 'See how this can help you',
  body: 'A quick comparison for a home like yours — no sign-up needed.',
  button: 'Show me',
} as const

/** Example “how it helps” block under the carousel (not the live dashboard). */
export const VPP_HOW_IT_HELPS = {
  heading: 'A quick look at what this means for a home like yours',
  withoutTitle: 'Without a VPP',
  withoutDetail: 'bought from the retail grid',
  withTitle: 'With a VPP',
  withDetail: 'saved by the VPP grid instead',
  benefits: [
    'No new hardware. Works with the battery you already have.',
    'Covered both ways. Draw when you’re short, get credited when you help someone else.',
  ],
  cta: 'See your numbers',
  ctaStart: 'Get started',
} as const

/** Illustrative year from a typical week — not a live bill projection. */
export function annualizeWeeklyAud(weeklyAud: number): number {
  return Math.round(weeklyAud * 52)
}

/**
 * buildVppExplainerSteps
 * @param _personal - Reserved so the carousel can still pass modelled week data
 * @returns Four slides: shortfall, cost compare, both-ways, CTA
 */
export function buildVppExplainerSteps(
  _personal: VppExplainerHousehold | null,
): VppExplainerStep[] {
  return [
    {
      id: 'shortfall',
      headline: 'Why the numbers don’t usually match',
      body: 'Solar peaks around midday. Most homes use more power in the evening — so there’s almost always a gap to fill, one way or another.',
    },
    {
      id: 'compare',
      headline: 'What the gap costs',
      body: 'Toggle without vs with a VPP to see how the same gap can be priced.',
    },
    {
      id: 'trade',
      headline: 'It runs both ways',
      body: VPP_EXPLAINER_FLOW.intro,
    },
    {
      id: 'cta',
      headline: VPP_EXPLAINER_CTA.title,
      body: VPP_EXPLAINER_CTA.body,
    },
  ]
}

/**
 * buildVppExplainerCompare
 * @param personal - Real shortfall week when available; else the example week
 * @returns Copy for the Without / With VPP comparison panel
 */
export function buildVppExplainerCompare(
  personal: VppExplainerHousehold | null,
): VppExplainerCompareCopy {
  if (personal) {
    const gen = Math.round(personal.generatedKwh)
    const used = Math.round(personal.usedKwh)
    const gap = formatExplainerKwh(personal.gapKwh)
    return {
      eyebrow: 'Same gap, two ways to cover it',
      title: 'What the gap costs',
      without: {
        title: `Your panels made ${gen}, your home used ${used}`,
        detail: `The ${gap} gap gets billed at the retail grid rate.`,
        costLabel: 'roughly, this gap costs',
        costAud: personal.gapCostAud,
        footer: `Same ${gap} gap, paid to the retail grid.`,
      },
      with: {
        title: 'A VPP fills the gap instead',
        detail: `Homes nearby with spare charge lend you the ${gap}.`,
        costLabel: 'roughly, this gap costs',
        costAud: personal.vppGapCostAud ?? null,
        footer: `Same ${gap} gap, borrowed from the VPP grid.`,
      },
    }
  }

  const { generatedKwh, usedKwh, gapKwh, gapCostAud, vppGapCostAud } = VPP_EXPLAINER_EXAMPLE
  return {
    eyebrow: 'Same gap, two ways to cover it',
    title: 'What the gap costs',
    without: {
      title: `Your panels made ${generatedKwh}, your home used ${usedKwh}`,
      detail: `The ${gapKwh} kWh gap gets billed at the retail grid rate.`,
      costLabel: 'roughly, this gap costs',
      costAud: gapCostAud,
      footer: `Same ${gapKwh} kWh gap, paid to the retail grid.`,
    },
    with: {
      title: 'A VPP fills the gap instead',
      detail: `Homes nearby with spare charge lend you the ${gapKwh} kWh.`,
      costLabel: 'roughly, this gap costs',
      costAud: vppGapCostAud,
      footer: `Same ${gapKwh} kWh gap, borrowed from the VPP grid.`,
    },
  }
}

function formatExplainerKwh(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return `${rounded} kWh`
}

/** Weekly gap cost as shown on the compare slide and how-it-helps cards. */
export function formatExplainerExactAud(weeklyAud: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(weeklyAud)
}

export function formatExplainerWeekAud(weeklyAud: number): string {
  return `${formatExplainerExactAud(weeklyAud)}/week`
}

/** Rounded 52-week equivalent of a weekly gap cost. */
export function formatExplainerYearAud(weeklyAud: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(annualizeWeeklyAud(weeklyAud))
}
