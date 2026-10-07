/**
 * The sentence under the charts. Charts update immediately; this waits until
 * the controls have been still, then asks for a phrasing of figures already
 * calculated.
 */
import { useEffect, useState } from 'react'
import { explainChange, type ExplainInput } from '../../lib/whatif/explain'

const PAUSE_MS = 1600

type Props = {
  active: boolean
  input: ExplainInput | null
}

/**
 * WhatIfExplain
 */
export function WhatIfExplain({ active, input }: Props) {
  const signature = input
    ? `${input.decision}|${input.quiet}|${input.changes.join('|')}|${input.facts.map((fact) => fact.display).join('|')}|${input.surplusDraft}`
    : ''
  const [shownFor, setShownFor] = useState(signature)
  const [text, setText] = useState<string | null>(null)
  const [source, setSource] = useState<'model' | 'template' | null>(null)
  const [reading, setReading] = useState(false)

  if (shownFor !== signature) {
    setShownFor(signature)
    setText(null)
    setSource(null)
    setReading(false)
  }

  useEffect(() => {
    if (!active || !input) return

    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setReading(true)
      void explainChange(input, controller.signal).then((result) => {
        if (controller.signal.aborted) return
        setText(result.text)
        setSource(result.source)
        setReading(false)
      })
    }, PAUSE_MS)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [active, input, signature])

  if (!active) {
    return <p className="whatif-explain__idle">Move a setting. The charts follow straight away.</p>
  }

  return (
    <div className="whatif-explain" aria-live="polite">
      {reading && !text ? <p className="whatif-explain__idle">Reading this change…</p> : null}
      {text ? <p className="whatif-explain__text">{text}</p> : null}
      {source ? (
        <p className="whatif-explain__source">
          {source === 'model'
            ? 'Written from these figures.'
            : 'Written from these figures. The model was not used.'}
        </p>
      ) : null}
    </div>
  )
}
