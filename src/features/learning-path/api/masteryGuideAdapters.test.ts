import { describe, expect, it } from 'vitest'
import { mapReviewBasket, mapSuggestions, suggestionAction } from './masteryGuideAdapters'

describe('suggestionAction', () => {
  it('opens a lesson from its API route', () => {
    expect(suggestionAction('/api/learning/lessons/11111111-1111-4111-8111-111111111111', 'kp'))
      .toEqual({ kind: 'LESSON', lessonId: '11111111-1111-4111-8111-111111111111' })
  })

  it('starts a basket review from its start route and takes the point from the route', () => {
    expect(suggestionAction('/api/learning/review-basket/kp-7/start', 'other'))
      .toEqual({ kind: 'BASKET_REVIEW', knowledgePointId: 'kp-7' })
  })

  it('leaves everything else to the course list, including a missing route', () => {
    expect(suggestionAction(null, 'kp')).toEqual({ kind: 'COURSE_LIST' })
    expect(suggestionAction(undefined, 'kp')).toEqual({ kind: 'COURSE_LIST' })
    expect(suggestionAction('/api/learning/something-else/1', 'kp')).toEqual({ kind: 'COURSE_LIST' })
    expect(suggestionAction('/api/learning/lessons/1/extra', 'kp')).toEqual({ kind: 'COURSE_LIST' })
  })
})

describe('mapSuggestions', () => {
  it('reads a band sent as a number or as text, and drops one that is not a number', () => {
    const [a, b, c, d] = mapSuggestions({
      suggestions: [
        { type: 'LESSON', id: '1', title: 'A', knowledgePointId: 'k', reason: 'DUE', band: 5.5 },
        { type: 'LESSON', id: '2', title: 'B', knowledgePointId: 'k', reason: 'DUE', band: '6.0' },
        { type: 'LESSON', id: '3', title: 'C', knowledgePointId: 'k', reason: 'DUE', band: 'high' },
        { type: 'LESSON', id: '4', title: 'D', knowledgePointId: 'k', reason: 'DUE' },
      ],
    })
    expect([a.band, b.band, c.band, d.band]).toEqual([5.5, 6, null, null])
  })

  it('tolerates a missing list', () => {
    expect(mapSuggestions(null)).toEqual([])
    expect(mapSuggestions({})).toEqual([])
    expect(mapSuggestions({ suggestions: null })).toEqual([])
  })
})

describe('mapReviewBasket', () => {
  it('fills optional fields with null and keeps the three groups apart', () => {
    const basket = mapReviewBasket({
      required: [{ reviewId: 'r1', knowledgePointId: 'k1', code: 'C1', name: 'Name 1' }],
      consolidate: [{
        knowledgePointId: 'k2', code: 'C2', name: 'Name 2', tier: 'CONSOLIDATE', mastery: 0.7, reason: 'CONSOLIDATE',
        hasUnrevealedSet: true,
      }],
      due: [],
    })
    expect(basket.required[0]).toMatchObject({ reviewId: 'r1', lessonId: null, skill: null })
    expect(basket.consolidate[0]).toMatchObject({ dueAt: null, reviewId: null, skill: null })
    expect(basket.due).toEqual([])
  })

  it('tolerates a missing body', () => {
    expect(mapReviewBasket(undefined)).toEqual({ required: [], consolidate: [], due: [] })
  })
})
