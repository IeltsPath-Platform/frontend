import { useSyncExternalStore } from 'react'

/** One finished recording of a question, kept until the learner sends it, leaves, or the page is closed. */
export interface SavedRecording {
  blob: Blob
  durationSeconds: number
  /** The recording carried no sound. */
  silent: boolean
  /** The microphone it was recorded from. */
  inputName: string
}

type Recordings = ReadonlyMap<string, SavedRecording>

const EMPTY: Recordings = new Map()
const sessions = new Map<string, Recordings>()
const listeners = new Set<() => void>()

/**
 * The recordings of a Speaking test, by test (the package version) and question. The parts of a full test are separate
 * pages, so a recording has to outlive the page that made it; blobs cannot go in session storage, so they live here and
 * are lost when the page is reloaded. Each change makes a new map, which is what lets React see it.
 */
function publish(sessionId: string, next: Recordings) {
  if (next.size === 0) sessions.delete(sessionId)
  else sessions.set(sessionId, next)
  listeners.forEach((listener) => listener())
}

export function saveRecording(sessionId: string, questionId: string, recording: SavedRecording): void {
  publish(sessionId, new Map(sessions.get(sessionId) ?? EMPTY).set(questionId, recording))
}

export function getRecording(sessionId: string, questionId: string): SavedRecording | null {
  return sessions.get(sessionId)?.get(questionId) ?? null
}

export function clearSession(sessionId: string): void {
  if (sessions.has(sessionId)) publish(sessionId, EMPTY)
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The recordings of one test, and a new map whenever one is added or the session is cleared. */
export function useSessionRecordings(sessionId: string): Recordings {
  return useSyncExternalStore(subscribe, () => sessions.get(sessionId) ?? EMPTY)
}

/** Whether any test has a recording that would be lost on reload. */
export function hasUnsentRecordings(): boolean {
  return sessions.size > 0
}
