import { describe, expect, it } from 'vitest'
import { ALL_PERIODS, batchChartRows, batchStages, managerStatusOf, monthOf, periodOptions, unusedCount } from './selectors'
import type { BatchDto, Product } from './types'

const products: Product[] = [
  { id: 'p-points', name: 'Gói 100 AI Points', kind: 'POINTS', points: 100 },
  { id: 'p-premium', name: 'Gói Premium 30 ngày', kind: 'PREMIUM', premiumDays: 30 },
]

function batch(overrides: Partial<BatchDto>): BatchDto {
  return {
    code: 'B-2611-001',
    label: 'Đợt 11/2026',
    productId: 'p-points',
    productName: 'Gói 100 AI Points',
    quantity: 10,
    expiresOn: null,
    createdAt: '2026-11-01T00:00:00Z',
    byState: { READY: 0, ISSUED: 0, ACTIVATED: 0, REVOKED: 0, EXPIRED: 0 },
    pool: 0,
    ...overrides,
  }
}

describe('where a key stands for the manager', () => {
  it('a READY key with no sale is in the pool', () => {
    expect(managerStatusOf({ state: 'READY', saleId: null })).toBe('READY')
  })

  it('a READY key held by a sale, or an issued key, counts as given out', () => {
    expect(managerStatusOf({ state: 'READY', saleId: 'sale-1' })).toBe('GIVEN')
    expect(managerStatusOf({ state: 'ISSUED', saleId: 'sale-1' })).toBe('GIVEN')
  })

  it('activated, revoked and expired keys keep their own state', () => {
    expect(managerStatusOf({ state: 'ACTIVATED', saleId: 'sale-1' })).toBe('ACTIVATED')
    expect(managerStatusOf({ state: 'REVOKED', saleId: null })).toBe('REVOKED')
    expect(managerStatusOf({ state: 'EXPIRED', saleId: null })).toBe('EXPIRED')
  })
})

describe('a batch as three exclusive stages', () => {
  it('splits READY into pool and held by sales, and adds issued keys to the given-out stage', () => {
    const stages = batchStages(batch({ byState: { READY: 6, ISSUED: 2, ACTIVATED: 1, REVOKED: 1, EXPIRED: 0 }, pool: 4 }))
    expect(stages).toEqual([4, 4, 1])
  })

  it('counts unused keys as the ones that can still be revoked', () => {
    expect(unusedCount({ READY: 6, ISSUED: 2, ACTIVATED: 1, REVOKED: 1, EXPIRED: 3 })).toBe(8)
  })
})

describe('chart rows', () => {
  it('lists AI Points batches before Premium, oldest first inside each group', () => {
    const rows = batchChartRows([
      batch({ code: 'B-2611-002', productId: 'p-points', createdAt: '2026-11-05T00:00:00Z' }),
      batch({ code: 'B-2611-003', productId: 'p-premium', productName: 'Gói Premium 30 ngày', createdAt: '2026-11-01T00:00:00Z' }),
      batch({ code: 'B-2611-001', productId: 'p-points', createdAt: '2026-11-01T00:00:00Z' }),
    ], products)

    expect(rows.map((row) => row.id)).toEqual(['B-2611-001', 'B-2611-002', 'B-2611-003'])
    expect(rows.map((row) => row.group)).toEqual(['AI Points', 'AI Points', 'Premium'])
  })
})

describe('the period filter', () => {
  it('offers all periods, then the last twelve months, newest first', () => {
    const options = periodOptions(new Date(2026, 10, 25))

    expect(options[0]).toEqual({ value: ALL_PERIODS, label: 'Tất cả' })
    expect(options[1].value).toBe('2026-11')
    expect(options[12].value).toBe('2025-12')
    expect(options).toHaveLength(13)
  })

  it('sends no month for all periods and the month itself otherwise', () => {
    expect(monthOf(ALL_PERIODS)).toBeUndefined()
    expect(monthOf('2026-11')).toBe('2026-11')
  })
})
