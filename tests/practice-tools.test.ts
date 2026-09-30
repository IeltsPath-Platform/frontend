import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { canUsePassageAction, getPracticeMode, mergeHighlights } from '../src/features/practice/lib/passageTools.ts'
import { loadFlashcards, readFlashcardImage, saveFlashcard } from '../src/features/practice/lib/flashcardStorage.ts'
import { clampPosition } from '../src/features/practice/hooks/useFloatingPosition.ts'
import { countWords, formatDuration } from '../src/features/practice/lib/time.ts'
import { getProgressMetrics } from '../src/features/practice/lib/progressMetrics.ts'

test('time and word helpers use the same values shown in skill workspaces', () => {
  assert.equal(formatDuration(65.9), '01:05')
  assert.equal(formatDuration(-1), '00:00')
  assert.equal(countWords('  IELTS   practice\nworks '), 3)
  assert.equal(countWords('   '), 0)
})

test('determinate progress clamps invalid counts and keeps a single percentage source of truth', () => {
  assert.deepEqual(getProgressMetrics(3, 5), { completed: 3, percentage: 60, total: 5 })
  assert.deepEqual(getProgressMetrics(12, 5), { completed: 5, percentage: 100, total: 5 })
  assert.deepEqual(getProgressMetrics(-3, 5), { completed: 0, percentage: 0, total: 5 })
  assert.deepEqual(getProgressMetrics(2, 0), { completed: 0, percentage: 0, total: 0 })
})

test('mode survives URL parsing and only practice enables assistance tools', () => {
  assert.equal(getPracticeMode('exam'), 'exam')
  assert.equal(getPracticeMode(null), 'practice')
  assert.equal(getPracticeMode('invalid'), 'practice')
  for (const action of ['highlight', 'note', 'dictionary', 'flashcard'] as const) {
    assert.equal(canUsePassageAction('exam', action), false)
    assert.equal(canUsePassageAction('practice', action), true)
  }
})

test('overlapping and adjacent highlights merge without mutating source', () => {
  const input = [{ paragraph: 'B', start: 3, end: 8 }, { paragraph: 'A', start: 0, end: 5 }, { paragraph: 'A', start: 4, end: 10 }, { paragraph: 'A', start: 10, end: 12 }]
  const snapshot = structuredClone(input)
  assert.deepEqual(mergeHighlights(input), [{ paragraph: 'A', start: 0, end: 12 }, { paragraph: 'B', start: 3, end: 8 }])
  assert.deepEqual(input, snapshot)
  assert.deepEqual(mergeHighlights([{ paragraph: 'A', start: 5, end: 5 }, { paragraph: 'A', start: -1, end: 6 }]), [])
})

test('notes stay inside viewport after dragging or resizing', () => {
  assert.deepEqual(clampPosition(-100, -100, 360, 400, 1440, 900), { x: 8, y: 8 })
  assert.deepEqual(clampPosition(2000, 2000, 360, 400, 1440, 900), { x: 1072, y: 492 })
  assert.deepEqual(clampPosition(500, 500, 359, 600, 375, 650), { x: 8, y: 42 })
})

const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
afterEach(() => {
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage)
  else Reflect.deleteProperty(globalThis, 'localStorage')
})

function memoryStorage(raw: string | null = null, full = false) {
  let value = raw
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: () => value,
    setItem: (_key: string, next: string) => { if (full) throw new Error('QuotaExceededError'); value = next },
  } })
  return () => value
}

const card = { id: 'test-card', testId: 'snow-makers', word: 'snow', meaning: 'tuyết', example: 'Snow falls.', createdAt: '2026-09-29T00:00:00Z' }

test('flashcards are saved and reloaded with their image and source', () => {
  memoryStorage()
  saveFlashcard({ ...card, image: 'data:image/png;base64,dGVzdA==' })
  saveFlashcard({ ...card, id: 'another' })
  assert.equal(loadFlashcards().length, 2)
  assert.equal(loadFlashcards()[1].testId, 'snow-makers')
  assert.equal(loadFlashcards()[1].image, 'data:image/png;base64,dGVzdA==')
})

test('corrupt or full storage reports failure without losing old cards', () => {
  const corrupt = memoryStorage('not-json')
  assert.throws(() => saveFlashcard(card))
  assert.equal(corrupt(), 'not-json')
  const existing = JSON.stringify([card])
  const full = memoryStorage(existing, true)
  assert.throws(() => saveFlashcard({ ...card, id: 'new' }))
  assert.equal(full(), existing)
})

test('stored non-image URLs are rejected', () => {
  memoryStorage(JSON.stringify([{ ...card, image: 'javascript:alert(1)' }]))
  assert.throws(() => loadFlashcards())
})

test('uploads reject unsupported and oversize files before reading', async () => {
  await assert.rejects(readFlashcardImage(new File(['svg'], 'bad.svg', { type: 'image/svg+xml' })), /PNG/)
  await assert.rejects(readFlashcardImage(new File([new Uint8Array(1024 * 1024 + 1)], 'big.png', { type: 'image/png' })), /1 MB/)
})
