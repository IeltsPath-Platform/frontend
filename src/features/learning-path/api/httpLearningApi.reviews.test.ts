import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from '@/lib/httpClient'
import { createHttpLearningApi } from './httpLearningApi'
import { mapReviewRef } from './learningAdapters'

vi.mock('@/lib/httpClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/httpClient')>()),
  apiRequest: vi.fn(),
}))

const rows = [
  { reviewId: 'optional', lessonId: 'lesson-2', knowledgePointId: 'kp-main-idea', blocking: false, sourcePackageId: null },
  { reviewId: 'required', lessonId: 'lesson-3', knowledgePointId: 'kp-detail', blocking: true, sourcePackageId: 'set-3' },
]

beforeEach(() => {
  vi.mocked(apiRequest).mockImplementation(async (path) => {
    if (path === '/api/learning/reviews?status=PENDING&limit=50') return rows
    if (path === '/api/learning/topics') return []
    if (path === '/api/learning/topics/topic-1/lessons') {
      return { topicId: 'topic-1', lessons: [], testStatus: 'PASSED' }
    }
    throw new Error(`Unexpected request: ${path}`)
  })
})

describe('pending review classification', () => {
  it('preserves the backend blocking flag when listing reviews', async () => {
    const reviews = await createHttpLearningApi().getPendingReviews()
    expect(reviews).toMatchObject([
      { reviewId: 'optional', blocking: false, knowledgePointTitle: 'Bài ôn tự chọn' },
      { reviewId: 'required', blocking: true, sourcePackageId: 'set-3' },
    ])
  })

  it('preserves the same classification and ownership in the topic lesson list', async () => {
    const topic = await createHttpLearningApi().getTopicLessons('topic-1')
    expect(topic.finalTest.testStatus).toBe('PASSED')
    expect(topic.pendingReviews).toMatchObject([
      { reviewId: 'optional', lessonId: 'lesson-2', blocking: false },
      { reviewId: 'required', lessonId: 'lesson-3', blocking: true, sourcePackageId: 'set-3' },
    ])
  })

  it('keeps review-required error references blocking when no flag is provided', () => {
    expect(mapReviewRef({ reviewId: 'required', lessonId: 'lesson-3', knowledgePointId: 'kp-detail' }))
      .toMatchObject({ blocking: true, knowledgePointTitle: 'Bài ôn bắt buộc' })
  })
})
