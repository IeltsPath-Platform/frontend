import { describe, expect, it } from 'vitest'
import type { WritingCorrection } from './writingApi'
import { buildFixes, countFixes, groupFixes, LONG_FIX_LENGTH } from './writingFixes'

const fix = (overrides: Partial<WritingCorrection>): WritingCorrection => ({
  excerpt: 'It have', suggestion: 'It has', category: 'GRAMMAR', certainty: 'ERROR', reason: 'Chủ ngữ số ít.', errorName: 'Sai hòa hợp chủ ngữ và động từ', ...overrides,
})

describe('the mistakes of an essay as cards', () => {
  it('numbers them in the order they come, and carries what to show for each', () => {
    const items = buildFixes([fix({}), fix({ excerpt: 'five group', suggestion: 'five groups', category: 'VOCABULARY', reason: undefined, errorName: undefined })])

    expect(items.map((item) => item.number)).toEqual([1, 2])
    expect(items[0]).toMatchObject({ label: 'Ngữ pháp', tone: 'grammar', name: 'Sai hòa hợp chủ ngữ và động từ', reason: 'Chủ ngữ số ít.', suggestionOnly: false })
    expect(items[1]).toMatchObject({ label: 'Từ vựng', tone: 'vocabulary', name: null, reason: null })
  })

  it('leaves out a name that only repeats the category, and tells a passage to remove from a replacement', () => {
    const [item] = buildFixes([fix({ errorName: 'Ngữ pháp', suggestion: '', excerpt: 'because reading is good' })])

    expect(item?.name).toBeNull()
    expect(item?.suggestion).toBe('')
  })

  it('stacks a long passage and keeps a short one beside its replacement', () => {
    const long = 'x'.repeat(LONG_FIX_LENGTH + 1)
    const [short, stacked, longReplacement] = buildFixes([fix({}), fix({ excerpt: long }), fix({ suggestion: long })])

    expect(short?.long).toBe(false)
    expect(stacked?.long).toBe(true)
    expect(longReplacement?.long).toBe(true)
  })

  it('counts suggestions apart from mistakes', () => {
    const items = buildFixes([fix({}), fix({}), fix({ certainty: 'SUGGESTION' })])

    expect(countFixes(items)).toEqual({ errors: 2, suggestions: 1 })
    expect(items[2]?.suggestionOnly).toBe(true)
  })

  it('groups by category, the biggest first, and files an unknown category under "Khác"', () => {
    const items = buildFixes([
      fix({ category: 'VOCABULARY' }), fix({}), fix({}), fix({ category: 'TASK' }), fix({ category: 'SOMETHING_NEW' as WritingCorrection['category'] }),
    ])

    expect(groupFixes(items).map((group) => `${group.label} ${group.count}`)).toEqual(['Ngữ pháp 2', 'Khác 1', 'Nội dung 1', 'Từ vựng 1'])
  })
})
