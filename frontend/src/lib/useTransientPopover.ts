/**
 * Shared hook for “coming soon” and locked-nav popovers that dismiss themselves.
 */
import { useEffect, useState } from 'react'

/**
 * useTransientPopover
 * @param timeoutMs - How long the popover stays open before closing
 * @returns A [openId, setOpenId] tuple, same shape as useState
 *
 * Only one trigger id can be open at a time. The timer restarts whenever
 * openId changes so a second click does not leave a stale popover up.
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
