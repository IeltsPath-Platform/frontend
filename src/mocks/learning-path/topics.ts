import type { MockKnowledgePoint, MockTopic } from './contentTypes'

export const MOCK_LEARNER = { id: 'user-lan', name: 'Lan' }

export const MOCK_TOPICS: MockTopic[] = [
  {
    id: 'topic-demo-reading',
    code: 'DEMO_READING',
    title: 'Đọc hiểu nền tảng',
    description: 'Paraphrase, scanning, ý chính đoạn, điền từ và làm quen True / False / Not Given.',
    sequenceOrder: 1,
    lessonIds: ['lesson-l1', 'lesson-l2', 'lesson-l3', 'lesson-l4'],
    testTitle: 'Bài kiểm tra cuối: Đọc hiểu nền tảng',
    testQuestionCount: 4,
    testPackageCodes: ['X1', 'X2'],
  },
  {
    id: 'topic-tfng-skills',
    code: 'TFNG_SKILLS',
    title: 'Kỹ năng True / False / Not Given',
    description: 'Phân biệt FALSE và NOT GIVEN, xử lý từ hạn định như most, all, only.',
    sequenceOrder: 2,
    lessonIds: ['lesson-tfng-1', 'lesson-tfng-2'],
    testTitle: 'Bài kiểm tra cuối: True / False / Not Given',
    testQuestionCount: 5,
    testPackageCodes: [],
  },
  {
    id: 'topic-matching-headings',
    code: 'MATCHING_HEADINGS',
    title: 'Matching Headings',
    description: 'Chọn tiêu đề cho từng đoạn dựa trên ý chính, tránh bẫy từ khóa trùng.',
    sequenceOrder: 3,
    lessonIds: ['lesson-mh-1', 'lesson-mh-2'],
    testTitle: 'Bài kiểm tra cuối: Matching Headings',
    testQuestionCount: 5,
    testPackageCodes: [],
  },
]

/** KP5 has no practice pack, so it never triggers a review. */
export const MOCK_KNOWLEDGE_POINTS: MockKnowledgePoint[] = [
  { code: 'KP1', title: 'Scanning: tìm thông tin cụ thể', theoryLessonId: 'lesson-l2' },
  { code: 'KP2', title: 'Nhận diện paraphrase', theoryLessonId: 'lesson-l1' },
  { code: 'KP3', title: 'Xác định ý chính của đoạn', theoryLessonId: 'lesson-l3' },
  { code: 'KP4', title: 'Điền từ hoàn thành câu', theoryLessonId: 'lesson-l3' },
  { code: 'KP5', title: 'True / False / Not Given', theoryLessonId: 'lesson-l4' },
]
