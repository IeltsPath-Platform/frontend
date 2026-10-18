import type { AttemptItemResponse } from '~types/learningPath'
import type { AttemptResponse, ReadingAttempt } from './readingPracticeApi'

/** Saved answers as the answer store expects them. */
export function toSavedResponses(responses: AttemptResponse[]): AttemptItemResponse[] {
  return responses.map((response) => ({
    ...response,
    savedAt: '',
    submittedAt: null,
  }))
}

/** Seconds left (timed) or seconds spent (untimed) right now, so the clock is right on the first paint. */
export function clockSeconds(attempt: ReadingAttempt, timed: boolean) {
  if (timed) {
    const expiry = attempt.expiresAt ? Date.parse(attempt.expiresAt) : NaN
    return Number.isFinite(expiry) ? Math.max(0, Math.ceil((expiry - Date.now()) / 1000)) : 0
  }
  const started = attempt.startedAt ? Date.parse(attempt.startedAt) : NaN
  return Number.isFinite(started) ? Math.max(0, Math.floor((Date.now() - started) / 1000)) : 0
}

export function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
}
