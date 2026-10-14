import { useLayoutEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

/**
 * Starts every new page at its top. The router keeps the previous page's scroll offset by default, so opening a
 * lesson from a long, scrolled course screen would land the learner halfway down.
 * Skipped for Back/Forward (the browser restores those) and for changes that only touch the query (lesson tabs).
 */
export function useScrollToTop() {
  const { pathname } = useLocation()
  const navigationType = useNavigationType()

  useLayoutEffect(() => {
    if (navigationType !== 'POP') window.scrollTo(0, 0)
  }, [pathname, navigationType])
}
