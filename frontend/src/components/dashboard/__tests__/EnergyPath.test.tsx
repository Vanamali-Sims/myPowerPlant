/**
 * @vitest-environment jsdom
 *
 * The steps band under the explore dashboard's balance card, and the ring's
 * arc order (VPP share first, from 12 o'clock).
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { EnergyRiverModel } from '../../../lib/energyRiver'
import { computeEnergyArcs } from '../../energy/energyMath'
import { EnergyPath } from '../EnergyPath'

function model(overrides: Partial<EnergyRiverModel> = {}): EnergyRiverModel {
  return {
    timeframe: 'weekly',
    fork: 'surplus',
    solarIsPotential: false,
    generatedKwh: 62.1,
    usedKwh: 50.5,
    coveredKwh: 50.5,
    forkKwh: 11.6,
    forkValueAud: 2.08,
    annualValueAud: 108,
    feedInValueAud: 0.6,
    share: 0.19,
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
})

describe('EnergyPath', () => {
  it('lists the three steps in order, the first matched to the VPP amount', () => {
    render(<EnergyPath model={model()} onSeePlans={vi.fn()} />)
    const band = screen.getByRole('region', { name: '3 steps to start saving' })
    const steps = within(band).getAllByRole('listitem')
    expect(steps.map((step) => step.querySelector('.energy-path__title')?.textContent)).toEqual([
      'Compare plans',
      'Pick one',
      'Start earning',
    ])
    expect(within(steps[0]).getByText('Matched to your 11.6 kWh')).toBeTruthy()
    expect(steps[0].classList.contains('is-current')).toBe(true)
  })

  it('opens the plans from Save me money', async () => {
    const onSeePlans = vi.fn()
    const user = userEvent.setup()
    render(<EnergyPath model={model()} onSeePlans={onSeePlans} />)
    await user.click(screen.getByRole('button', { name: 'Save me money' }))
    expect(onSeePlans).toHaveBeenCalledOnce()
  })

  it('shows the yearly saving with its estimate badge and explains it on focus', async () => {
    const user = userEvent.setup()
    render(<EnergyPath model={model()} onSeePlans={vi.fn()} />)
    const saving = screen.getByRole('button', { name: /Potential money saved/ })
    expect(within(saving).getByText('$108')).toBeTruthy()
    expect(within(saving).getByText('Estimate')).toBeTruthy()
    await user.tab()
    await user.tab()
    expect(document.activeElement).toBe(saving)
    expect(screen.getByRole('tooltip').textContent).toMatch(/leftover 11\.6 kWh a week/)
  })

  it.each([
    ['surplus', 'via discharge credits'],
    ['deficit', 'via cheaper VPP energy'],
    ['balanced', 'via event payments'],
  ] as const)('labels the line to the saving for a %s home', (fork, label) => {
    const { container } = render(<EnergyPath model={model({ fork })} onSeePlans={vi.fn()} />)
    expect(container.querySelector('.energy-path__via')?.textContent).toBe(label)
  })

  it('matches the first step to the home when nothing is left over or short', () => {
    render(<EnergyPath model={model({ fork: 'balanced', forkKwh: 0 })} onSeePlans={vi.fn()} />)
    expect(screen.getByText('Matched to your home')).toBeTruthy()
  })
})

describe('computeEnergyArcs', () => {
  it('starts the VPP share at 12 o’clock and puts use after it', () => {
    const arcs = computeEnergyArcs(62.1, 50.5, 11.6)
    expect(arcs.dischargeRotate).toBeCloseTo(-90 + 0.4 * 3.6)
    expect(arcs.usedRotate).toBeCloseTo(-90 + arcs.dischargePct * 3.6 + 0.4 * 3.6)
  })
})
