import { useCallback, useRef, useState } from 'react'
import { learningApi } from '@/features/learning-path/api'
import type { Suggestion } from '~types/learningPath'

/** An open panel asks again at most this often, so flipping between tabs does not hit the API each time. */
const REFRESH_MS = 60_000

/** `loading` also means "not asked yet"; the owl never fetches until the reminder or the panel needs it. */
export type OwlSuggestionsState =
  | { status: 'loading' }
  | { status: 'ready'; items: Suggestion[] }
  | { status: 'failed' }

export interface OwlSuggestions {
  state: OwlSuggestionsState
  /** Fetches the suggestions unless a request is running or one finished a moment ago. */
  load: () => void
}

/**
 * The learner's suggestions for the owl. Unlike quests and badges they are not loaded on every page: the request is
 * heavier (it reads mastery and Content), so it runs only when the owl is about to remind or the panel shows the tab.
 * A failure is quiet, since the owl is only decoration; the panel offers a retry.
 */
export function useOwlSuggestions(isLoggedIn: boolean): OwlSuggestions {
  const [state, setState] = useState<OwlSuggestionsState>({ status: 'loading' })
  const [wasLoggedIn, setWasLoggedIn] = useState(isLoggedIn)
  const running = useRef(false)
  const lastLoad = useRef(0)

  // The next account must not see the previous account's suggestions.
  if (isLoggedIn !== wasLoggedIn) {
    setWasLoggedIn(isLoggedIn)
    if (!isLoggedIn) setState({ status: 'loading' })
  }

  const load = useCallback(() => {
    if (!isLoggedIn || running.current || Date.now() - lastLoad.current < REFRESH_MS) return
    running.current = true
    lastLoad.current = Date.now()
    learningApi.getSuggestions().then(
      (items) => setState({ status: 'ready', items }),
      () => {
        // Allow an immediate retry; keep what an earlier load already brought.
        lastLoad.current = 0
        setState((current) => (current.status === 'ready' ? current : { status: 'failed' }))
      },
    ).finally(() => { running.current = false })
  }, [isLoggedIn])

  return { state: isLoggedIn ? state : { status: 'loading' }, load }
}
