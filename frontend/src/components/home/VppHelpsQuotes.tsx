/**
 * Without / With a VPP cost pair used on home and the dashboard.
 */
import {
  VPP_HOW_IT_HELPS,
  formatExplainerWeekAud,
  formatExplainerYearAud,
} from '../../constants'

type Props = {
  withoutWeek: number
  withWeek: number
}

/**
 * VppHelpsQuotes
 * @param props.withoutWeek - Weekly gap cost on the retail grid
 * @param props.withWeek - Same gap priced through a VPP
 * @returns Two quote cards: year large, week small, verb highlighted
 */
export function VppHelpsQuotes({ withoutWeek, withWeek }: Props) {
  const yearSave = withoutWeek - withWeek

  return (
    <div className="vpp-helps__compare">
      <article className="vpp-compare__card vpp-helps__quote">
        <p className="vpp-helps__label">{VPP_HOW_IT_HELPS.withoutTitle}</p>
        <p className="vpp-compare__cost-value">
          {formatExplainerYearAud(withoutWeek)}
          <span className="vpp-compare__per">/yr</span>
        </p>
        <VerbDetail text={VPP_HOW_IT_HELPS.withoutDetail} tone="cost" />
        <p className="vpp-compare__cost-year">≈ {formatExplainerWeekAud(withoutWeek)}</p>
      </article>
      <article className="vpp-compare__card vpp-helps__quote">
        <p className="vpp-helps__label">{VPP_HOW_IT_HELPS.withTitle}</p>
        <p className="vpp-compare__cost-value">
          {formatExplainerYearAud(withWeek)}
          <span className="vpp-compare__per">/yr</span>
        </p>
        <VerbDetail text={VPP_HOW_IT_HELPS.withDetail} tone="save" />
        <p className="vpp-compare__cost-year">
          ≈ {formatExplainerWeekAud(withWeek)}
          {yearSave > 0.5 ? (
            <>
              {' '}
              — about {formatExplainerYearAud(yearSave)} less a year
            </>
          ) : null}
        </p>
      </article>
    </div>
  )
}

function VerbDetail({ text, tone }: { text: string; tone: 'cost' | 'save' }) {
  const space = text.indexOf(' ')
  const verb = space === -1 ? text : text.slice(0, space)
  const rest = space === -1 ? '' : text.slice(space)

  return (
    <p className="vpp-compare__detail">
      <span className={`vpp-helps__verb vpp-helps__verb--${tone}`}>{verb}</span>
      {rest}
    </p>
  )
}
