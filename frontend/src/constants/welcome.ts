/**
 * Welcome-page marketing copy and learning links.
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

export type WelcomeArticle = {
  tag: string
  title: string
  excerpt: string
  source: string
  href: string
}

/** Optional modelled week for the VPP explainer when a profile exists. */
export type VppExplainerHousehold = {
  generatedKwh: number
  usedKwh: number
  gapKwh: number
  /** Gap × retail rate for the same week — always shown as an estimate. */
  gapCostAud: number | null
}

export type VppExplainerStepId = 'shortfall' | 'grid' | 'neighbour' | 'trade'

export type VppExplainerStep = {
  id: VppExplainerStepId
  headline: string
  body: string
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

export const WELCOME_ARTICLES: WelcomeArticle[] = [
  {
    tag: 'Basics',
    title: 'How does a virtual power plant work?',
    excerpt:
      'A plain-language explainer from Solar Victoria on what a VPP is and how home batteries take part.',
    source: 'solar.vic.gov.au',
    href: 'https://www.solar.vic.gov.au/how-does-virtual-power-plant-work',
  },
  {
    tag: 'Solar & battery',
    title: 'Is your battery virtual power plant ready?',
    excerpt:
      'Solar Victoria on what makes a home battery eligible to join a VPP, and what to check first.',
    source: 'solar.vic.gov.au',
    href: 'https://www.solar.vic.gov.au/virtual-power-plant-ready',
  },
  {
    tag: 'Providers & schemes',
    title: 'Virtual power plants explained',
    excerpt:
      'The Clean Energy Regulator on how VPPs fit into the small-scale renewable energy scheme.',
    source: 'cer.gov.au',
    href: 'https://cer.gov.au/schemes/renewable-energy-target/small-scale-renewable-energy-scheme/small-scale-renewable-energy-systems/solar-batteries/virtual-power-plants',
  },
]

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
} as const

/** Battery ring fill shown on each diagram step (visual only). */
export const VPP_EXPLAINER_BATTERY: Record<VppExplainerStepId, number> = {
  shortfall: 0.2,
  grid: 0.35,
  neighbour: 0.75,
  trade: 0.9,
}

/**
 * buildVppExplainerSteps
 * @param personal - Real shortfall week when onboarded and a gap exists; else null
 * @returns Four carousel slides with hedging when figures are only examples
 */
export function buildVppExplainerSteps(
  personal: VppExplainerHousehold | null,
): VppExplainerStep[] {
  if (personal) {
    const gen = formatExplainerKwh(personal.generatedKwh)
    const used = formatExplainerKwh(personal.usedKwh)
    const gap = formatExplainerKwh(personal.gapKwh)
    const cost =
      personal.gapCostAud != null
        ? ` Roughly ${formatExplainerAud(personal.gapCostAud)} at your retail rate — an estimate, not a bill.`
        : ''

    return [
      {
        id: 'shortfall',
        headline: `Your panels made about ${gen} this week`,
        body: `And your home used about ${used}. That ${gap} gap has to come from somewhere.`,
      },
      {
        id: 'grid',
        headline: 'Normally, you’d buy that gap from the grid',
        body: `At retail rates, often during the priciest hours of the evening.${cost}`,
      },
      {
        id: 'neighbour',
        headline: 'In a VPP, you’d borrow it from a neighbour instead',
        body: `Homes nearby with spare battery charge cover the gap for you — about ${gap}.`,
      },
      {
        id: 'trade',
        headline: 'Next time you’ve got extra, someone borrows from you',
        body: 'It runs both ways. That’s the whole idea of a virtual power plant.',
      },
    ]
  }

  const { generatedKwh, usedKwh, gapKwh, gapCostAud } = VPP_EXPLAINER_EXAMPLE
  return [
    {
      id: 'shortfall',
      headline: `Say your panels made ${generatedKwh} kWh this week`,
      body: `And your home used ${usedKwh}. That ${gapKwh} kWh gap has to come from somewhere.`,
    },
    {
      id: 'grid',
      headline: 'Normally, you’d buy that gap from the grid',
      body: `At retail rates, often during the priciest hours of the evening. On a rough example week that might cost about $${gapCostAud.toFixed(2)}.`,
    },
    {
      id: 'neighbour',
      headline: 'In a VPP, you’d borrow it from a neighbour instead',
      body: 'Homes nearby with spare battery charge cover the gap for you.',
    },
    {
      id: 'trade',
      headline: 'Next time you’ve got extra, someone borrows from you',
      body: 'It runs both ways. That’s the whole idea of a virtual power plant.',
    },
  ]
}

function formatExplainerKwh(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return `${rounded} kWh`
}

function formatExplainerAud(value: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: value >= 10 ? 0 : 2,
  }).format(value)
}
