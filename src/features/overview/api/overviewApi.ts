import { apiRequest, HttpError } from '@/lib/httpClient'

export type Skill = 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING'
export type BandSkill = Skill | 'OVERALL'
export type SeriesKind = 'PLACEMENT' | 'MOCK' | 'OFFICIAL_PRACTICE'
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
/** The parts of GET /api/learning/report the overview uses. */
export interface LearnerReportSummary {
  skills: LearnerReportSkill[]
  estimatedBand: { value: number | null; estimated: boolean } | null
  target: { targetBand: number | null; gap: number | null; examDate: string | null } | null
}
/** The parts of GET /api/learning-support/flashcards/notebook/summary the overview uses. */
export interface NotebookSummary {
  total: number
  dueNow: number
  learnedCount: number
  masteredCount: number
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
}
function query(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) if (value !== undefined && value !== '') params.set(key, String(value))
  return params.toString()
}
export const overviewApi = {
  report: (signal: AbortSignal) => apiRequest<LearnerReportSummary>('/api/learning/report', { signal, auth: true }),
  notebook: (signal: AbortSignal) =>
    apiRequest<NotebookSummary>(`/api/learning-support/flashcards/notebook/summary?${query({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })}`, { signal, auth: true }),
  streak: (signal: AbortSignal) => apiRequest<StreakSummary>('/api/learning/me/streak', { signal, auth: true }),
  time: (from: string, to: string, courseId: string, signal: AbortSignal) =>
    apiRequest<StudyTimeStatistics>(`/api/users/me/statistics/study-time?${query({ from, to, grain: 'DAY', courseId })}`, { signal, auth: true }),
  progress: async (page: number, courseId: string, signal: AbortSignal) => {
    try {
      return await apiRequest<ProgressStatistics>(`/api/learning/statistics/progress?${query({ page, size: 4, courseId })}`, { signal, auth: true })
    } catch (error) {
      if (error instanceof HttpError && error.status === 503 && error.code === 'PROGRESS_UNAVAILABLE') {
        throw new HttpError(error.status,
          'Chưa thể tổng hợp tiến độ. Thống kê hiện hỗ trợ tối đa 100 khóa đã bắt đầu; dữ liệu chương trình học chưa đầy đủ hoặc quá lớn cũng có thể gây lỗi này. Vui lòng thử lại sau hoặc liên hệ hỗ trợ nếu bạn đã bắt đầu hơn 100 khóa.',
          error.body, error.code)
      }
      throw error
    }
  },
  bands: (from: string, to: string, skill: BandSkill, seriesKind: SeriesKind, cursor: string, signal: AbortSignal) =>
    apiRequest<BandStatistics>(`/api/assessments/me/statistics/bands?${query({ from, to, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, skill, seriesKind, cursor, limit: 100 })}`, { signal, auth: true }),
  /** The 50 most recent finished attempts (the server's page limit) and how many there are in all. */
  practiceHistory: (signal: AbortSignal) =>
    apiRequest<PracticeHistory>(`/api/assessments/practice/history?${query({ page: 0, size: 50 })}`, { signal, auth: true }),
}

