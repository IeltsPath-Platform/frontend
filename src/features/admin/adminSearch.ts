import { createContext, useContext } from 'react'

/** The topbar search box. Pages read `query` to filter their own lists; it is not a site-wide search. */
export interface AdminSearchValue {
  query: string
  setQuery: (query: string) => void
}

export const AdminSearchContext = createContext<AdminSearchValue>({ query: '', setQuery: () => {} })

export function useAdminSearch(): AdminSearchValue {
  return useContext(AdminSearchContext)
}
