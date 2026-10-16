import { test } from 'node:test'
import assert from 'node:assert/strict'
import { statisticsResourceReducer as reduce } from './statisticsResourceState.ts'

const loaded = { key: 'account-a:week', version: 0, data: { total: 42 }, error: null, loading: false }

test('refresh retains previous data until the new request settles', () => {
  const refreshing = reduce(loaded, { type: 'reload' })
  assert.equal(refreshing.data, loaded.data)
  assert.equal(refreshing.loading, true)
  const refreshed = reduce(refreshing, { type: 'success', key: loaded.key, version: refreshing.version, data: { total: 50 } })
  assert.deepEqual(refreshed.data, { total: 50 })
  assert.equal(refreshed.loading, false)
})

test('refresh failure retains prior data alongside an actionable error', () => {
  const refreshing = reduce(loaded, { type: 'reload' })
  const failed = reduce(refreshing, { type: 'failure', key: loaded.key, version: refreshing.version, error: 'Thử lại' })
  assert.equal(failed.data, loaded.data)
  assert.equal(failed.error, 'Thử lại')
  assert.equal(failed.loading, false)
})

test('changing account, filter, or signing out clears previous data and errors', () => {
  for (const key of ['account-b:week', 'account-a:month', 'signed-out:week']) {
    const changed = reduce({ ...loaded, error: 'Old error' }, { type: 'scope', key })
    assert.equal(changed.data, null)
    assert.equal(changed.error, null)
    assert.equal(changed.loading, true)
    assert.equal(reduce(changed, { type: 'success', key: loaded.key, version: 0, data: { total: 99 } }), changed)
  }
})

test('late responses cannot replace a newer request or reappear after returning to an account', () => {
  const refreshed = reduce(loaded, { type: 'reload' })
  const switched = reduce(loaded, { type: 'scope', key: 'account-b:week' })
  const returned = reduce(switched, { type: 'scope', key: loaded.key })
  for (const state of [refreshed, returned]) {
    assert.equal(reduce(state, { type: 'success', key: loaded.key, version: 0, data: { total: 99 } }), state)
    assert.equal(reduce(state, { type: 'failure', key: loaded.key, version: 0, error: 'Old error' }), state)
  }
})
