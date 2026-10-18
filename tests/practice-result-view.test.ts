import test from 'node:test'
import assert from 'node:assert/strict'
import { buildReadingResultView } from '../src/features/practice/lib/readingResultView.ts'

const structure = {
  sections: [{
    id: 'section-1', contentSectionId: 'content-1', sortOrder: 1, partNo: 1,
    snapshot: JSON.stringify({
      title: 'Passage One', skill: 'READING', passage: 'Paragraph',
      groups: [{ groupId: 'group-1', sortOrder: 1, formatCode: 'MULTIPLE_CHOICE', instructions: 'Questions 1-2. Choose one.' }],
    }),
    items: [
      { id: 'item-1', questionVersionId: 'qv-1', sortOrder: 1, questionSnapshot: JSON.stringify({ stem: 'Q1', options: [] , groupId: 'group-1' }), answerSnapshot: null, knowledgeSnapshot: null },
      { id: 'item-2', questionVersionId: 'qv-2', sortOrder: 2, questionSnapshot: JSON.stringify({ stem: 'Q2', options: [], groupId: 'group-1' }), answerSnapshot: null, knowledgeSnapshot: null },
    ], startedAt: null, completedAt: null,
  }],
}

test('result view joins saved answers, correctness and solutions and counts blanks accurately', () => {
  const view = buildReadingResultView({
    structure,
    responses: [{ id: 'r1', attemptItemId: 'item-1', payload: '{"answer":"A"}', schemaVersion: 1, revision: 1, savedAt: '', submittedAt: null }],
    result: {
      score: 1, maxScore: 2, percent: 50,
      items: [{ attemptItemId: 'item-1', correct: true }, { attemptItemId: 'item-2', correct: false }],
      solutions: [{ attemptItemId: 'item-1', correctAnswer: 'A', explanation: 'It matches.' }],
    },
    attempt: { startedAt: '2026-10-15T10:00:00Z', submittedAt: '2026-10-15T10:02:00Z' },
  })

  assert.deepEqual(view.counts, { correct: 1, incorrect: 0, blank: 1 })
  assert.equal(view.items[0]?.number, 1)
  assert.equal(view.items[0]?.yourAnswer, 'A')
  assert.equal(view.items[0]?.correctAnswer, 'A')
  assert.equal(view.items[1]?.yourAnswer, null)
  assert.equal(view.items[1]?.correct, false)
  assert.deepEqual(view.byFormat.map((format) => format.total), [2])
  assert.equal(view.durationSeconds, 120)
})
