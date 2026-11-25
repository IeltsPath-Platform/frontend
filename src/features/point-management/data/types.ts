/** A key's state as the backend reports it. Where a READY key sits (shared pool or a sale) comes from `saleId`. */
export type KeyState = 'READY' | 'ISSUED' | 'ACTIVATED' | 'REVOKED' | 'EXPIRED'

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

/** `GET /api/access/key-products`, one catalogue entry as the access service returns it. */
export interface KeyProductDto {
  id: string
  name: string
  keyType: ProductKind
  pointsAmount: number | null
  premiumDays: number | null
  humanGradingCredits: number | null
  status: 'ACTIVE' | 'INACTIVE'
}

export type StateCounts = Record<KeyState, number>

export interface BatchDto {
  code: string
  label: string
  productId: string
  productName: string
  quantity: number
  /** Last day the keys can be activated (YYYY-MM-DD), or null for no limit. */
  expiresOn: string | null
  createdAt: string
  byState: StateCounts
  /** READY keys no sale holds yet: the manager's own stock of this batch. */
  pool: number
}

export interface KeyDto {
  id: string
  batchCode: string
  seq: number
  productId: string
  productName: string
  /** IP-****-****-ABCD: the full code is only given by the reveal endpoints. */
  maskedCode: string
  state: KeyState
  saleId: string | null
  issuedAt: string | null
  activatedAt: string | null
  revokedAt: string | null
  expiresAt: string | null
  note: string | null
  codeStored: boolean
}

export interface CountsDto {
  key: string
  label: string
  byState: StateCounts
}

export interface OverviewDto {
  byBatch: CountsDto[]
  byProduct: CountsDto[]
}

export interface SaleDto {
  id: string
  displayName: string
  active: boolean
  held: number
  issued: number
  activated: number
}

export interface StockDto {
  byProduct: CountsDto[]
  byBatch: CountsDto[]
}

export interface PageDto<T> {
  items: T[]
  total: number
  page: number
  size: number
}

/** `changed` keys moved or removed; `skipped` asked-for keys left alone (not in a state that allows the action). */
export interface ActionDto {
  changed: number
  skipped: number
}

export interface IssuedKeyDto {
  keyId: string
  code: string
  batchCode: string
  key: KeyDto
}
