import { useSyncExternalStore } from 'react'

/** Same breakpoint as the CSS: below it the page is one column whatever layout was picked. */
const WIDE_QUERY = '(min-width: 960px)'

function subscribe(onChange: () => void) {
  const query = window.matchMedia?.(WIDE_QUERY)
  query?.addEventListener('change', onChange)
  return () => query?.removeEventListener('change', onChange)
}

/** True when the window is wide enough for the compact, theater and stacked layouts to apply. */
export function useWideScreen() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia?.(WIDE_QUERY).matches ?? true,
    () => true,
  )
}
