import { useMemo, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { AdminSearchContext } from './adminSearch'

/** Holds the topbar query; it starts empty again on every page so one page's filter never leaks into the next. */
export function AdminSearchProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const [state, setState] = useState({ pathname, query: '' })
  const query = state.pathname === pathname ? state.query : ''
  const value = useMemo(() => ({ query, setQuery: (next: string) => setState({ pathname, query: next }) }), [pathname, query])
  return <AdminSearchContext.Provider value={value}>{children}</AdminSearchContext.Provider>
}
