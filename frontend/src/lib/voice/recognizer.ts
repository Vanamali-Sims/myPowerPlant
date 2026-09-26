/**
 * Speech recognition adapter.
 *
 * Wraps whatever engine actually turns audio into text behind one interface, so
 * the UI never talks to a vendor API directly and the engine can be swapped
 * without touching a component.
 *

/** What the engine reports back to the UI. */
export type RecognizerStatus = 'idle' | 'listening' | 'paused' | 'error'

export type RecognizerEvents = {
  /** A settled phrase the user finished saying. */
  onResult: (transcript: string) => void
  /** Words still being spoken — shown live, never written to a field. */
  onPartial?: (transcript: string) => void
  onError: (code: RecognizerError) => void
  onEnd?: () => void
}

export type RecognizerError =
  | 'not-supported'
  | 'permission-denied'
  | 'no-microphone'
  | 'no-speech'
  | 'network'
  | 'unknown'

export type Recognizer = {
  start: () => void
  pause: () => void
  stop: () => void
  /** True when this browser can run the engine at all. */
  readonly supported: boolean
}

/** Minimal shape of the vendor API, typed locally so we avoid a DOM-lib dependency. */
type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechResultEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}

type SpeechResultEventLike = {
  resultIndex: number
  results: ArrayLike<
    ArrayLike<{ transcript: string }> & { isFinal: boolean }
  >
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/** True when the current browser exposes a usable engine. */
export function isRecognitionSupported(): boolean {
  return getCtor() !== null
}

function mapError(code: string): RecognizerError {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'permission-denied'
    case 'audio-capture':
      return 'no-microphone'
    case 'no-speech':
      return 'no-speech'
    case 'network':
      return 'network'
    default:
      return 'unknown'
  }
}

/**
 * createBrowserRecognizer
 * @param events - Callbacks for results, errors and end-of-stream
 * @returns Recognizer - start/pause/stop handle, or an inert one if unsupported
 *
 * `pause` and `stop` both end the underlying stream; the difference is intent,
 * and the hook above keeps the answers either way. We restart on `onend` while
 * the caller still wants to listen, because the vendor engine stops on its own
 * after a silence and a user mid-sentence should not have to press again.
 */
export function createBrowserRecognizer(events: RecognizerEvents): Recognizer {
  const Ctor = getCtor()
  if (!Ctor) {
    return {
      start: () => events.onError('not-supported'),
      pause: () => {},
      stop: () => {},
      supported: false,
    }
  }

  const Engine = Ctor
  let engine: SpeechRecognitionLike | null = null
  let wantListening = false

  function build(): SpeechRecognitionLike {
    const next = new Engine()
    next.lang = 'en-AU'
    next.continuous = true
    next.interimResults = true
    next.maxAlternatives = 1

    next.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        const text = result[0]?.transcript ?? ''
        if (!text.trim()) continue
        if (result.isFinal) events.onResult(text)
        else events.onPartial?.(text)
      }
    }

    next.onerror = (event) => {
      // A silence timeout is not a failure worth surfacing while still listening.
      if (event.error === 'no-speech' && wantListening) return
      events.onError(mapError(event.error))
    }

    next.onend = () => {
      if (wantListening) {
        // Vendor engine self-terminates on silence; resume so the user is not cut off.
        try {
          next.start()
          return
        } catch {
          wantListening = false
        }
      }
      events.onEnd?.()
    }

    return next
  }

  return {
    supported: true,
    start() {
      wantListening = true
      if (!engine) engine = build()
      try {
        engine.start()
      } catch {
        // start() throws if already running, harmless, we are already listening.
      }
    },
    pause() {
      wantListening = false
      engine?.stop()
    },
    stop() {
      wantListening = false
      engine?.abort()
      engine = null
      events.onEnd?.()
    },
  }
}
