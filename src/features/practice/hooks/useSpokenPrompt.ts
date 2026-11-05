import { useCallback, useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'practice.speaking.autoRead'
/** A short pause before the first word: the page has settled, and a cancel just before a speak is not dropped. */
const START_DELAY_MS = 300
const RATE = 0.9

export interface SpokenPrompt {
  /** False in a browser without speech synthesis; the controls are hidden then. */
  supported: boolean
  speaking: boolean
  /** The browser refused to start the voice on its own, so the learner has to press the button once. */
  blocked: boolean
  autoRead: boolean
  setAutoRead: (on: boolean) => void
  /** Reads the prompt from the start. */
  replay: () => void
  stop: () => void
}

function engine(): SpeechSynthesis | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return null
  return window.speechSynthesis
}

function storedAutoRead(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== 'off'
  } catch {
    return true
  }
}

/** British English first (the examiner's accent), then American, then any English voice. */
function pickVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const tag = (voice: SpeechSynthesisVoice) => voice.lang.toLowerCase().replace('_', '-')
  return voices.find((voice) => tag(voice) === 'en-gb')
    ?? voices.find((voice) => tag(voice) === 'en-us')
    ?? voices.find((voice) => tag(voice).startsWith('en'))
    ?? null
}

/**
 * Reads a question aloud with the browser's own voice, so the learner hears it the way an examiner would ask it, without
 * stored audio. It starts by itself when the text changes (unless the learner turned that off) and stops when the text
 * changes again or the page goes away. A browser may refuse sound the learner did not ask for; that shows as `blocked`.
 */
export function useSpokenPrompt(text: string): SpokenPrompt {
  const synth = engine()
  const [autoRead, setAutoReadState] = useState(storedAutoRead)
  const [speaking, setSpeaking] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const voice = useRef<SpeechSynthesisVoice | null>(null)
  const current = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    if (!synth) return
    const load = () => { voice.current = pickVoice(synth.getVoices()) }
    load()
    synth.addEventListener?.('voiceschanged', load)
    return () => synth.removeEventListener?.('voiceschanged', load)
  }, [synth])

  const stop = useCallback(() => {
    current.current = null
    synth?.cancel()
    setSpeaking(false)
  }, [synth])

  const replay = useCallback(() => {
    if (!synth || !text) return
    synth.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = voice.current?.lang ?? 'en-GB'
    if (voice.current) utterance.voice = voice.current
    utterance.rate = RATE
    // A cancelled utterance reports its end late; only the latest one may change the state.
    utterance.onstart = () => { if (current.current === utterance) { setSpeaking(true); setBlocked(false) } }
    utterance.onend = () => { if (current.current === utterance) setSpeaking(false) }
    utterance.onerror = (event) => {
      if (current.current !== utterance) return
      setSpeaking(false)
      if (event.error === 'not-allowed') setBlocked(true)
    }
    current.current = utterance
    synth.speak(utterance)
  }, [synth, text])

  // One voice per question: a new text silences the old one, and so does leaving the page.
  useEffect(() => () => { current.current = null; synth?.cancel() }, [synth, text])

  useEffect(() => {
    if (!synth || !autoRead || !text) return
    const timer = window.setTimeout(replay, START_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [synth, autoRead, text, replay])

  const setAutoRead = useCallback((on: boolean) => {
    setAutoReadState(on)
    try {
      window.localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off')
    } catch {
      // A private window may refuse storage; the choice then lasts until the page is closed.
    }
    if (!on) stop()
  }, [stop])

  return { supported: synth !== null, speaking, blocked, autoRead, setAutoRead, replay, stop }
}
