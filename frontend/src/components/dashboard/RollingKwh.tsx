import { useEffect, useRef, useState } from 'react'
import { formatKwh } from '../../lib/kpis'
import { useAnimatedNumber } from '../../lib/useAnimatedNumber'

type Props = {
  value: number
  delayMs?: number
  className?: string
}

/**
 * RollingKwh
 * @param props.value - Target kilowatt-hours after a timeframe change
 * @param props.delayMs - Stagger so neighbouring figures stop in sequence
 * @returns Formatted kWh that ticks toward the new total
 *
 * The live digits are decorative. Assistive text always reads the settled value.
 */
export function RollingKwh({ value, delayMs = 0, className = '' }: Props) {
  const display = useAnimatedNumber(value, { delayMs })
  const [spinKey, setSpinKey] = useState(0)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    setSpinKey((key) => key + 1)
  }, [value])

  return (
    <span className={`energy-ticker ${className}`.trim()}>
      <span className="visually-hidden">{formatKwh(value)}</span>
      <span
        key={spinKey}
        className={`energy-ticker__face${spinKey > 0 ? ' is-rolling' : ''}`}
        aria-hidden="true"
      >
        {formatKwh(display)}
      </span>
    </span>
  )
}
