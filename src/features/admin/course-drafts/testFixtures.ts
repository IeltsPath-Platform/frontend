import type { CourseAnalysis, CourseDraft, CourseStructure } from './types'

export const draftId = '20000000-0000-4000-8000-000000000001'
export const courseId = '20000000-0000-4000-8000-000000000002'
export const topicId = '20000000-0000-4000-8000-000000000003'
export const knowledgePointId = '20000000-0000-4000-8000-000000000004'
export const packageId = '20000000-0000-4000-8000-000000000005'
export function makeStructure(): CourseStructure {
  return {
    course: { code: 'READING_65', name: 'Reading 6.5 course', bandLevel: 6.5 },
    topics: [{ code: 'READING_PARAPHRASE', name: 'Paraphrase', skill: 'READING', sortOrder: 970, lessons: [], topicTest: { code: 'PARAPHRASE_FINAL', title: 'Paraphrase final test' } }],
    courseTest: { code: 'READING_FINAL', title: 'Reading final test' }, practiceTestMilestones: [], gaps: [],
  }
}
export function makeAnalysis(overrides: Partial<CourseAnalysis> = {}): CourseAnalysis {
  return { valid: true, errors: [], warnings: [], gaps: [], coverage: { expected: 2, covered: 2 }, ...overrides }
}
export function makeCourseDraft(overrides: Partial<CourseDraft> = {}): CourseDraft {
  return {
    id: draftId, kind: 'COURSE', status: 'READY', request: {}, result: makeStructure(),
    errorCode: null, model: null, promptVersion: null, createdAt: '2026-10-23T00:00:00Z',
    finishedAt: '2026-10-23T00:00:00Z', reviewedAt: null, reviewNote: null, ...overrides,
  }
}
