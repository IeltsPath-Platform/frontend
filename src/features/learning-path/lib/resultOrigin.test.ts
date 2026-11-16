import { describe, expect, it } from 'vitest'
import { historyTrail, readOrigin, withOrigin } from './resultOrigin'

describe('where a result page was opened from', () => {
  it('remembers the list with its tab and skill, and reads it back', () => {
    const path = withOrigin('/practice/writing/submissions/s-1/result', '/submission-history?tab=practice&skill=writing')

    expect(path).toBe('/practice/writing/submissions/s-1/result?from=%2Fsubmission-history%3Ftab%3Dpractice%26skill%3Dwriting')
    expect(readOrigin(path.slice(path.indexOf('?')))).toEqual({ to: '/submission-history?tab=practice&skill=writing' })
  })

  it('knows the old address of the teacher list as the same page', () => {
    expect(readOrigin('?from=%2Fwriting-reviews')).toEqual({ to: '/writing-reviews' })
  })

  it('ignores an address that names no origin', () => {
    expect(readOrigin('')).toBeNull()
    expect(readOrigin('?other=1')).toBeNull()
  })

  it('ignores a place this app does not offer as an origin, and anything that leaves the app', () => {
    expect(readOrigin('?from=%2Fadmin')).toBeNull()
    expect(readOrigin('?from=%2Fsubmission-historyx')).toBeNull()
    expect(readOrigin('?from=https%3A%2F%2Fevil.example%2Fsubmission-history')).toBeNull()
    expect(readOrigin('?from=%2F%2Fevil.example')).toBeNull()
    expect(readOrigin('?from=%2Fsubmission-history%5C..')).toBeNull()
  })
})

describe('the trail of a page under "Lịch sử nộp bài"', () => {
  it('follows the menu: the list, then the page (the trail puts the house before them)', () => {
    expect(historyTrail('Kết quả bài viết', null)).toEqual([
      { label: 'Lịch sử nộp bài', to: '/submission-history' },
      { label: 'Kết quả bài viết' },
    ])
  })

  it('returns to the tab the learner came from, and keeps the steps between', () => {
    const trail = historyTrail('Luyện · TA', { to: '/submission-history?tab=knowledge' }, [{ label: 'Kết quả bài viết', to: '/x' }])

    expect(trail.map((item) => item.label)).toEqual(['Lịch sử nộp bài', 'Kết quả bài viết', 'Luyện · TA'])
    expect(trail[0].to).toBe('/submission-history?tab=knowledge')
  })
})
