import type { NotebookEntryResponse } from '../api/notebookApi'

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

/** Formats a Date into YYYY-MM-DD (UTC) for deterministic daily seeds */
export function getDailyDateKey(date: Date = new Date()): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Selects a deterministic "Word of the Day" from the learner's entries.
 * Prioritizes weaker/learning cards (UNKNOWN, FAMILIAR, LEARNING).
 */
export function selectWordOfTheDay(
  entries: readonly NotebookEntryResponse[],
  date: Date = new Date()
): NotebookEntryResponse | null {
  if (!entries || entries.length === 0) return null

  // Priority pool: words that are not yet MASTERED
  const nonMastered = entries.filter((e) => e.level !== 'MASTERED')
  const pool = nonMastered.length > 0 ? nonMastered : entries

  const dateKey = getDailyDateKey(date)
  const index = hashString(dateKey) % pool.length

  return pool[index] ?? null
}
