import { describe, expect, it } from 'vitest'
import { MOCK_REVIEW_PACKS } from '@/mocks/learning-path/reviewPacks'
import { createMockLearningApi } from './mockLearningApi'
import { MOCK_TREE_POINTS } from './mockTree'

const point = (code: string) => MOCK_TREE_POINTS.find((candidate) => candidate.code === code)!

describe('the mock follows a repeated mistake from the basket to the review', () => {
  it('lists a weak mistake under a firm parent as an error-pattern review with the mistake named', async () => {
    const api = createMockLearningApi()

    const basket = await api.getReviewBasket()

    expect(basket.weak.map((item) => [item.code, item.reason, item.errorTrap?.code])).toEqual([
      ['R60_TFNG_F_VS_NG', 'ERROR_PATTERN', 'TFNG_NG_AS_FALSE'],
      ['R65_PARAPHRASE', 'ERROR_PATTERN', 'PARAPHRASE_TRAP'],
    ])
    // A point that has a review for its mistake is not offered a second time, and a not-yet-weak mistake changes nothing.
    expect([...basket.consolidate, ...basket.due].map((item) => item.code)).not.toContain('R65_PARAPHRASE')
    expect(basket.consolidate.map((item) => item.code)).toContain('R55_MAIN_IDEA')
  })

  it('opens an optional review that names the mistake and does not lock lessons', async () => {
    const api = createMockLearningApi()

    const { reviewId } = await api.startBasketReview(point('R65_PARAPHRASE').knowledgePointId)
    const review = await api.getReview(reviewId)

    expect(review.status).toBe('PENDING')
    expect(review.blocking).toBe(false)
    expect(review.errorTrap?.code).toBe('PARAPHRASE_TRAP')
    expect(review.set?.questions.length).toBeGreaterThan(0)
    expect((await api.getReviewBasket()).required).toEqual([])
  })

  it('returns the review already open instead of starting a second one', async () => {
    const api = createMockLearningApi()
    const id = point('R60_TFNG_F_VS_NG').knowledgePointId

    const first = await api.startBasketReview(id)
    const second = await api.startBasketReview(id)

    expect(second.reviewId).toBe(first.reviewId)
  })

  it('has nothing to start for a point without a repeated mistake', async () => {
    const api = createMockLearningApi()

    await expect(api.startBasketReview(point('R55_TOPIC_SENTENCE').knowledgePointId)).rejects.toMatchObject({ status: 404 })
  })
})

describe('the mock review sets carry the traps the backend seeds', () => {
  const traps = (kp: string) => MOCK_REVIEW_PACKS[kp].flatMap((set) => set.questions)
    .flatMap((question) => Object.values(question.traps ?? {}).map((hint) => hint.code))

  it('names the True/False/Not Given, paraphrase and wrong-paragraph mistakes', () => {
    expect(new Set(traps('KP5'))).toEqual(new Set(['TFNG_NG_AS_FALSE', 'TFNG_FALSE_AS_NG']))
    expect(new Set(traps('KP2'))).toEqual(new Set(['PARAPHRASE_TRAP']))
    expect(new Set(traps('KP3'))).toEqual(new Set(['WRONG_PARAGRAPH']))
  })

  it('gives every True/False/Not Given set at least two trap questions', () => {
    for (const set of MOCK_REVIEW_PACKS.KP5) {
      expect(set.questions.filter((question) => question.traps).length).toBeGreaterThanOrEqual(2)
    }
  })
})
