/**
 * Sample Victorian VPP offers used until a live CDR feed is wired.
 */
export type VppPlan = {
  id: string
  brand: string
  name: string
  exportRate: number
  lockInMonths: number
  dispatchNote: string
  signupBonus: number
  compatibleBatteries: string[]
  href: string
  sourceLabel: string
}

/** CDR-shaped sample of Victorian VPP offers. Replace with live CDR later. */
export const VPP_PLANS: VppPlan[] = [
  {
    id: 'agl-vpp',
    brand: 'AGL Energy',
    name: 'AGL Virtual Power Plant',
    exportRate: 0.15,
    lockInMonths: 0,
    dispatchNote: 'Your battery may be called a few times a week. You keep the reserve you set.',
    signupBonus: 150,
    compatibleBatteries: ['Tesla Powerwall 2', 'Sungrow SBR HV', 'SonnenBatterie'],
    href: 'https://www.agl.com.au/solar-batteries/batteries/virtual-power-plant',
    sourceLabel: 'Sample plan terms (CDR-shaped). Not a live CDR feed yet.',
  },
  {
    id: 'origin-loop',
    brand: 'Origin Energy',
    name: 'Origin Loop VPP',
    exportRate: 0.12,
    lockInMonths: 12,
    dispatchNote: 'Origin can draw from your battery during grid peaks, within your reserve.',
    signupBonus: 100,
    compatibleBatteries: [
      'Tesla Powerwall 2',
      'AlphaESS SMILE5',
      'Goodwe Lynx Home F',
      'BYD Battery-Box Premium LVL',
    ],
    href: 'https://www.originenergy.com.au/solar/batteries/origin-loop/',
    sourceLabel: 'Sample plan terms (CDR-shaped). Not a live CDR feed yet.',
  },
  {
    id: 'ea-power-response',
    brand: 'EnergyAustralia',
    name: 'EnergyAustralia PowerResponse',
    exportRate: 0.1,
    lockInMonths: 0,
    dispatchNote: 'Event-based dispatch. You can usually opt out of a single event.',
    signupBonus: 50,
    compatibleBatteries: ['Tesla Powerwall 2', 'Sungrow SBR HV', 'BYD Battery-Box Premium LVL'],
    href: 'https://www.energyaustralia.com.au/home/electricity-and-gas/solar/virtual-power-plant',
    sourceLabel: 'Sample plan terms (CDR-shaped). Not a live CDR feed yet.',
  },
  {
    id: 'simply-vpp',
    brand: 'Simply Energy',
    name: 'Simply VPP',
    exportRate: 0.18,
    lockInMonths: 24,
    dispatchNote: 'Higher credit, longer contract. Check the exit fee before you switch.',
    signupBonus: 0,
    compatibleBatteries: ['Tesla Powerwall 2', 'SonnenBatterie', 'Goodwe Lynx Home F'],
    href: 'https://www.simplyenergy.com.au/residential/solar-and-batteries/vpp',
    sourceLabel: 'Sample plan terms (CDR-shaped). Not a live CDR feed yet.',
  },
  {
    id: 'red-vpp',
    brand: 'Red Energy',
    name: 'Red Energy VPP',
    exportRate: 0.11,
    lockInMonths: 0,
    dispatchNote: 'No lock-in on this sample offer. Credits apply when your battery is dispatched.',
    signupBonus: 75,
    compatibleBatteries: ['Tesla Powerwall 2', 'AlphaESS SMILE5', 'Sungrow SBR HV'],
    href: 'https://www.redenergy.com.au/residential/solar/vpp',
    sourceLabel: 'Sample plan terms (CDR-shaped). Not a live CDR feed yet.',
  },
]
