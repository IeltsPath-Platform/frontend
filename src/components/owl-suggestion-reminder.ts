const STORAGE_KEY = 'ielts-path.owl.suggestion-reminder-day'

/** The learner's own calendar day as `YYYY-MM-DD`, so the reminder resets at their midnight. */
export function localDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** The day the owl last nudged about suggestions; `null` when it never did or storage is unavailable. */
export function readRemindedDay(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

/** A blocked or full storage only means the owl may nudge again, so the failure is ignored. */
export function writeRemindedDay(day: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, day)
  } catch {
    // Nothing to do: the reminder is a convenience.
  }
}
