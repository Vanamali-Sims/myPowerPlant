/**
 * Dashboard VPP Suggestions: compact ranked cards and two dialogs
 * (why it suits you, and full terms / learn more).
 */
import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from 'react'
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
  planFitCopy,
  shortSource,
  termByKey,
  type MatchReasonCode,
  type SuggestionMatch,
} from '../../lib/vppSuggestions'
import { VPP_DEFAULT_HEADING, VPP_STORY_HEADINGS } from '../../constants'
import type { RiverFork } from '../../lib/energyRiver'
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
  fork?: RiverFork | null
  onStartSetup: () => void
  /** Tighter layout when rendered directly under the annual savings card. */
  fromSavings?: boolean
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

type DialogKind = 'why' | 'terms'

type OpenDialog = {
  match: SuggestionMatch
  kind: DialogKind
}

/**
 * VppSuggestions
 * @param props.hasProfile - Whether onboarding has been saved on this device
 * @param props.profile - Household answers used only for matching, never sent
 * @returns JSX.Element
 *
 * Cards stay compact at the mouth of the energy river. Why-it-suits-you
 * (US-3.7) and full terms (US-3.1/3.2) each open in their own dialog so the
 * dashboard report is not regenerated.
 */
export function VppSuggestions({
  hasProfile,
  profile,
  plans,
  batteryModels,
  fork = null,
  onStartSetup,
  fromSavings = false,
}: Props) {
  const [dialog, setDialog] = useState<OpenDialog | null>(null)
  const openerRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (dialog) return
    openerRef.current?.focus()
  }, [dialog])

  function openDialog(match: SuggestionMatch, kind: DialogKind, opener: HTMLButtonElement) {
    openerRef.current = opener
    setDialog({ match, kind })
  }

  function closeDialog() {
    setDialog(null)
  }

  const heading = fork ? VPP_STORY_HEADINGS[fork] : VPP_DEFAULT_HEADING

  if (!hasProfile) {
    return (
      <section className="vpp-suggestions" aria-labelledby="vpp-suggestions-heading">
        <p className="eyebrow">{VPP_DEFAULT_HEADING.eyebrow}</p>
        <h2 id="vpp-suggestions-heading">{VPP_DEFAULT_HEADING.title}</h2>
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
  const openMatch = dialog?.match ?? null

  return (
    <section
      id="vpp-suggestions"
      className={`vpp-suggestions${fromSavings ? ' vpp-suggestions--from-savings' : ''}`}
      aria-labelledby="vpp-suggestions-heading"
    >
      <p className="eyebrow">{heading.eyebrow}</p>
      <h2 id="vpp-suggestions-heading">{heading.title}</h2>
      {heading.lede ? <p className="vpp-suggestions__lede">{heading.lede}</p> : null}

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
              onOpen={(kind, opener) => openDialog(item, kind, opener)}
            />
          ))}
        </div>
      )}

      <WhyDialog
        open={dialog?.kind === 'why'}
        match={dialog?.kind === 'why' ? openMatch : null}
        profile={profile}
        onClose={closeDialog}
      />
      <TermsDialog
        open={dialog?.kind === 'terms'}
        match={dialog?.kind === 'terms' ? openMatch : null}
        onClose={closeDialog}
      />
    </section>
  )
}

type CardProps = {
  match: SuggestionMatch
  featured?: boolean
  onOpen: (kind: DialogKind, opener: HTMLButtonElement) => void
}

