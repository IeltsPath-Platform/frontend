import type { BatchDto, ChartRow, KeyDto, KeyProductDto, KeyState, Product, ProductKind } from './types'

/**
 * The manager sees where a key is, not only its own state: still in the shared pool, or already given out.
 * GIVEN covers a READY key a sale holds and a key a sale has handed to a student but nobody activated yet.
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
export const SALE_STATUS_LABEL: Record<KeyState, string> = {
  READY: 'Chưa cấp',
  ISSUED: 'Chờ kích hoạt',
  ACTIVATED: 'Đã kích hoạt',
  REVOKED: 'Thu hồi',
  EXPIRED: 'Hết hạn',
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

export function productFromCatalog(item: KeyProductDto): Product {
  return {
    id: item.id,
    name: item.name,
    kind: item.keyType,
    points: item.pointsAmount ?? undefined,
    premiumDays: item.premiumDays ?? undefined,
    humanGradingCredits: item.humanGradingCredits ?? undefined,
  }
}

/** Where a key stands for the manager: READY with no sale is the pool; READY with a sale, or ISSUED, is given out. */
export function managerStatusOf(key: Pick<KeyDto, 'state' | 'saleId'>): ManagerStatus {
  if (key.state === 'ISSUED') return 'GIVEN'
  if (key.state === 'READY') return key.saleId === null ? 'READY' : 'GIVEN'
  return key.state
}

/** The three exclusive stages of a batch, in chart order: pool, given out (held or handed out), activated. */
export function batchStages(batch: Pick<BatchDto, 'byState' | 'pool'>): [number, number, number] {
  const heldBySales = batch.byState.READY - batch.pool
  return [batch.pool, heldBySales + batch.byState.ISSUED, batch.byState.ACTIVATED]
}

/** Splits `total` over `parts` as evenly as possible; the first parts take the remainder (334, 333, 333). */
export function splitEvenly(total: number, parts: number): number[] {
  if (parts <= 0) return []
  const base = Math.floor(total / parts)
  const extra = total % parts
  return Array.from({ length: parts }, (_, index) => base + (index < extra ? 1 : 0))
}

/** Keys that can still be revoked: not yet redeemed, not already revoked, not expired. */
export function unusedCount(byState: BatchDto['byState']): number {
  return byState.READY + byState.ISSUED
}

/** One row per batch, three exclusive counts; grouped by product kind, oldest batch first inside a group. */
export function batchChartRows(batches: readonly BatchDto[], products: readonly Product[]): ChartRow[] {
  const productOf = new Map(products.map((product) => [product.id, product]))
  const kindOrder = (batch: BatchDto) => {
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
        caption: batch.productName,
        group: product ? KIND_LABEL[product.kind] : '',
        values: batchStages(batch),
      }
    })
}

export const ALL_PERIODS = 'all'

export interface Period {
  value: string
  label: string
}

/** "All" plus the twelve months up to and including this one, newest first. The value is YYYY-MM or "all". */
export function periodOptions(today: Date = new Date()): Period[] {
  const months: Period[] = []
  for (let back = 0; back < 12; back += 1) {
    const date = new Date(today.getFullYear(), today.getMonth() - back, 1)
    const month = date.getMonth() + 1
    months.push({ value: `${date.getFullYear()}-${String(month).padStart(2, '0')}`, label: `Tháng ${month}/${date.getFullYear()}` })
  }
  return [{ value: ALL_PERIODS, label: 'Tất cả' }, ...months]
}

/** The month the server filters by, or undefined for everything. */
export function monthOf(period: string): string | undefined {
  return period === ALL_PERIODS ? undefined : period
}
