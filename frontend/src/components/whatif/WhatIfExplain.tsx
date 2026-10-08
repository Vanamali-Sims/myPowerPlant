/**
 * The sentence on the dark stage. Charts update immediately; this waits until
 * the controls have been still, then asks for a phrasing of figures already
 * calculated. The first sentence stays visible. The rest sits behind Why.
 */
import { useEffect, useState } from 'react'
import { explainChange, type ExplainInput } from '../../lib/whatif/explain'

const PAUSE_MS = 1600

type Props = {
  active: boolean
  input: ExplainInput | null
}

function splitSentences(text: string): { lead: string; rest: string } {
  const parts = text.match(/[^.!?]+[.!?]+(?:\s|$)/g)
  if (!parts?.length) return { lead: text, rest: '' }
  return { lead: parts[0].trim(), rest: parts.slice(1).join(' ').trim() }
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

  const split = text ? splitSentences(text) : null
  const verdict = !active
    ? 'This is your saved setup. Change something on the left.'
    : split?.lead || (reading ? 'Reading this change…' : '')
  const writing = active && reading && !text

  return (
    <div>
      <p className={`whatif-verdict${writing ? ' is-writing' : ''}`}>{verdict}</p>
      {active && split ? (
        <details className="whatif-why">
          <summary>Why?</summary>
          {split.rest ? <p>{split.rest}</p> : null}
          {source ? (
            <span className="whatif-why__ai">
              {source === 'model'
                ? 'Written from these figures'
                : 'Written from these figures. The model was not used.'}
            </span>
          ) : null}
        </details>
      ) : null}
    </div>
  )
}
