import test from 'node:test'
import assert from 'node:assert/strict'
import { historyTitle, historyTitleMap, historyTitleRequests } from '../src/features/practice/lib/historyTitles.ts'

const history = [
  { attemptId: 'a', packageId: 'p1', packageVersionId: 'v1', skill: 'READING', scope: 'PART' as const, partNos: [2], status: 'SUBMITTED', submittedAt: null, percent: 80 },
  { attemptId: 'b', packageId: 'p2', packageVersionId: 'v2', skill: 'READING', scope: 'FULL' as const, partNos: [1, 2, 3], status: 'SUBMITTED', submittedAt: null, percent: 60 },
]

test('history title lookup uses at most one only query for each scope', () => {
  assert.deepEqual(historyTitleRequests(history), [
    { scope: 'PART', only: [{ packageId: 'p1', partNo: 2 }] },
    { scope: 'FULL', only: [{ packageId: 'p2', partNo: null }] },
  ])
  assert.deepEqual(historyTitleRequests([]), [])
})

test('history titles fall back to a stable Reading label when old content is unavailable', () => {
  const titles = historyTitleMap([{ scope: 'PART', items: [] }])
  assert.equal(historyTitle(history[0]!, titles), 'Bài Reading · Passage 2')
  assert.equal(historyTitle(history[1]!, titles), 'Bài Reading')
})
