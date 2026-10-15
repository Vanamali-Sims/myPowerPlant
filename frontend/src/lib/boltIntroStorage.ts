/**
 * Whether Bolt's one-time centre hello on the path-choice screen was shown
 * this browser session (survives refresh, resets when the tab closes).
 */
import { BOLT_HELLO_STORAGE_KEY } from '../constants/storage'

function store(): Storage | null {
  try {
    return sessionStorage
  } catch {
    return null
  }
}

export function hasSeenBoltHello(): boolean {
  return store()?.getItem(BOLT_HELLO_STORAGE_KEY) === '1'
}

export function markBoltHelloSeen(): void {
  store()?.setItem(BOLT_HELLO_STORAGE_KEY, '1')
}

export function clearBoltHelloSeen(): void {
  store()?.removeItem(BOLT_HELLO_STORAGE_KEY)
}
