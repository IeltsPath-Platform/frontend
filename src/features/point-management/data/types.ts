/** A key's state as the schema will hold it. Where it sits (kho chung / sale) comes from `saleId`. */
export type KeyStatus = 'READY' | 'ISSUED' | 'ACTIVATED' | 'REVOKED' | 'EXPIRED'

/** AI Points keys top up a wallet; Premium keys add subscription days and human-grading credits. */
export type ProductKind = 'POINTS' | 'PREMIUM'

export interface Product {
  id: string
  name: string
  kind: ProductKind
  /** POINTS only. */
  points?: number
  /** PREMIUM only. */
  premiumDays?: number
  humanGradingCredits?: number
}

/** One bar of a stacked chart: `values` lines up with the chart's series. */
export interface ChartRow {
  id: string
  label: string
  /** A second line under the label, such as the product of a batch. */
  caption?: string
  group: string
  values: number[]
}

export interface Sale {
  id: string
  name: string
  active: boolean
}

export interface Batch {
  code: string
  label: string
  productId: string
  quantity: number
  /** Calendar day (YYYY-MM-DD) the keys stop being activatable, or null for no limit. */
  expiresAt: string | null
  createdAt: string
  createdBy: string
}

export interface KeyRecord {
  id: string
  /** Full code; screens mask it except where the flow reveals it. */
  code: string
  batch: string
  seq: number
  productId: string
  /** null = still in the manager's shared pool (READY) or given out directly. */
  saleId: string | null
  status: KeyStatus
  expiresAt: string | null
  issuedAt: string | null
  activatedAt: string | null
  note: string | null
}

export interface PointState {
  manager: { name: string; title: string }
  currentSaleId: string
  defaultExpiresAt: string
  products: Product[]
  sales: Sale[]
  batches: Batch[]
  keys: KeyRecord[]
}
