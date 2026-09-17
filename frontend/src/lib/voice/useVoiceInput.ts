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
  /**
   * Write answers into the form. Takes every field from one utterance at once,
   * because the form's patch closes over its own state — one call per field in
   * the same tick and only the last one lands.
   */
  onFill: (updates: Partial<ProfileData>) => void
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
  /* Fast speech is chunked by the engine at arbitrary points, often mid-phrase.
     Extracting each chunk alone breaks anchor binding — "there's four" and "of
     us in a three bedroom place" arrive separately and `people` never binds.
     So finals are kept in a short rolling window and extraction runs over the
     join, which lets a phrase split across chunks still be seen whole. */
  const windowRef = useRef<{ text: string; at: number }[]>([])
  /** What this window has already written, so a re-extract does not re-fire. */
  const appliedRef = useRef<Map<string, string>>(new Map())
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
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
    windowRef.current = []
    appliedRef.current.clear()
  }, [stepId])

  const applySlots = useCallback((slots: ExtractedSlot[]) => {
    // A window that yields nothing is not reported here any more: mid-sentence
    // chunks legitimately extract to nothing, and raising an error on each one
    // buried the user in "could not match that" while they were still talking.
    // The settle timer decides that, once speech has actually stopped.
    if (slots.length === 0) return

    failCount.current = 0
    setFailure(null)

    // Gathered first, written once. See the note on `onFill`.
    const updates: Partial<ProfileData> = {}
    const words: Partial<Record<keyof ProfileData, string>> = {}
    const toFlag: Partial<Record<keyof ProfileData, true>> = {}

    for (const slot of slots) {
      // Re-extracting a growing window re-finds slots already written. Skip the
      // unchanged ones; a different value is a correction and does go through.
      const seen = appliedRef.current.get(slot.field as string)
      if (seen === String(slot.value)) continue
      appliedRef.current.set(slot.field as string, String(slot.value))

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

      Object.assign(updates, { [slot.field]: slot.value })
      // Derived answers fill their field but stay out of the "what you said"
      // list — the user did not say them, and the question is not on screen.
      if (!slot.derived) words[slot.field] = slot.heard
      if (slot.confidence === 'confirm') toFlag[slot.field] = true
    }

    if (Object.keys(updates).length === 0) return
    fillRef.current(updates)
    setHeard((current) => ({ ...current, ...words }))
    if (Object.keys(toFlag).length > 0) {
      setFlagged((current) => ({ ...current, ...toFlag }))
    }
  }, [])

  const ensureRecognizer = useCallback((): Recognizer => {
    if (recognizerRef.current) return recognizerRef.current
    const created = createBrowserRecognizer({
      onPartial: (text) => {
        setPartial(text)
        // Simply talking again clears a "could not match that". Requiring a
        // click on Try again before carrying on made a miss feel like a wall,
        // when recognition never actually stopped listening.
        setFailure((current) => (current ? null : current))
      },
      onResult: (text) => {
        setPartial('')

        const now = Date.now()
        windowRef.current.push({ text, at: now })
        // Nine seconds is long enough to span a chunked sentence and short
        // enough that an answer given a minute ago cannot resurface.
        windowRef.current = windowRef.current.filter((part) => now - part.at < 9000)

        const joined = windowRef.current.map((part) => part.text).join(' ')
        const found = extractSlots(joined, stepRef.current).slots
        applySlots(found)

        // Only call it a miss once the speaker has actually stopped.
        if (settleTimer.current) clearTimeout(settleTimer.current)
        settleTimer.current = setTimeout(() => {
          if (appliedRef.current.size > 0) return
          failCount.current += 1
          setFailure({
            code: 'no-match',
            message: MESSAGES['no-match'],
            suggestTyping: failCount.current >= 2,
          })
        }, 1400)
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

  /** A new utterance starts from a clean window. */
  const resetWindow = useCallback(() => {
    windowRef.current = []
    appliedRef.current.clear()
    if (settleTimer.current) {
      clearTimeout(settleTimer.current)
      settleTimer.current = null
    }
  }, [])

  const pause = useCallback(() => {
    resetWindow()
    recognizerRef.current?.pause()
    setPartial('')
    setState('paused')
  }, [resetWindow])

  const stop = useCallback(() => {
    resetWindow()
    recognizerRef.current?.stop()
    recognizerRef.current = null
    setPartial('')
    setState('idle')
  }, [resetWindow])

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
    fillRef.current({ [pending.field]: pending.value })
    setHeard((current) => ({ ...current, [pending.field]: pending.heard }))
    setPending(null)
  }, [pending])

  const rejectPending = useCallback(() => setPending(null), [])

  const chooseInstead = useCallback((option: string) => {
    if (!pending) return
    fillRef.current({ [pending.field]: option })
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
    if (settleTimer.current) clearTimeout(settleTimer.current)
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
