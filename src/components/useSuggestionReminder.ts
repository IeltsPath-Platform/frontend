import { useEffect, useState } from 'react'
import { buildSuggestionReminder, type OwlMessage } from './owl-messages'
import { localDay, readRemindedDay, writeRemindedDay } from './owl-suggestion-reminder'
import type { OwlSuggestionsState } from './useOwlSuggestions'

/** The owl waits this long on a page before it looks for something to suggest. */
const ASK_DELAY_MS = 6000
/** How long the reminder stays on screen before it goes away for the day. */
const VISIBLE_MS = 9000

interface Options {
  /** False where the owl must stay out of the way: exam screens, and the course list that already shows the strip. */
  enabled: boolean
  suggestions: OwlSuggestionsState
  load: () => void
}

/**
 * One nudge per day about the optional suggestions. It asks for the suggestions once the learner has settled on a
 * page, and only if there is something to offer does it speak; the day counts as reminded from the moment it speaks,
 * so moving between pages or closing the bubble never brings it back until tomorrow.
 */
export function useSuggestionReminder({ enabled, suggestions, load }: Options) {
  const [remindedDay, setRemindedDay] = useState(readRemindedDay)
  const [reminder, setReminder] = useState<OwlMessage | null>(null)
  const today = localDay(new Date())
  const due = enabled && remindedDay !== today

  useEffect(() => {
    if (!due || suggestions.status !== 'loading') return undefined
    const timer = window.setTimeout(load, ASK_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [due, suggestions.status, load])

  const message = due && suggestions.status === 'ready' ? buildSuggestionReminder(suggestions.items) : null
  if (message && reminder === null) {
    setRemindedDay(today)
    setReminder(message)
  }

  useEffect(() => {
    if (!reminder) return undefined
    writeRemindedDay(today)
    const timer = window.setTimeout(() => setReminder(null), VISIBLE_MS)
    return () => window.clearTimeout(timer)
  }, [reminder, today])

  return { reminder, dismissReminder: () => setReminder(null) }
}