function PlanSummaryCard({ match, featured = false, onOpen }: CardProps) {
  const facts = compactCardFacts(match.plan, null)

  function handleOpen(kind: DialogKind) {
    return (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      onOpen(kind, event.currentTarget)
    }
  }

  return (
    <article className="dashboard-card vpp-plan-card">
      {featured ? <span className="kpi-badge kpi-badge--fact">Top match</span> : null}
      <p className="eyebrow">{match.plan.brand}</p>
      <h3 className="vpp-plan-card__name">{match.plan.name}</h3>
      <div className="vpp-stat-row">
        {facts.map((fact) => (
          <div key={fact.label} className="vpp-stat">
            <p className="eyebrow">{fact.label}</p>
            <p className="kpi-card__value">{fact.value}</p>
          </div>
        ))}
      </div>
      <div className="vpp-plan-card__actions">
        <button
          type="button"
          className="vpp-plan-card__cta"
          aria-haspopup="dialog"
          aria-label={`Why ${match.plan.name} may suit this home`}
          onClick={handleOpen('why')}
        >
          Why it suits you
        </button>
        <button
          type="button"
          className="vpp-plan-card__cta"
          aria-haspopup="dialog"
          aria-label={`Learn more about terms for ${match.plan.name}`}
          onClick={handleOpen('terms')}
        >
          Learn more
        </button>
      </div>
    </article>
  )
}

type ModalShellProps = {
  open: boolean
  titleId: string
  brand: string
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

function VppModal({ open, titleId, brand, title, onClose, children, footer }: ModalShellProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const node = dialogRef.current
    if (!node) return
    if (open) {
      if (!node.open) node.showModal()
    } else if (node.open) {
      node.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className="vpp-dialog"
      aria-labelledby={titleId}
      aria-modal="true"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose()
      }}
    >
      {open ? (
        <div className="vpp-dialog__panel">
          <header className="vpp-dialog__header">
            <div>
              <p className="eyebrow">{brand}</p>
              <h3 id={titleId}>{title}</h3>
            </div>
            <Button className="vpp-dialog__close" variant="edit" onClick={onClose}>
              Close
            </Button>
          </header>
          <div className="vpp-dialog__body">{children}</div>
          {footer ? <footer className="vpp-dialog__footer">{footer}</footer> : null}
        </div>
      ) : null}
    </dialog>
  )
}

type WhyDialogProps = {
  open: boolean
  match: SuggestionMatch | null
  profile: ProfileData
  onClose: () => void
}

function WhyDialog({ open, match, profile, onClose }: WhyDialogProps) {
  const titleId = useId()
  const plan = match?.plan ?? null
  const fit = match ? planFitCopy(profile, match) : null

  return (
    <VppModal
      open={open && Boolean(plan && fit)}
      titleId={titleId}
      brand={plan?.brand ?? ''}
      title={plan ? `Why ${plan.name} may suit this home` : ''}
      onClose={onClose}
    >
      {fit ? (
        <>
          <p className="vpp-dialog__lede">
            Based on your saved battery and location. Not a payment comparison or a guaranteed
            result.
          </p>
          <section className="vpp-fit-block" aria-labelledby={`${titleId}-why`}>
            <h4 id={`${titleId}-why`}>Why it may suit you</h4>
            <ul className="vpp-fit-list">
              {fit.why.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
          <section className="vpp-fit-block" aria-labelledby={`${titleId}-trade`}>
            <h4 id={`${titleId}-trade`}>Trade-offs</h4>
            <ul className="vpp-fit-list">
              {fit.tradeoffs.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </VppModal>
  )
}

type TermsDialogProps = {
  open: boolean
  match: SuggestionMatch | null
  onClose: () => void
}

function TermsDialog({ open, match, onClose }: TermsDialogProps) {
  const titleId = useId()
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
    <VppModal
      open={open && Boolean(plan)}
      titleId={titleId}
      brand={plan?.brand ?? ''}
      title={plan?.name ?? ''}
      onClose={onClose}
      footer={
        plan ? (
          <a href={plan.href} target="_blank" rel="noreferrer">
            Confirm current terms with {plan.brand}
          </a>
        ) : null
      }
    >
      {plan ? (
        <>
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
                onClick={() => setExampleOpen((state) => !state)}
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
        </>
      ) : null}
    </VppModal>
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
