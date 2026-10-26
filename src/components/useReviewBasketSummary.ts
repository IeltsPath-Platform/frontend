import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { learningApi } from '@/features/learning-path/api'
import type { ReviewBasketSummary } from '~types/learningPath'
import { subscribeGamification } from './owl-events'

/** Navigating asks again at most this often, except on the review pages, which always show the latest. */
const REFRESH_MS = 30_000
const REVIEW_PAGES = /^\/learn\/review/

/**
 * What waits in the review basket, for the badge on the navigation. It loads on sign-in and on navigation, and again
 * after a submission, since finishing a review changes it. A failed load is quiet and keeps the last number: the badge
 * is only a hint, and an older backend without the summary simply shows none.
 */
export function useReviewBasketSummary(enabled: boolean): ReviewBasketSummary | null {
  const { pathname } = useLocation()
  const [summary, setSummary] = useState<ReviewBasketSummary | null>(null)
  const [wasEnabled, setWasEnabled] = useState(enabled)
  const lastLoad = useRef(0)
  // A response that arrives after the learner signed out must not show for the next account.
  const session = useRef(0)

  // The next account must not see the previous account's number.
  if (enabled !== wasEnabled) {
    setWasEnabled(enabled)
    if (!enabled) setSummary(null)
  }

  const load = useCallback(() => {
    const current = session.current
    lastLoad.current = Date.now()
    learningApi.getReviewBasketSummary().then(
      (next) => { if (current === session.current) setSummary(next) },
      () => { lastLoad.current = 0 },
    )
  }, [])

  useEffect(() => {
    if (!enabled) {
      session.current += 1
      lastLoad.current = 0
      return
    }
    if (Date.now() - lastLoad.current >= REFRESH_MS || REVIEW_PAGES.test(pathname)) load()
  }, [enabled, pathname, load])

  useEffect(() => (enabled ? subscribeGamification(load) : undefined), [enabled, load])

  return enabled ? summary : null
}
