/**
 * The parts of an exam attempt whose recording has already started. The recording plays once, so the list survives a reload
 * of the page: coming back must not give the learner the part to listen to again.
 */
const KEY_PREFIX = 'listening-played:'

export function readPlayedSections(attemptId: string): ReadonlySet<string> {
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + attemptId)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [])
  } catch {
    return new Set()
  }
}

export function writePlayedSections(attemptId: string, sectionIds: ReadonlySet<string>) {
  try {
    window.localStorage.setItem(KEY_PREFIX + attemptId, JSON.stringify([...sectionIds]))
  } catch {
    /* private mode: the list lives in memory only */
  }
}
