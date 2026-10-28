import type { Batch, ChartRow, KeyRecord, KeyStatus, Product, ProductKind } from './types'

/**
 * The manager sees where a key is, not only its own state: still in the shared pool, or already given out.
 * GIVEN covers a key a sale holds and a key a sale has handed to a student but nobody activated yet.
 */
export type ManagerStatus = 'READY' | 'GIVEN' | 'ACTIVATED' | 'REVOKED' | 'EXPIRED'

export const MANAGER_STATUS_LABEL: Record<ManagerStatus, string> = {
  READY: 'Sẵn sàng',
  GIVEN: 'Đã cấp',
  ACTIVATED: 'Đã kích hoạt',
  REVOKED: 'Thu hồi',
  EXPIRED: 'Hết hạn',
}

/** A sale's own words: a key is either not yet handed to a student, waiting for the student to activate, or activated. */
export const SALE_STATUS_LABEL: Record<KeyStatus, string> = {
  READY: 'Chưa cấp',
  ISSUED: 'Chờ kích hoạt',
  ACTIVATED: 'Đã kích hoạt',
  REVOKED: 'Thu hồi',
  EXPIRED: 'Hết hạn',
}

export function managerStatusOf(key: KeyRecord): ManagerStatus {
  if (key.status === 'ACTIVATED' || key.status === 'REVOKED' || key.status === 'EXPIRED') return key.status
  return key.status === 'READY' && key.saleId === null ? 'READY' : 'GIVEN'
}

export const KIND_LABEL: Record<ProductKind, string> = {
  POINTS: 'AI Points',
  PREMIUM: 'Premium',
}

/** Series of the manager's chart, in the order a key travels: shared pool, out with a sale or student, activated. */
export const MANAGER_CHART_SERIES = ['Còn trong kho', 'Đã cấp, chờ kích hoạt', 'Đã kích hoạt'] as const
/** Series of a sale's chart: not yet handed to a student, waiting for the student, activated. */
export const SALE_CHART_SERIES = ['Chưa cấp', 'Chờ kích hoạt', 'Đã kích hoạt'] as const

/** The order the chart panels appear in: AI Points first, then Premium. */
const KIND_ORDER: Record<ProductKind, number> = { POINTS: 0, PREMIUM: 1 }

export interface Period {
  year: number
  month: number
}

/** The month a batch belongs to, read from its code: B-2611-001 is November 2026. */
export function batchPeriod(batch: Batch): Period {
  const match = /^B-(\d{2})(\d{2})-/.exec(batch.code)
  return match ? { year: 2000 + Number(match[1]), month: Number(match[2]) } : { year: 0, month: 0 }
}

const monthIndex = ({ year, month }: Period) => year * 12 + month - 1
const periodValue = ({ year, month }: Period) => `${year}-${String(month).padStart(2, '0')}`

export const RANGE_LAST_3 = 'last3'
export const RANGE_ALL = 'all'

export interface RangeOption {
  value: string
  label: string
}

/** Time filter choices: the newest three months, each month that has a batch, or everything. */
export function rangeOptions(batches: readonly Batch[]): RangeOption[] {
  const months = new Map<string, Period>()
  for (const batch of batches) {
    const period = batchPeriod(batch)
    months.set(periodValue(period), period)
  }
  const newestFirstMonths = [...months.entries()].sort((a, b) => monthIndex(b[1]) - monthIndex(a[1]))
  return [
    { value: RANGE_LAST_3, label: '3 tháng gần nhất' },
    ...newestFirstMonths.map(([value, period]) => ({ value, label: `Tháng ${period.month}/${period.year}` })),
    { value: RANGE_ALL, label: 'Tất cả' },
  ]
}

/** "Last three months" counts back from the newest batch, so the filter never depends on today's date. */
export function batchesInRange(batches: readonly Batch[], range: string): Batch[] {
  if (range === RANGE_ALL) return [...batches]
  if (range === RANGE_LAST_3) {
    const latest = Math.max(...batches.map((batch) => monthIndex(batchPeriod(batch))))
    return batches.filter((batch) => monthIndex(batchPeriod(batch)) > latest - 3)
  }
  return batches.filter((batch) => periodValue(batchPeriod(batch)) === range)
}

