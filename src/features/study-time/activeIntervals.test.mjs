import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ActiveIntervals, SESSION_IN_USE_RETRY_DELAYS_MS } from './activeIntervals.ts'

test('session-in-use retries are short and bounded before offering takeover', () => {
  assert.deepEqual(SESSION_IN_USE_RETRY_DELAYS_MS, [250, 750])
})

test('idle is clipped at two minutes and real input resumes collection', () => {
  const active = new ActiveIntervals(0)
  for (let time = 1000; time <= 125000; time += 1000) active.sample(time, true, false)
  assert.deepEqual(active.take(), [{ startOffsetMs: 0, endOffsetMs: 120000 }])
  active.activity(125000)
  active.sample(126000, true, false)
  assert.deepEqual(active.take(), [{ startOffsetMs: 125000, endOffsetMs: 126000 }])
})
test('hidden tabs and suspended browser intervals are not backfilled', () => {
  const active = new ActiveIntervals(0)
  active.sample(1000, true, false)
  active.sample(2000, false, true)
  active.sample(100000, true, true)
  active.sample(101000, true, true)
  assert.deepEqual(active.take(), [{ startOffsetMs: 0, endOffsetMs: 1000 }, { startOffsetMs: 100000, endOffsetMs: 101000 }])
})
test('acknowledged batches remain immutable and media extends activity beyond idle', () => {
  const active = new ActiveIntervals(0)
  for (let time = 1000; time <= 120000; time += 1000) active.sample(time, true, false)
  const batch = active.take()
  active.sample(121000, true, true)
  assert.equal(batch[0].endOffsetMs, 120000)
  assert.deepEqual(active.take(), [{ startOffsetMs: 120000, endOffsetMs: 121000 }])
})
