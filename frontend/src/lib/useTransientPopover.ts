import { useEffect, useState } from 'react'

/**
 * Tracks which one of a set of triggers (keyed by id) currently has an
 * inline popover open, auto-dismissing it after `timeoutMs`.
 */
export function useTransientPopover(timeoutMs = 3000) {
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    if (!openId) return
    const timer = setTimeout(() => setOpenId(null), timeoutMs)
    return () => clearTimeout(timer)
  }, [openId, timeoutMs])

  return [openId, setOpenId] as const
}
