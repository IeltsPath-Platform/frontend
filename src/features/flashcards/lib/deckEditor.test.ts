import { describe, expect, it } from 'vitest'
import type { Flashcard } from '../api/flashcardApi'
import { emptyRow, planSave, rowFromCard, validateRows } from './deckEditor'

const card = (id: string, front: string, back: string): Flashcard => ({
  id, front, back, sourceType: 'MANUAL', vocabularySenseId: null, sourceReferenceId: null, highlightedText: null,
  status: 'ACTIVE', createdAt: '', updatedAt: '', leitnerBox: 1, nextReviewAt: null, lastReviewedAt: null, reviewCount: 0,
  ipa: null, exampleSentence: null, imageKey: null, imageUrl: null,
})
const row = (front: string, back: string) => ({ ...emptyRow(), front, back })

describe('validateRows', () => {
  it('skips blank rows, flags half-filled rows and requires a title and two cards', () => {
    expect(validateRows('', [row('a', 'b'), row('c', 'd')]).formError).toMatch(/tiêu đề/)
    expect(validateRows('Deck', [row('a', 'b'), emptyRow()]).formError).toMatch(/ít nhất 2/)
    const half = row('a', '')
    const result = validateRows('Deck', [row('x', 'y'), half, row('c', 'd')])
    expect(result.rowErrors[half.rowId]).toMatch(/định nghĩa/)
    expect(result.formError).toMatch(/thiếu/)
    const ok = validateRows('Deck', [row('a', 'b'), emptyRow(), row('c', 'd')])
    expect(ok.formError).toBe('')
    expect(ok.filled).toHaveLength(2)
  })
})

describe('planSave', () => {
  it('creates new rows, updates edited cards, re-links moved cards and removes dropped ones', () => {
    const a = card('a', 'one', 'một'), b = card('b', 'two', 'hai'), c = card('c', 'three', 'ba')
    const rowB = { ...rowFromCard(b, 1), back: 'hai (2)' }
    const rowA = rowFromCard(a, 0)
    const fresh = row('four', 'bốn')
    const plan = planSave([rowB, rowA, fresh], [a, b, c])
    expect(plan.create).toEqual([{ row: fresh, index: 2 }])
    expect(plan.update.map((item) => item.card.id)).toEqual(['b'])
    expect(plan.reorder).toEqual([{ card: b, index: 0 }, { card: a, index: 1 }])
    expect(plan.remove).toEqual([c])
  })

  it('assigns a position to cards linked before sort orders were stored', () => {
    const a = card('a', 'one', 'một')
    expect(planSave([rowFromCard(a, null)], [a]).reorder).toEqual([{ card: a, index: 0 }])
    expect(planSave([rowFromCard(a, 0)], [a]).reorder).toEqual([])
  })
})
