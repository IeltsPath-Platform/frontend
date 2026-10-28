import { useState } from 'react'

/**
 * The current page of a list. It falls back to page 1 whenever the filter or search text (`scope`) changes, so a
 * new result set never opens on a page that no longer exists.
 */
export function usePage(scope: string): [number, (page: number) => void] {
  const [state, setState] = useState({ scope, page: 1 })
  const page = state.scope === scope ? state.page : 1
  return [page, (next) => setState({ scope, page: next })]
}

export function pageSlice<T>(items: readonly T[], page: number, size: number): { rows: T[]; pageCount: number; page: number } {
  const pageCount = Math.max(1, Math.ceil(items.length / size))
  const current = Math.min(Math.max(1, page), pageCount)
  return { rows: items.slice((current - 1) * size, current * size), pageCount, page: current }
}
