import { apiRequest, HttpError } from '@/lib/httpClient'

export type Skill = 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING'
export type BandSkill = Skill | 'OVERALL'
export type SeriesKind = 'PLACEMENT' | 'MOCK' | 'OFFICIAL_PRACTICE'
/** One graded Writing essay (first submission only) on GET /api/learning/writing/progress; bands are the stored, estimated ones. */
export interface WritingProgressPoint {
  submissionId: string
  source: 'LESSON' | 'PRACTICE' | 'FREE'
  gradedAt: string
  overallBand: number
  /** TA (Task 1) or TR (Task 2), CC, LR, GRA; a criterion the grade lacks is absent. */
  criteria: Partial<Record<'TA' | 'TR' | 'CC' | 'LR' | 'GRA', number>>
  /** Changes when the way of grading changes; absent on essays graded before it was kept. */
  promptVersion?: string
}
export interface WritingProgressError {
  errorCode: string
  errorName?: string
  fixHint?: string
  /** Present only when the error kind has a practice set. */
  practiceKnowledgePointId?: string
  essaysWithError: number
  essaysTotal: number
  lastSeenAt: string
}
export interface WritingProgressFixedError {
  errorCode: string
  errorName?: string
  lastSeenAt: string
  cleanEssaysSince: number
}
export interface WritingProgressTask {
  task: 'TASK_1' | 'TASK_2'
  /** True under 3 essays: the lists are still sent, but a trend would mean nothing. */
  insufficient: boolean
  /** Oldest first. */
  points: WritingProgressPoint[]
  recurringErrors: WritingProgressError[]
  fixedErrors: WritingProgressFixedError[]
}
export interface WritingProgress { tasks: WritingProgressTask[] }
export interface BandAvailabilityOption {
  seriesKind: SeriesKind
  skill: BandSkill
  latestSubmittedAt: string
}
export interface BandAvailability { options: BandAvailabilityOption[] }
export interface StudyDay {
  date: string
  timezone: string
  actualSeconds: number | null
  plannedSeconds: number | null
  status: 'NOT_TRACKED' | 'FUTURE' | 'PARTIAL_DAY' | 'COMPLETE'
}
export interface StudyTimeStatistics {
  availability: string
  generatedAt: string
  dataFrom: string | null
  timezonePolicy: string
  scope: string
  days: StudyDay[]
}
export interface SkillCompletion {
  skill: Skill
  completedLessons: number
  totalLessons: number
  percent: number | null
}
export interface CourseCompletion {
  courseId: string
  name: string
  bandLevel: number | null
  completedLessons: number
  totalLessons: number
  percent: number | null
  startedAt: string | null
  lastStudiedAt: string | null
  activityProvenance: string
  resumeTarget: { type: 'COURSE'; courseId: string }
}
export interface ProgressStatistics {
  availability: string
  generatedAt: string
  dataFrom: string
  scope: string
  curriculumRevision: string
  skills: SkillCompletion[]
  courses: CourseCompletion[]
  page: number
  size: number
  totalCourses: number
  hasNext: boolean
}
export interface BandPoint {
  attemptId: string
  resultVersion: number
  submittedAt: string
  band: number
  pendingRegrade: boolean
  gradingSource: string
  measurementQuality: string
  scoringVersion: string
}
export interface BandStatistics {
  availability: string
  generatedAt: string
  dataFrom: string | null
  seriesKind: SeriesKind
  skill: BandSkill
  eligibilityReason: string | null
  points: BandPoint[]
  nextCursor: string | null
  baseline: number | null
  latest: number | null
  delta: number | null
}
export type VocabularyState = 'NEW' | 'L1' | 'L2' | 'L3' | 'RETAINED'
export interface LearnerReportSkill {
  skill: string
  mastery: number | null
  tierCounts: Record<string, number>
  kpCount: number
  band: number | null
}
/** One knowledge point of the report; `band` is the band level of the course the point belongs to. */
export interface ReportKnowledgePoint {
  skill: string | null
  band: number | null
  score: { mastery: number; tier: string; evidenceCount: number }
}
/** The parts of GET /api/learning/report the overview uses. */
export interface LearnerReportSummary {
  knowledgePoints?: ReportKnowledgePoint[]
  skills: LearnerReportSkill[]
  estimatedBand: { value: number | null; estimated: boolean } | null
  target: { targetBand: number | null; gap: number | null; examDate: string | null } | null
  placementBand?: number | null
}
/** The parts of GET /api/learning-support/flashcards/notebook/summary the overview uses. */
export interface NotebookSummary {
  total: number
  dueNow: number
  learnedCount: number
  masteredCount: number
  newCount?: number
  inProgressCount?: number
  dueReviewCount?: number
  byLevel: Record<'UNKNOWN' | 'FAMILIAR' | 'LEARNING' | 'MASTERED', number>
}
/** One finished practice attempt of GET /api/assessments/practice/history; `percent` is 0-100. */
export interface PracticeHistoryItem {
  attemptId: string
  skill: string
  status: string
  submittedAt: string | null
  percent: number | null
}
export interface PracticeHistory {
  totalElements: number
  items: PracticeHistoryItem[]
}
export interface StreakSummary {
  currentDays: number
  longestDays: number
  activeToday: boolean
  freezeAvailable?: boolean
  /** Points the next freeze costs, as GET /api/learning/me/streak returns it. */
  nextFreezeCost?: number
  /** yyyy-mm-dd dates of the latest run of days a freeze covered, oldest first. */
  frozenDays?: string[]
}
export interface LearningOverviewStatistics {
  generatedAt: string
  dataFrom: string | null
  totalStudySeconds: number
  completedLessons: number
}
export interface OverviewTestResult {
  attemptId: string
  resultId: string
  resultVersion: number
  seriesKind: SeriesKind
  submittedAt: string
  overallBand: number
  skills: { skill: Skill; band: number }[]
  gradingSource: string
  measurementQuality: string
  scoringVersion: string | null
  pendingRegrade: boolean
}
function query(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) if (value !== undefined && value !== '') params.set(key, String(value))
  return params.toString()
}
export const overviewApi = {
  learningOverview: (signal: AbortSignal) => apiRequest<LearningOverviewStatistics>('/api/learning/statistics/overview', { signal, auth: true }),
  report: (signal: AbortSignal) => apiRequest<LearnerReportSummary>('/api/learning/report', { signal, auth: true }),
  streak: (signal: AbortSignal) => apiRequest<StreakSummary>('/api/learning/me/streak', { signal, auth: true }),
  time: (from: string, to: string, courseId: string, signal: AbortSignal) =>
    apiRequest<StudyTimeStatistics>(`/api/users/me/statistics/study-time?${query({ from, to, grain: 'DAY', courseId })}`, { signal, auth: true }),
  progress: async (page: number, courseId: string, signal: AbortSignal, size = 4) => {
    try {
      return await apiRequest<ProgressStatistics>(`/api/learning/statistics/progress?${query({ page, size, courseId })}`, { signal, auth: true })
    } catch (error) {
      if (error instanceof HttpError && error.status === 503 && error.code === 'PROGRESS_UNAVAILABLE') {
        throw new HttpError(error.status,
          'Chưa thể tổng hợp tiến độ. Thống kê hiện hỗ trợ tối đa 100 khóa đã bắt đầu; dữ liệu chương trình học chưa đầy đủ hoặc quá lớn cũng có thể gây lỗi này. Vui lòng thử lại sau hoặc liên hệ hỗ trợ nếu bạn đã bắt đầu hơn 100 khóa.',
          error.body, error.code)
      }
      throw error
    }
  },
  /** The progress endpoint supports 20 courses/page and at most 100 started courses. */
  allProgress: async (signal: AbortSignal): Promise<ProgressStatistics> => {
    const first = await overviewApi.progress(0, '', signal, 20)
    const courses = [...first.courses]
    let last = first
    for (let page = 1; last.hasNext && page < 5; page++) {
      last = await overviewApi.progress(page, '', signal, 20)
      if (last.totalCourses !== first.totalCourses || last.curriculumRevision !== first.curriculumRevision) {
        throw new Error('Danh sách khóa học vừa thay đổi. Vui lòng tải lại.')
      }
      courses.push(...last.courses)
    }
    if (last.hasNext || courses.length !== first.totalCourses || new Set(courses.map((course) => course.courseId)).size !== courses.length) {
      throw new Error('Chưa tải đủ danh sách khóa học. Vui lòng thử lại.')
    }
    return { ...first, courses, size: courses.length, hasNext: false }
  },
  bandAvailability: (from: string, to: string, signal: AbortSignal) =>
    apiRequest<BandAvailability>(`/api/assessments/me/statistics/bands/availability?${query({ from, to, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })}`, { signal, auth: true }),
  bands: (from: string, to: string, skill: BandSkill, seriesKind: SeriesKind, cursor: string, signal: AbortSignal) =>
    apiRequest<BandStatistics>(`/api/assessments/me/statistics/bands?${query({ from, to, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, skill, seriesKind, cursor, limit: 100 })}`, { signal, auth: true }),
  /** The learner's placement band for one skill (the placement test is taken once), or null when there is none. */
  placementBand: (from: string, to: string, skill: BandSkill, signal: AbortSignal) =>
    overviewApi.bands(from, to, skill, 'PLACEMENT', '', signal).then((history) => history.latest),
  /** Both tasks, the 10 most recent first-submission essays each. */
  writingProgress: (signal: AbortSignal) =>
    apiRequest<WritingProgress>('/api/learning/writing/progress', { signal, auth: true }),
  /** The 50 most recent finished attempts (the server's page limit) and how many there are in all. */
  practiceHistory: (signal: AbortSignal) =>
    apiRequest<PracticeHistory>(`/api/assessments/practice/history?${query({ page: 0, size: 50 })}`, { signal, auth: true }),
}