/**
 * One row per batch, three exclusive counts that add up to the keys in circulation. Revoked and expired keys are
 * left out: they are no longer stock. `stage` says which of the three counts a key belongs to, or null to skip it.
 * Rows are grouped by product kind and, inside a group, run from the oldest batch to the newest.
 */
function batchRows(keys: readonly KeyRecord[], batches: readonly Batch[], products: readonly Product[], stage: (key: KeyRecord) => 0 | 1 | 2 | null): ChartRow[] {
  const counts = new Map(batches.map((batch) => [batch.code, [0, 0, 0]]))
  for (const key of keys) {
    const slot = stage(key)
    const values = slot === null ? undefined : counts.get(key.batch)
    if (values && slot !== null) values[slot] += 1
  }
  const productOf = new Map(products.map((product) => [product.id, product]))
  const kindOrder = (batch: Batch) => {
    const product = productOf.get(batch.productId)
    return product ? KIND_ORDER[product.kind] : Object.keys(KIND_ORDER).length
  }
  return [...batches]
    .sort((a, b) => kindOrder(a) - kindOrder(b) || a.createdAt.localeCompare(b.createdAt))
    .map((batch) => {
      const product = productOf.get(batch.productId)
      return {
        id: batch.code,
        label: batch.code,
        caption: product?.name ?? batch.productId,
        group: product ? KIND_LABEL[product.kind] : '',
        values: counts.get(batch.code) ?? [0, 0, 0],
      }
    })
}

export function managerBatchRows(keys: readonly KeyRecord[], batches: readonly Batch[], products: readonly Product[]): ChartRow[] {
  return batchRows(keys, batches, products, (key) => {
    const status = managerStatusOf(key)
    if (status === 'READY') return 0
    if (status === 'GIVEN') return 1
    return status === 'ACTIVATED' ? 2 : null
  })
}

/** Only the sale's own keys, and only batches the sale holds any of. */
export function saleBatchRows(keys: readonly KeyRecord[], batches: readonly Batch[], products: readonly Product[], saleId: string): ChartRow[] {
  const rows = batchRows(keys, batches, products, (key) => {
    if (key.saleId !== saleId) return null
    if (key.status === 'READY') return 0
    if (key.status === 'ISSUED') return 1
    return key.status === 'ACTIVATED' ? 2 : null
  })
  return rows.filter((row) => row.values.some((value) => value > 0))
}

export interface BatchCounts {
  quantity: number
  /** Out of the shared pool: held by a sale, handed to a student, or activated. */
  given: number
  activated: number
  pool: number
  byStatus: Record<ManagerStatus, number>
}

export function batchCountsByCode(keys: readonly KeyRecord[]): Map<string, BatchCounts> {
  const map = new Map<string, BatchCounts>()
  for (const key of keys) {
    let counts = map.get(key.batch)
    if (!counts) {
      counts = { quantity: 0, given: 0, activated: 0, pool: 0, byStatus: { READY: 0, GIVEN: 0, ACTIVATED: 0, REVOKED: 0, EXPIRED: 0 } }
      map.set(key.batch, counts)
    }
    const status = managerStatusOf(key)
    counts.quantity += 1
    counts.byStatus[status] += 1
    if (status === 'READY') counts.pool += 1
    if (status === 'GIVEN' || status === 'ACTIVATED') counts.given += 1
    if (status === 'ACTIVATED') counts.activated += 1
  }
  return map
}

export interface SaleCounts {
  assigned: number
  ready: number
  /** Handed to a student, activated or not. */
  issued: number
  pending: number
  activated: number
}

export function saleCounts(keys: readonly KeyRecord[], saleId: string): SaleCounts {
  const counts = { assigned: 0, ready: 0, issued: 0, pending: 0, activated: 0 }
  for (const key of keys) {
    if (key.saleId !== saleId || key.status === 'REVOKED' || key.status === 'EXPIRED') continue
    counts.assigned += 1
    if (key.status === 'READY') counts.ready += 1
    if (key.status === 'ISSUED') counts.pending += 1
    if (key.status === 'ACTIVATED') counts.activated += 1
  }
  counts.issued = counts.pending + counts.activated
  return counts
}

export function newestFirst(batches: readonly Batch[]): Batch[] {
  return [...batches].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** The search box matches what a list shows of a key: the last characters of its code. */
export function keyMatches(key: KeyRecord, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return key.code.toLowerCase().endsWith(needle)
}
