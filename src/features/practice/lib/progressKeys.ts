export interface CatalogProgressKey {
  packageId: string
  partNo: number | null
}

export type ProgressTab = 'uncompleted' | 'completed'
export type CatalogKeyFilter = { only?: CatalogProgressKey[]; exclude?: CatalogProgressKey[] } | 'EMPTY'

/** Builds the catalog's only/exclude filter while respecting the API meaning of only: []. */
export function toCatalogKeyFilter(tab: ProgressTab, completed: CatalogProgressKey[]): CatalogKeyFilter {
  const keys = completed.slice(0, 500)
  if (tab === 'completed') return keys.length === 0 ? 'EMPTY' : { only: keys }
  return keys.length === 0 ? {} : { exclude: keys }
}
