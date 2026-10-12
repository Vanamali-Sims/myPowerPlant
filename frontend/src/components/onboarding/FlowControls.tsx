import { useState } from 'react'
import { FLOW_CONTROLS } from '../../constants/onboarding'
import { Button } from '../ui/Button'
import { Callout } from '../ui/Callout'

type Props = {
  variant: 'improve' | 'explore'
  /** Hub footer (dark) vs dialog (light panel). Omit for explore inline blocks. */
  improvePlacement?: 'hub' | 'dialog'
  embedded?: boolean
  onSwitchToExplore: () => void
  onSwitchToImprove: () => void
  onResetDevice: () => void
}

/**
 * Switch journey or wipe local data without opening Profile (improve journey has no profile screen).
 */
export function FlowControls({
  variant,
  improvePlacement,
  embedded = false,
  onSwitchToExplore,
  onSwitchToImprove,
  onResetDevice,
}: Props) {
  const [confirmReset, setConfirmReset] = useState(false)
  const hubDark = variant === 'improve' && improvePlacement === 'hub'
  const inDialog = improvePlacement === 'dialog'

  const classes = [
    'flow-controls',
    hubDark ? 'flow-controls--improve-hub' : `flow-controls--${variant}`,
    inDialog ? 'flow-controls--dialog' : '',
    embedded ? 'flow-controls--embedded' : '',
  ].filter(Boolean)

  return (
    <section className={classes.join(' ')} aria-labelledby={inDialog ? undefined : 'flow-controls-title'}>
      {inDialog ? (
        <p id="flow-controls-dialog-lede" className="flow-controls__lede">{FLOW_CONTROLS.lede}</p>
      ) : (
        <>
          <h2 id="flow-controls-title" className="flow-controls__title">{FLOW_CONTROLS.title}</h2>
          <p className="flow-controls__lede">{FLOW_CONTROLS.lede}</p>
        </>
      )}
      <div className={`flow-controls__actions${inDialog ? ' flow-controls__actions--dialog' : ''}`}>
        {variant === 'improve' ? (
          <Button
            variant={inDialog ? 'primary' : 'secondary'}
            type="button"
            onClick={onSwitchToExplore}
          >
            {FLOW_CONTROLS.switchToExplore}
          </Button>
        ) : (
          <Button
            variant={inDialog ? 'primary' : 'secondary'}
            type="button"
            onClick={onSwitchToImprove}
          >
            {FLOW_CONTROLS.switchToImprove}
          </Button>
        )}
        <Button variant="danger" type="button" onClick={() => setConfirmReset(true)}>
          {FLOW_CONTROLS.resetAll}
        </Button>
      </div>
      {confirmReset ? (
        <Callout
          tone="action"
          title={FLOW_CONTROLS.resetConfirmTitle}
          action={
            <Button
              variant="danger"
              type="button"
              onClick={() => {
                setConfirmReset(false)
                onResetDevice()
              }}
            >
              {FLOW_CONTROLS.resetConfirmAction}
            </Button>
          }
        >
          {FLOW_CONTROLS.resetConfirmBody}
        </Callout>
      ) : null}
    </section>
  )
}
