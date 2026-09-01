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

export type WelcomeImpactPoint = {
  title: string
  description: string
  estimate?: boolean
}

export type WelcomeStep = {
  title: string
  description: string
}

export type WelcomeArticle = {
  tag: string
  title: string
  excerpt: string
  source: string
  href: string
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

export const WELCOME_IMPACT_POINTS: WelcomeImpactPoint[] = [
  {
    title: 'Solar & battery',
    description:
      'Matt has a rooftop solar system paired with a home battery — the kind of setup MyPowerPlant is built around.',
  },
  {
    title: 'Battery reserve',
    description:
      'He keeps a portion of his battery charge in reserve at all times, balancing backup power with VPP participation.',
  },
  {
    title: 'Potential to save',
    description:
      'Depending on his usage and battery size, joining a VPP could lower Matt’s running costs. This isn’t a guaranteed figure — it depends on your own home.',
    estimate: true,
  },
]

export const HOW_IT_WORKS: WelcomeStep[] = [
  {
    title: 'Tell us about your home',
    description:
      'Answer a short set of questions about your household, usage, solar and battery.',
  },
  {
    title: 'We look at your numbers',
    description:
      'MyPowerPlant checks your setup against real assessment criteria, not guesswork.',
  },
  {
    title: 'Get your recommendation',
    description:
      'See whether joining a VPP makes sense for you, and how — updated as things change.',
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

export const LEARN_MORE_POPOVER =
  'A dedicated guide is coming soon — see the linked articles below in the meantime.'

export const SEE_ALL_POPOVER = 'The full features list is coming soon.'
