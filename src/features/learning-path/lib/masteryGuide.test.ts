import { describe, expect, it } from 'vitest'
import type { Suggestion } from '~types/learningPath'
import { dueLabel, masteryPercentOf, reasonMeta, reviewPath, suggestionCtaLabel } from './masteryGuide'

const NOON = new Date(2026, 9, 19, 12, 0, 0)

describe('dueLabel', () => {
  it('says nothing without a date or with one that cannot be read', () => {
    expect(dueLabel(null, NOON)).toBeNull()
    expect(dueLabel('not a date', NOON)).toBeNull()
  })

  it('counts whole calendar days, so late evening and early morning of the same day are both "today"', () => {
    expect(dueLabel(new Date(2026, 9, 19, 0, 5).toISOString(), NOON)).toEqual({ text: 'Đến hạn hôm nay', urgent: true })
    expect(dueLabel(new Date(2026, 9, 19, 23, 55).toISOString(), NOON)).toEqual({ text: 'Đến hạn hôm nay', urgent: true })
  })

  it('marks past dates as late and urgent', () => {
    expect(dueLabel(new Date(2026, 9, 16, 9, 0).toISOString(), NOON)).toEqual({ text: 'Trễ 3 ngày', urgent: true })
  })

  it('shows tomorrow and later dates without urgency', () => {
    expect(dueLabel(new Date(2026, 9, 20, 9, 0).toISOString(), NOON)).toEqual({ text: 'Ngày mai', urgent: false })
    expect(dueLabel(new Date(2026, 9, 24, 9, 0).toISOString(), NOON)).toEqual({ text: 'Còn 5 ngày', urgent: false })
  })
})

describe('masteryPercentOf', () => {
  it('rounds to a whole percent and clamps stray values', () => {
    expect(masteryPercentOf(0.724)).toBe(72)
    expect(masteryPercentOf(1.4)).toBe(100)
    expect(masteryPercentOf(-0.2)).toBe(0)
    expect(masteryPercentOf(Number.NaN)).toBe(0)
  })
})

describe('suggestion labels', () => {
  const base: Suggestion = {
    type: 'PRACTICE_SET', id: 's1', title: 'Bộ luyện', knowledgePointId: 'kp1', knowledgePointCode: 'R55',
    reason: 'CONSOLIDATE', band: 5.5, skill: 'READING', action: { kind: 'BASKET_REVIEW', knowledgePointId: 'kp1' },
  }

  it('names the button after what it does', () => {
    expect(suggestionCtaLabel(base)).toBe('Luyện ngay')
    expect(suggestionCtaLabel({ ...base, action: { kind: 'LESSON', lessonId: 'l1' } })).toBe('Vào học')
    expect(suggestionCtaLabel({ ...base, action: { kind: 'COURSE_LIST' } })).toBe('Xem trong khóa học')
  })

  it('gives every reason a label and a tone', () => {
    expect(reasonMeta('CONSOLIDATE').tone).toBe('accent')
    expect(reasonMeta('DUE').tone).toBe('primary')
    expect(reasonMeta('NEXT_IN_TREE').tone).toBe('success')
  })

  it('opens a review at its own page', () => {
    expect(reviewPath('abc')).toBe('/learn/reviews/abc')
  })
})
