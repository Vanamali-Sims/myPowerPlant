/**
 * Dashboard VPP Suggestions: compact ranked cards and a full-terms dialog.
 */
import { useEffect, useId, useRef, useState } from 'react'
import type { BatteryModelRow, VppSuggestionPlan, VppSuggestionTerm } from '../../lib/methodologyApi'
import {
  EXAMPLE_KWH,
  STALE_PROMPT,
  TERM_LABELS,
  TERM_ORDER,
  UNAVAILABLE_TERM,
  compactCardFacts,
  formatExampleAud,
  formatKwhShort,
  formatVerifiedDate,
  illustrativePayment,
  isTermStale,
  matchSuggestionPlans,
  shortSource,
  termByKey,
  type MatchReasonCode,
  type SuggestionMatch,
} from '../../lib/vppSuggestions'
import type { ProfileData } from '../../types/profile'
import { Button } from '../ui/Button'
import { Callout } from '../ui/Callout'
import {
  AlertIcon,
  BatteryIcon,
  InfoIcon,
  LockIcon,
  ShieldIcon,
} from '../ui/icons'

type Props = {
  hasProfile: boolean
  profile: ProfileData
  plans: VppSuggestionPlan[]
  batteryModels: BatteryModelRow[]
  onStartSetup: () => void
}

const EMPTY_REASON: Record<MatchReasonCode, string> = {
  battery:
    'Your battery model isn’t listed as supported by any plan we track. Update your profile if the model was a guess, or check with the provider.',
  region:
    'None of the plans we track cover your postcode’s region yet. MyPowerPlant currently compiles Victorian offers.',
  none: 'We don’t have a matching VPP plan for this home yet.',
}

const TERM_ICONS = {
  reserve_min: BatteryIcon,
  event_cap: ShieldIcon,
  opt_out: LockIcon,
  payment: InfoIcon,
} as const

/**
 * VppSuggestions
 * @param props.hasProfile - Whether onboarding has been saved on this device
 * @param props.profile - Household answers used only for matching, never sent
 * @returns JSX.Element
 *
 * Summary cards only. Full terms, sources, and missing-term notices open
 * in a dialog so the dashboard report is not regenerated (US-3.5).
 */
export function VppSuggestions({
  hasProfile,
  profile,
  plans,
  batteryModels,
  onStartSetup,
}: Props) {
  const [openMatch, setOpenMatch] = useState<SuggestionMatch | null>(null)

  if (!hasProfile) {
    return (
      <section className="vpp-suggestions" aria-labelledby="vpp-suggestions-heading">
        <p className="eyebrow">Plans that could fit this home</p>
        <h2 id="vpp-suggestions-heading">VPP Suggestions</h2>
        <Callout
          tone="action"
          icon={<AlertIcon />}
          title="Complete onboarding for personalised VPP recommendations"
          action={
            <Button variant="outline-accent" onClick={onStartSetup}>
              Fill the onboarding form
            </Button>
          }
        >
          Fill the onboarding form to get personalised VPP recommendations. We don’t show plan
          cards until those answers are saved on this device.
        </Callout>
      </section>
    )
  }

  const { matches, emptyReason } = matchSuggestionPlans(profile, plans, batteryModels)

  return (
    <section className="vpp-suggestions" aria-labelledby="vpp-suggestions-heading">
      <p className="eyebrow">Plans that could fit this home</p>
      <h2 id="vpp-suggestions-heading">VPP Suggestions</h2>

      {emptyReason ? (
        <Callout tone="neutral" icon={<AlertIcon />} title="No matching plans yet">
          {EMPTY_REASON[emptyReason]}
        </Callout>
      ) : (
        <div className="vpp-plan-board">
          {matches.map((item, index) => (
            <PlanSummaryCard
              key={item.plan.id}
              match={item}
              featured={index === 0}
              onOpen={() => setOpenMatch(item)}
            />
          ))}
        </div>
      )}

      <TermsDialog match={openMatch} onClose={() => setOpenMatch(null)} />
    </section>
  )
}

type CardProps = {
  match: SuggestionMatch
  featured?: boolean
  onOpen: () => void
}

function PlanSummaryCard({ match, featured = false, onOpen }: CardProps) {
  const facts = compactCardFacts(match.plan, null)

  return (
    <button
      type="button"
      className="dashboard-card vpp-plan-card"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={`View full terms for ${match.plan.name}`}
    >
      {featured ? <span className="kpi-badge kpi-badge--fact">Top match</span> : null}
      <span className="eyebrow">{match.plan.brand}</span>
      <span className="vpp-plan-card__name">{match.plan.name}</span>
      <span className="vpp-stat-row">
        {facts.map((fact) => (
          <span key={fact.label} className="vpp-stat">
            <span className="eyebrow">{fact.label}</span>
            <span className="kpi-card__value">{fact.value}</span>
          </span>
        ))}
      </span>
      <span className="vpp-plan-card__cta">View full terms →</span>
    </button>
  )
}

