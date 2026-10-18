import test from 'node:test'
import assert from 'node:assert/strict'
import { toCatalogKeyFilter } from '../src/features/practice/lib/progressKeys.ts'

test('uncompleted with no completed keys does not add an empty filter', () => {
  assert.deepEqual(toCatalogKeyFilter('uncompleted', []), {})
})

test('uncompleted excludes completed keys and caps the filter at the API limit', () => {
  const keys = Array.from({ length: 510 }, (_, index) => ({ packageId: `pkg-${index}`, partNo: index % 3 + 1 }))
  const result = toCatalogKeyFilter('uncompleted', keys)
  assert.equal(result.exclude?.length, 500)
  assert.equal(result.exclude?.[0]?.packageId, 'pkg-0')
})

test('completed with no keys is represented without issuing an unfiltered only request', () => {
  assert.equal(toCatalogKeyFilter('completed', []), 'EMPTY')
})

test('completed with keys requests only those keys', () => {
  const keys = [{ packageId: 'pkg-1', partNo: null }]
  assert.deepEqual(toCatalogKeyFilter('completed', keys), { only: keys })
})
