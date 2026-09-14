/**
 * Dashboard VPP Suggestions: matched plan terms and an illustrative payment example.
 */
import { useId, useState } from 'react'
import type { BatteryModelRow, VppSuggestionPlan, VppSuggestionTerm } from '../../lib/methodologyApi'
import {
  EXAMPLE_KWH,
  TERM_LABELS,
  TERM_ORDER,
  UNAVAILABLE_TERM,
  formatExampleAud,
  formatKwhShort,
  formatVerifiedDate,
  illustrativePayment,
  matchSuggestionPlans,
  termByKey,
  type MatchReasonCode,
} from '../../lib/vppSuggestions'
import type { ProfileData } from '../../types/profile'
import { Button } from '../ui/Button'
import { Callout } from '../ui/Callout'
import { AlertIcon, BatteryIcon, InfoIcon, LockIcon, ShieldIcon } from '../ui/icons'

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
 * No plan cards until a profile exists. Terms are text, not icons-only.
 * Payment dollars appear only inside the labelled illustrative example.
 */
export function VppSuggestions({
  hasProfile,
  profile,
  plans,
  batteryModels,
  onStartSetup,
}: Props) {
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
      <p className="vpp-suggestions__lede">
        These are compiled plan terms, not a live shopping engine. No figure here is a guaranteed
        return. Providers decide when the battery discharges for events — you don’t choose those
        times.
      </p>

      {emptyReason ? (
        <Callout tone="neutral" icon={<AlertIcon />} title="No matching plans yet">
          {EMPTY_REASON[emptyReason]}
        </Callout>
      ) : (
        <ul className="vpp-plan-list">
          {matches.map((item) => (
            <li key={item.plan.id}>
              <PlanTermsCard plan={item.plan} reserveHeadroomKwh={item.reserveHeadroomKwh} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

type CardProps = {
  plan: VppSuggestionPlan
  reserveHeadroomKwh: number | null
}

function PlanTermsCard({ plan, reserveHeadroomKwh }: CardProps) {
  const exampleId = useId()
  const [exampleOpen, setExampleOpen] = useState(false)
  const paymentTerm = termByKey(plan, 'payment')
  const exampleKwh = reserveHeadroomKwh && reserveHeadroomKwh > 0 ? reserveHeadroomKwh : EXAMPLE_KWH
  const exampleAud = illustrativePayment(plan.illustrativeRatePerKwh, exampleKwh)
  const canShowExample = paymentTerm != null && exampleAud != null && plan.illustrativeRatePerKwh != null

  return (
    <article className="vpp-plan-card">
      <p className="vpp-plan-card__brand">{plan.brand}</p>
      <h3>{plan.name}</h3>
      <p className="vpp-plan-card__eligibility">
        Listed for {plan.eligibleRegions.join(', ')}
        {plan.approvedBatteries.length === 1
          ? ` and ${plan.approvedBatteries[0]}.`
          : ` and ${plan.approvedBatteries.length} approved battery models.`}
      </p>

      <ul className="vpp-term-list">
        {TERM_ORDER.map((key) => {
          const term = termByKey(plan, key)
          const extra =
            key === 'reserve_min' && term?.valueText && reserveHeadroomKwh != null
              ? ` On your setup that’s about ${formatKwhShort(reserveHeadroomKwh)} the VPP could use above that reserve.`
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
              <p className="vpp-example__label">Illustrative example — not a guaranteed return.</p>
              <p>
                If {formatKwhShort(exampleKwh)} were dispatched at the compiled rate of{' '}
                {formatExampleAud(plan.illustrativeRatePerKwh ?? 0)} per kWh, that would be{' '}
                {formatExampleAud(exampleAud)} in credits. This uses a round figure
                {reserveHeadroomKwh != null ? ' (your reserve headroom)' : ' (10 kWh)'} so you can
                see the arithmetic — it is not what your home would earn.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      <p className="vpp-plan-card__link">
        <a href={plan.href} target="_blank" rel="noreferrer">
          Provider page for {plan.name}
        </a>
      </p>
    </article>
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

  return (
    <li className={available ? 'vpp-term' : 'vpp-term vpp-term--unavailable'}>
        <span className="vpp-term__icon" aria-hidden="true">
        <Icon />
      </span>
      <div>
        <h4 id={headingId} className="vpp-term__title">
          <span className="vpp-term__icon-label">
            {TERM_LABELS[termKey]}
          </span>
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
            The compiled table did not list this term. That is not a “no” from the provider.
          </p>
        )}
        {term ? (
          <p className="vpp-term__meta">
            Source: {term.sourceLabel} Last verified {formatVerifiedDate(term.lastVerified)}.
          </p>
        ) : (
          <p className="vpp-term__meta">Source and verified date are not yet available for this term.</p>
        )}
      </div>
    </li>
  )
}