type DialogProps = {
  match: SuggestionMatch | null
  onClose: () => void
}

function TermsDialog({ match, onClose }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const node = dialogRef.current
    if (!node) return
    if (match) {
      if (!node.open) node.showModal()
    } else if (node.open) {
      node.close()
    }
  }, [match])

  const plan = match?.plan ?? null
  const headroom = match?.reserveHeadroomKwh ?? null
  const exampleKwh = headroom && headroom > 0 ? headroom : EXAMPLE_KWH
  const exampleAud = plan
    ? illustrativePayment(plan.illustrativeRatePerKwh, exampleKwh)
    : null
  const canShowExample =
    Boolean(plan && termByKey(plan, 'payment') && exampleAud != null && plan.illustrativeRatePerKwh != null)
  const exampleId = useId()
  const [exampleOpen, setExampleOpen] = useState(false)

  useEffect(() => {
    setExampleOpen(false)
  }, [plan?.id])

  return (
    <dialog
      ref={dialogRef}
      className="vpp-dialog"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose()
      }}
    >
      {plan ? (
        <div className="vpp-dialog__panel">
          <header className="vpp-dialog__header">
            <div>
              <p className="eyebrow">{plan.brand}</p>
              <h3 id={titleId}>{plan.name}</h3>
            </div>
            <Button className="vpp-dialog__close" variant="edit" onClick={onClose}>
              Close
            </Button>
          </header>
          <div className="vpp-dialog__body">
            <p className="vpp-dialog__lede">Compiled terms — not a guaranteed return.</p>
            <ul className="vpp-term-list">
              {TERM_ORDER.map((key) => {
                const term = termByKey(plan, key)
                const extra =
                  key === 'reserve_min' && term?.valueText && headroom != null
                    ? ` About ${formatKwhShort(headroom)} available on your setup.`
                    : ''
                return (
                  <TermRow
                    key={key}
                    planId={plan.id}
                    termKey={key}
                    term={term}
                    extraExplanation={extra}
                  />
                )
              })}
            </ul>
            {canShowExample ? (
              <div className="vpp-example">
                <Button
                  variant="outline-accent"
                  aria-expanded={exampleOpen}
                  aria-controls={exampleId}
                  onClick={() => setExampleOpen((open) => !open)}
                >
                  {exampleOpen ? 'Hide calculation' : 'See how this is calculated'}
                </Button>
                {exampleOpen ? (
                  <div id={exampleId} className="vpp-example__panel">
                    <p className="vpp-example__label">
                      Illustrative example — not a guaranteed return.
                    </p>
                    <p>
                      If {formatKwhShort(exampleKwh)} were dispatched at the compiled rate of{' '}
                      {formatExampleAud(plan.illustrativeRatePerKwh ?? 0)} per kWh, that would be{' '}
                      {formatExampleAud(exampleAud ?? 0)} in credits. This uses a round figure
                      {headroom != null ? ' (your reserve headroom)' : ' (10 kWh)'} so you can see
                      the arithmetic — it is not what your home would earn.
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <footer className="vpp-dialog__footer">
            <a href={plan.href} target="_blank" rel="noreferrer">
              Confirm current terms with {plan.brand}
            </a>
          </footer>
        </div>
      ) : null}
    </dialog>
  )
}

type TermRowProps = {
  planId: string
  termKey: (typeof TERM_ORDER)[number]
  term: VppSuggestionTerm | null
  extraExplanation: string
}

function TermRow({ planId, termKey, term, extraExplanation }: TermRowProps) {
  const Icon = TERM_ICONS[termKey]
  const available = Boolean(term?.valueText)
  const headingId = `vpp-term-${planId}-${termKey}`
  const stale = term ? isTermStale(term.lastVerified) : false

  return (
    <li className={available ? 'vpp-term' : 'vpp-term vpp-term--unavailable'}>
      <span className="vpp-term__icon" aria-hidden="true">
        <Icon />
      </span>
      <div>
        <h4 id={headingId} className="vpp-term__title">
          {TERM_LABELS[termKey]}
        </h4>
        {available ? (
          <p className="vpp-term__body">
            {term?.valueText}
            {extraExplanation}
          </p>
        ) : (
          <p className="vpp-term__body">
            <span className="vpp-term__unavailable-flag">
              <AlertIcon width={16} height={16} />
              <span>{UNAVAILABLE_TERM}</span>
            </span>
            The compiled table did not list this term.
          </p>
        )}
        {stale ? (
          <p className="vpp-term__stale" role="status">
            <AlertIcon width={16} height={16} />
            <span>May be outdated. {STALE_PROMPT}</span>
          </p>
        ) : null}
        {term ? (
          <p className="vpp-term__meta">
            <span>{shortSource(term.sourceLabel)}</span>
            <span>Verified {formatVerifiedDate(term.lastVerified)}</span>
          </p>
        ) : (
          <p className="vpp-term__meta">
            Source and verified date are not yet available for this term.
          </p>
        )}
      </div>
    </li>
  )
}
