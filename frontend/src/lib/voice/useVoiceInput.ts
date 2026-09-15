/**
 * Voice input state for the setup wizard.
 *
 * Owns the listening lifecycle (US-5.2), the consent gate (US-5.3), what was
 * heard per field (US-5.4) and the failure paths (US-5.5). Components below it
 * stay presentational.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createBrowserRecognizer,
  isRecognitionSupported,
  type Recognizer,
  type RecognizerError,
} from './recognizer'
import { extractSlots, type ExtractedSlot } from './extract'
import type { ProfileData, SetupStepId } from '../../types/profile'

export type VoiceState = 'idle' | 'listening' | 'paused'

/** Consent is per device and survives a reload; it is not a user account. */
const CONSENT_KEY = 'mpp.voice.consent'

export type VoiceFailure = {
  code: RecognizerError | 'no-match'
  message: string
  /** True once the same step has failed twice, so the UI can offer typing. */
  suggestTyping: boolean
}

export type PendingChoice = {
  field: keyof ProfileData
  value: string
  heard: string
  options: string[]
}

type Options = {
  stepId: SetupStepId
  /** Write a value into the form. Called once per accepted slot. */
  onFill: (field: keyof ProfileData, value: string | number) => void
}

const MESSAGES: Record<RecognizerError | 'no-match', string> = {
  'no-match': 'We could not match that to any question on this step. Nothing has changed.',
  'not-supported': 'This browser cannot do voice input. You can still type your answers.',
  'permission-denied': 'Microphone access was blocked, so voice is unavailable. You can still type your answers.',
  'no-microphone': 'No microphone was found. You can still type your answers.',
  'no-speech': 'We did not hear anything. Nothing has changed.',
  network: 'Voice input could not reach the recogniser. You can still type your answers.',
  unknown: 'Something went wrong with voice input. Nothing has changed.',
}

export function useVoiceInput({ stepId, onFill }: Options) {
  const [state, setState] = useState<VoiceState>('idle')
  const [partial, setPartial] = useState('')
  const [failure, setFailure] = useState<VoiceFailure | null>(null)
  const [heard, setHeard] = useState<Partial<Record<keyof ProfileData, string>>>({})
  const [flagged, setFlagged] = useState<Partial<Record<keyof ProfileData, true>>>({})
  const [pending, setPending] = useState<PendingChoice | null>(null)
  const [consented, setConsented] = useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem(CONSENT_KEY) === 'yes',
  )

  const supported = useMemo(() => isRecognitionSupported(), [])
  const recognizerRef = useRef<Recognizer | null>(null)
  const failCount = useRef(0)
  // Read inside the recogniser callbacks, which are built once and would
  // otherwise close over the step and writer from the render that made them.
  const stepRef = useRef(stepId)
  const fillRef = useRef(onFill)

  useEffect(() => {
    stepRef.current = stepId
    fillRef.current = onFill
  })

  // Resetting during render is React's own answer to "clear state when a prop
  // changes" — an effect here would render once with last step's error showing.
  const [seenStep, setSeenStep] = useState(stepId)
  if (seenStep !== stepId) {
    setSeenStep(stepId)
    setFailure(null)
    setPending(null)
  }

  // Each step gets its own budget before we suggest typing instead.
  useEffect(() => {
    failCount.current = 0
  }, [stepId])

  const applySlots = useCallback((slots: ExtractedSlot[]) => {
    if (slots.length === 0) {
      failCount.current += 1
      setFailure({
        code: 'no-match',
        message: MESSAGES['no-match'],
        suggestTyping: failCount.current >= 2,
      })
      return
    }

    failCount.current = 0
    setFailure(null)

    for (const slot of slots) {
      // A closed-list guess is the one place a silent wrong answer is plausible,
      // so it waits for a yes rather than landing in the field.
      if (slot.options) {
        setPending({
          field: slot.field,
          value: String(slot.value),
          heard: slot.heard,
          options: slot.options,
        })
        continue
      }
      fillRef.current(slot.field, slot.value)
      setHeard((current) => ({ ...current, [slot.field]: slot.heard }))
      if (slot.confidence === 'confirm') {
        setFlagged((current) => ({ ...current, [slot.field]: true }))
      }
    }
  }, [])

  const ensureRecognizer = useCallback((): Recognizer => {
    if (recognizerRef.current) return recognizerRef.current
    const created = createBrowserRecognizer({
      onPartial: (text) => setPartial(text),
      onResult: (text) => {
        setPartial('')
        applySlots(extractSlots(text, stepRef.current).slots)
      },
      onError: (code) => {
        failCount.current += 1
        setFailure({
          code,
          message: MESSAGES[code],
          suggestTyping: failCount.current >= 2 || code === 'permission-denied',
        })
        if (code === 'permission-denied' || code === 'not-supported' || code === 'no-microphone') {
          setState('idle')
        }
      },
    })
    recognizerRef.current = created
    return created
  }, [applySlots])

  const start = useCallback(() => {
    setFailure(null)
    ensureRecognizer().start()
    setState('listening')
  }, [ensureRecognizer])

  /** Records consent, then starts — this is the only path that hits the mic. */
  const grantConsentAndStart = useCallback(() => {
    try {
      localStorage.setItem(CONSENT_KEY, 'yes')
    } catch {
      // Private browsing: consent simply will not be remembered.
    }
    setConsented(true)
    start()
  }, [start])

  const pause = useCallback(() => {
    recognizerRef.current?.pause()
    setPartial('')
    setState('paused')
  }, [])

  const stop = useCallback(() => {
    recognizerRef.current?.stop()
    recognizerRef.current = null
    setPartial('')
    setState('idle')
  }, [])

  /** Revokes consent on this device; the next press explains itself again. */
  const turnOff = useCallback(() => {
    stop()
    try {
      localStorage.removeItem(CONSENT_KEY)
    } catch {
      // Nothing to clear.
    }
    setConsented(false)
  }, [stop])

  const confirmPending = useCallback(() => {
    if (!pending) return
    fillRef.current(pending.field, pending.value)
    setHeard((current) => ({ ...current, [pending.field]: pending.heard }))
    setPending(null)
  }, [pending])

  const rejectPending = useCallback(() => setPending(null), [])

  const chooseInstead = useCallback((option: string) => {
    if (!pending) return
    fillRef.current(pending.field, option)
    setHeard((current) => ({ ...current, [pending.field]: 'chosen from the list' }))
    setPending(null)
  }, [pending])

  /** Clears the chip when the user types over a spoken answer. */
  const clearHeard = useCallback((field: keyof ProfileData) => {
    setHeard((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
    setFlagged((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }, [])

  // Listening must never outlive the form.
  useEffect(() => () => {
    recognizerRef.current?.stop()
    recognizerRef.current = null
  }, [])

  return {
    state,
    supported,
    consented,
    partial,
    failure,
    heard,
    flagged,
    pending,
    start,
    grantConsentAndStart,
    pause,
    stop,
    turnOff,
    confirmPending,
    rejectPending,
    chooseInstead,
    clearHeard,
    dismissFailure: () => setFailure(null),
  }
}
