import { useSyncExternalStore } from 'react'

/**
 * Whether a media query matches, kept up to date as the window changes. Where the browser has no `matchMedia` (a test
 * environment) it answers `fallback`, so the wide layout is the one that is drawn.
 */
export function useMediaQuery(query: string, fallback = true) {
  return useSyncExternalStore(
    (notify) => {
      if (typeof window.matchMedia !== 'function') return () => {}
      const list = window.matchMedia(query)
      list.addEventListener('change', notify)
      return () => list.removeEventListener('change', notify)
    },
    () => (typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : fallback),
    () => fallback,
  )
}
