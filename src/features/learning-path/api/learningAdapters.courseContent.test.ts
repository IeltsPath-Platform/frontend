import { describe, expect, it } from 'vitest'
import { mapCourseSummary, mapTopicSummary } from './learningAdapters'

describe('course content adapters', () => {
  it('carries a course cover and description into the learner course summary', () => {
    expect(mapCourseSummary({
      courseId: 'course-1', code: 'B1', name: 'Starter course', bandLevel: 4,
      topicCount: 2, passedTopicCount: 0, recommended: true, testStatus: 'LOCKED',
      coverImageUrl: 'https://example.com/course.jpg', description: 'Nền tảng IELTS.',
    })).toMatchObject({
      coverImageUrl: 'https://example.com/course.jpg',
      description: 'Nền tảng IELTS.',
    })
  })

  it('uses the topic description and course cover when present', () => {
    expect(mapTopicSummary({
      topicId: 'topic-1', code: 'READING', name: 'Reading', description: 'Đọc hiểu văn bản.',
      sequenceOrder: 1, status: 'IN_PROGRESS', completedLessonCount: 0, totalLessonCount: 3,
      course: {
        courseId: 'course-1', code: 'B1', name: 'Starter course', bandLevel: 4,
        coverImageUrl: 'https://example.com/course.jpg', description: 'Nền tảng IELTS.',
      },
    })).toMatchObject({
      description: 'Đọc hiểu văn bản.',
      course: {
        coverImageUrl: 'https://example.com/course.jpg',
        description: 'Nền tảng IELTS.',
      },
    })
  })
})
