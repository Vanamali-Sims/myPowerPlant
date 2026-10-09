import { useEffect, useMemo, useState } from 'react'
import type { BatteryModelRow, VppSuggestionPlan } from '../../lib/methodologyApi'
import {
  compactCardFacts,
  matchSuggestionPlans,
  planFitCopy,
  planListSummary,
  type MatchReasonCode,
} from '../../lib/vppSuggestions'
import { RECOMMENDATIONS_PAGE } from '../../constants/onboarding'
import type { ProfileData } from '../../types/profile'
import { TermsDialog } from '../dashboard/VppSuggestions'
import { Button } from '../ui/Button'
import { Callout } from '../ui/Callout'
import { AlertIcon, CheckIcon } from '../ui/icons'

type Props = {
  profile: ProfileData
  plans: VppSuggestionPlan[]
  batteryModels: BatteryModelRow[]
  onEnrollProvider: (provider: string) => void
}

function scrollToAlternatePlanEnroll() {
  const target = document.getElementById(RECOMMENDATIONS_PAGE.enrollSectionId)
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  window.setTimeout(() => target?.focus({ preventScroll: true }), 400)
}

const EMPTY_REASON: Record<MatchReasonCode, string> = {
  battery:
    'Your battery model isn’t listed as supported by any plan we track. Update your profile if the model was a guess, or check with the provider.',
  region:
    'None of the plans we track cover your postcode’s region yet. MyPowerPlant currently compiles Victorian offers.',
  none: 'We don’t have a matching VPP plan for this home yet.',
}

/**
 * Master–detail plan browser for the Plans page (list left, detail right).
 */
export function PlansMasterDetail({ profile, plans, batteryModels, onEnrollProvider }: Props) {
  const { matches, emptyReason } = useMemo(
    () => matchSuggestionPlans(profile, plans, batteryModels),
    [batteryModels, plans, profile],
  )

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [termsOpen, setTermsOpen] = useState(false)

  useEffect(() => {
    if (matches.length === 0) {
      setSelectedId(null)
      return
    }
    const stillValid = matches.some((m) => m.plan.id === selectedId)
    if (!stillValid) setSelectedId(matches[0].plan.id)
  }, [matches, selectedId])

  const selected =
    matches.find((m) => m.plan.id === selectedId) ?? matches[0] ?? null
  const selectedIndex = selected ? matches.findIndex((m) => m.plan.id === selected.plan.id) : -1
  const isTopMatch = selectedIndex === 0

  if (emptyReason) {
    return (
      <Callout tone="neutral" icon={<AlertIcon />} title="No matching plans yet">
        {EMPTY_REASON[emptyReason]}
      </Callout>
    )
  }

  if (!selected) return null

  const facts = compactCardFacts(selected.plan, selected.reserveHeadroomKwh)
  const fit = planFitCopy(profile, selected)

  return (
    <div className="plans-browser">
      <div className="plans-browser__list" role="listbox" aria-label="VPP plans">
        <p className="plans-browser__list-heading">
          {RECOMMENDATIONS_PAGE.listHeading(matches.length).toUpperCase()}
        </p>
        {matches.map((match, index) => {
          const active = match.plan.id === selected.plan.id
          const topMatch = index === 0
          return (
            <button
              key={match.plan.id}
              type="button"
              role="option"
              aria-selected={active}
              className={`plans-browser__list-card${active ? ' is-active' : ''}`}
              onClick={() => setSelectedId(match.plan.id)}
            >
              <div className="plans-browser__list-card-top">
                <p className="eyebrow plans-browser__brand">{match.plan.brand}</p>
                {topMatch ? (
                  <span className="plans-browser__top-tag">Top match</span>
                ) : null}
              </div>
              <h2 className="plans-browser__list-name">{match.plan.name}</h2>
              <p className="plans-browser__list-hint">{planListSummary(match.plan)}</p>
            </button>
          )
        })}
      </div>

      <article className="plans-browser__detail" aria-live="polite">
        <header className="plans-browser__detail-hero">
          {isTopMatch ? <span className="plans-browser__hero-tag">Top match</span> : null}
          <p className="plans-browser__hero-brand">{selected.plan.brand}</p>
          <h2 className="plans-browser__hero-title">{selected.plan.name}</h2>
        </header>

        <div className="plans-browser__stats">
          {facts.slice(0, 3).map((fact) => (
            <div key={fact.label} className="plans-browser__stat">
              <p className="eyebrow">{fact.label}</p>
              <p className="plans-browser__stat-value">{fact.value}</p>
            </div>
          ))}
        </div>

        <section className="plans-browser__why" aria-labelledby="plans-why-heading">
          <h3 id="plans-why-heading" className="plans-browser__why-title">Why it suits you</h3>
          <ul className="plans-browser__why-list">
            {fit.why.map((line) => (
              <li key={line}>
                <CheckIcon width={16} height={16} />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="plans-browser__actions">
          <Button variant="primary" type="button" onClick={() => onEnrollProvider(selected.plan.brand)}>
            {RECOMMENDATIONS_PAGE.planEnrollAction}
          </Button>
          <Button variant="secondary" type="button" onClick={() => setTermsOpen(true)}>
            Learn more
          </Button>
          <Button variant="secondary" type="button" onClick={scrollToAlternatePlanEnroll}>
            {RECOMMENDATIONS_PAGE.planDifferentAction}
          </Button>
        </div>
      </article>

      <TermsDialog open={termsOpen} match={selected} onClose={() => setTermsOpen(false)} />

      <p className="plans-browser__footnote">{RECOMMENDATIONS_PAGE.notListedFootnote}</p>
    </div>
  )
}
