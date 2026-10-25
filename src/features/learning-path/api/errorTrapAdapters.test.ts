import { describe, expect, it } from 'vitest'
import {
  mapLessonExerciseResult,
  mapPracticeSubmission,
  mapReviewDetail,
  mapReviewSubmission,
  mapTheoryCheck,
} from './learningAdapters'
import { mapReviewBasket } from './masteryGuideAdapters'

const trap = {
  code: 'TFNG_NG_AS_FALSE',
  name: 'Chọn False khi thông tin không được nêu',
  fixHint: 'Phân biệt "bài nói sai" (False) với "bài không nói tới" (Not Given) trước khi chọn.',
}

const wrong = { questionVersionId: 'q1', correct: false, correctAnswer: 'NOT_GIVEN', explanation: 'Không được nêu.' }

describe('the error of a wrong answer', () => {
  it('reaches the result of a lesson exercise, a practice set, a theory check and a review set', () => {
    const exercise = mapLessonExerciseResult({
      blockPassed: false, lessonCompleted: false, results: [{ ...wrong, error: trap }],
    })
    const practice = mapPracticeSubmission({
      attemptId: 'a1', correct: 0, total: 1, percent: 0, passed: false, countedAsEvidence: true,
      results: [{ ...wrong, error: trap }],
    })
    const theory = mapTheoryCheck({
      reviewId: 'r1', correct: 0, total: 1, stage: 'THEORY', results: [{ ...wrong, error: trap }],
    })
    const review = mapReviewSubmission(
      { reviewStatus: 'PENDING', results: [{ ...wrong, error: trap }] },
      'topic-1',
      null,
    )

    expect(exercise.results[0].error).toEqual(trap)
    expect(practice.results[0].error).toEqual(trap)
    expect(theory.results[0].error).toEqual(trap)
    expect(review.results[0].error).toEqual(trap)
  })

  it('maps a payload captured from the running learning-service (free practice, trap option chosen)', () => {
    // Copied from POST /api/learning/practice-attempts/{id}/submissions on a local stack with the seeded T/F/NG set.
    const captured = {
      attemptId: '19501d4a-fd7b-40ca-81d2-cae56a7b5ca1', correct: 0, total: 2, percent: 0, passed: false,
      countedAsEvidence: true, transcript: null, reviewsCreated: [],
      results: [
        {
          questionVersionId: '85000000-0000-4000-8000-000000001121', correct: false, correctAnswer: 'FALSE',
          explanation: 'The passage gives 08:30 as the first departure, directly contradicting 09:00.', hint: null,
          error: {
            code: 'TFNG_FALSE_AS_NG', name: 'Chọn Not Given khi bài đã nói ngược lại',
            fixHint: 'Nếu đoạn văn có ý trái ngược với câu hỏi thì đáp án là False, không phải Not Given.',
          },
        },
        {
          questionVersionId: '85000000-0000-4000-8000-000000001124', correct: false, correctAnswer: 'FALSE',
          explanation: 'The passage gives a different length, so 30 metres is contradicted.', hint: null,
        },
      ],
    }

    const result = mapPracticeSubmission(captured)

    expect(result.results[0].error).toEqual({
      code: 'TFNG_FALSE_AS_NG',
      name: 'Chọn Not Given khi bài đã nói ngược lại',
      fixHint: 'Nếu đoạn văn có ý trái ngược với câu hỏi thì đáp án là False, không phải Not Given.',
    })
    expect(result.results[1]).not.toHaveProperty('error')
  })

  it('is left out when the backend sends none, so an older backend keeps working', () => {
    const exercise = mapLessonExerciseResult({
      blockPassed: false, lessonCompleted: false, results: [wrong, { ...wrong, questionVersionId: 'q2', error: null }],
    })

    expect(exercise.results[0]).not.toHaveProperty('error')
    expect(exercise.results[1]).not.toHaveProperty('error')
  })

  it('is dropped when it has no code or no name, but a missing hint is tolerated', () => {
    const exercise = mapLessonExerciseResult({
      blockPassed: false,
      lessonCompleted: false,
      results: [
        { ...wrong, error: { code: '', name: 'Tên', fixHint: 'x' } },
        { ...wrong, questionVersionId: 'q2', error: { code: 'C', name: '', fixHint: 'x' } },
        { ...wrong, questionVersionId: 'q3', error: { code: 'C', name: 'Tên' } },
      ],
    })

    expect(exercise.results[0]).not.toHaveProperty('error')
    expect(exercise.results[1]).not.toHaveProperty('error')
    expect(exercise.results[2].error).toEqual({ code: 'C', name: 'Tên', fixHint: '' })
  })
})

describe('the error trap of a review', () => {
  const review = {
    reviewId: 'r1', reviewStatus: 'PENDING' as const, lessonId: 'l1', theory: [], set: null, stage: 'THEORY' as const,
  }

  it('is kept on the review the learner opens', () => {
    expect(mapReviewDetail({ ...review, errorTrap: trap }, 'topic-1').errorTrap).toEqual(trap)
  })

  it('is left out on a review without one', () => {
    expect(mapReviewDetail(review, 'topic-1')).not.toHaveProperty('errorTrap')
    expect(mapReviewDetail({ ...review, errorTrap: null }, 'topic-1')).not.toHaveProperty('errorTrap')
  })
})

describe('an error pattern in the review basket', () => {
  const item = {
    knowledgePointId: 'k1', code: 'TFNG_FALSE_VS_NOT_GIVEN', name: 'False và Not Given', tier: 'PRIORITY' as const,
    mastery: 0.45, reason: 'ERROR_PATTERN' as const, hasUnrevealedSet: true, reviewId: 'rev-1',
  }

  it('keeps the reason and the error of the point', () => {
    const [weak] = mapReviewBasket({ weak: [{ ...item, errorTrap: trap }] }).weak

    expect(weak.reason).toBe('ERROR_PATTERN')
    expect(weak.errorTrap).toEqual(trap)
  })

  it('has no error on an item that does not send one', () => {
    const [weak] = mapReviewBasket({ weak: [item] }).weak

    expect(weak).not.toHaveProperty('errorTrap')
  })
})
