import type {
  CourseCompletion,
  LearnerReportSummary,
  ProgressStatistics,
  NotebookSummary,
  PracticeHistory,
  StudyDay,
} from './api/overviewApi'
import type { AiRecommendationItem, LearningOrbitSkill } from '@/types/overview'

const SKILLS = ['LISTENING', 'READING', 'WRITING', 'SPEAKING'] as const
const SKILL_LABEL: Record<string, string> = { LISTENING: 'Listening', READING: 'Reading', WRITING: 'Writing', SPEAKING: 'Speaking' }

const pad = (value: number) => String(value).padStart(2, '0')

/** yyyy-mm-dd of a local date, the format the statistics endpoints use. */
export function isoDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function daysAgo(today: Date, days: number) {
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() - days)
}

/** "47h 20m", "35m", "0m". */
export function formatDuration(seconds: number) {
  const minutes = Math.floor(Math.max(0, seconds) / 60)
  const hours = Math.floor(minutes / 60)
  return hours > 0 ? `${hours}h ${pad(minutes % 60)}m` : `${minutes}m`
}

export interface StudyTotals {
  totalSeconds: number
  studyDays: number
  weekSeconds: number
}

/** Totals over the loaded days; the week is the last 7 days up to and including today. */
export function studyTotals(days: StudyDay[], today: Date): StudyTotals {
  const weekStart = isoDate(daysAgo(today, 6))
  const todayKey = isoDate(today)
  let totalSeconds = 0
  let studyDays = 0
  let weekSeconds = 0
  for (const day of days) {
    const seconds = day.actualSeconds ?? 0
    if (seconds <= 0) continue
    totalSeconds += seconds
    studyDays += 1
    if (day.date >= weekStart && day.date <= todayKey) weekSeconds += seconds
  }
  return { totalSeconds, studyDays, weekSeconds }
}

export interface PracticeSummary {
  /** Finished practice attempts in all. */
  completed: number
  /** Mean score of the most recent Reading and Listening attempts, 0-100; null when there is none. */
  averagePercent: number | null
  /** How many attempts the mean is based on. */
  sample: number
}

/**
 * Reading and Listening are marked on submission. A submitted Writing or Speaking attempt still waiting for its
 * grader comes back from the server with a score of 0, so only the auto-marked skills enter the mean.
 */
const AUTO_MARKED = ['READING', 'LISTENING']

export function practiceSummary(history: PracticeHistory): PracticeSummary {
  const scores = history.items
    .filter((item) => AUTO_MARKED.includes(item.skill))
    .map((item) => item.percent)
    .filter((percent): percent is number => percent !== null)
  return {
    completed: history.totalElements,
    averagePercent: scores.length === 0 ? null : Math.round(scores.reduce((sum, percent) => sum + percent, 0) / scores.length),
    sample: scores.length,
  }
}

export type CalendarStatus = 'completed' | 'missed' | 'upcoming'

/** Key shape of the activity calendar: local year-month-day without zero padding. */
export function calendarKey(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return `${year}-${month}-${day}`
}

/** Days with no tracking are left out, so the calendar shows them as "no data" rather than "missed". */
export function calendarStatuses(days: StudyDay[]): Record<string, CalendarStatus> {
  const statuses: Record<string, CalendarStatus> = {}
  for (const day of days) {
    if (day.status === 'NOT_TRACKED') continue
    if ((day.actualSeconds ?? 0) > 0) statuses[calendarKey(day.date)] = 'completed'
    else if (day.status === 'FUTURE') statuses[calendarKey(day.date)] = 'upcoming'
    else statuses[calendarKey(day.date)] = 'missed'
  }
  return statuses
}

export interface HeroCourse {
  id: string
  name: string
  percent: number
  completedLessons: number
  totalLessons: number
  startedAt: string | null
}

/** The course studied most recently. */
export function currentCourse(progress: ProgressStatistics | null): HeroCourse | null {
  const courses = progress?.courses ?? []
  if (courses.length === 0) return null
  const byRecent = (a: CourseCompletion, b: CourseCompletion) => (b.lastStudiedAt ?? '').localeCompare(a.lastStudiedAt ?? '')
  const course = [...courses].sort(byRecent)[0]
  return {
    id: course.courseId,
    name: course.name,
    percent: course.percent ?? 0,
    completedLessons: course.completedLessons,
    totalLessons: course.totalLessons,
    startedAt: course.startedAt,
  }
}

export interface BandSummary {
  current: number | null
  currentIsEstimate: boolean
  target: number | null
  examDate: string | null
}

/** Current band: the estimate from the learner report, else what the learner said about themselves. */
export function bandSummary(report: LearnerReportSummary | null, selfReportedBand: number | null | undefined): BandSummary {
  const estimate = report?.estimatedBand?.value ?? null
  return {
    current: estimate ?? selfReportedBand ?? null,
    currentIsEstimate: estimate !== null,
    target: report?.target?.targetBand ?? null,
    examDate: report?.target?.examDate ?? null,
  }
}

const ORBIT_COLORS: Record<string, LearningOrbitSkill['badgeType']> = {
  LISTENING: 'red', READING: 'green', WRITING: 'orange', SPEAKING: 'blue',
}

export function orbitSkills(report: LearnerReportSummary | null): LearningOrbitSkill[] {
  return SKILLS.map((skill) => {
    const row = report?.skills.find((item) => item.skill === skill)
    const tiers = row?.tierCounts ?? {}
    const priority = tiers.PRIORITY ?? 0
    return {
      name: SKILL_LABEL[skill] as LearningOrbitSkill['name'],
      band: row?.band ?? null,
      badgeText: !row || row.kpCount === 0 ? 'CHƯA CÓ DỮ LIỆU' : priority > 0 ? 'PRIORITY FOCUS' : 'ĐANG TỐT',
      badgeType: ORBIT_COLORS[skill],
      percent: row?.mastery == null ? 0 : Math.round(row.mastery * 100),
      details: [
        { label: 'Cần ưu tiên', score: String(priority) },
        { label: 'Cần củng cố', score: String(tiers.CONSOLIDATE ?? 0) },
        { label: 'Đã vững', score: String(tiers.MAINTAIN ?? 0) },
        { label: 'Chưa đủ dữ liệu', score: String(tiers.INSUFFICIENT ?? 0) },
      ],
    }
  })
}

const SKILL_ICON: Record<string, AiRecommendationItem['iconType']> = {
  LISTENING: 'headphones', READING: 'book', WRITING: 'pen', SPEAKING: 'mic',
}

/** At most three suggestions drawn from the learner's own data; the order is due words, weakest skill, then a start. */
export function recommendations(
  report: LearnerReportSummary | null,
  notebook: Pick<NotebookSummary, 'dueNow'> | null,
): AiRecommendationItem[] {
  const items: AiRecommendationItem[] = []

  if (notebook && notebook.dueNow > 0) {
    items.push({
      id: 'vocabulary-due',
      iconType: 'refresh',
      badgeText: 'Cần ôn hôm nay',
      title: 'Ôn từ vựng đến hạn',
      description: `${notebook.dueNow} từ theo lịch ôn lặp lại cần ôn hôm nay`,
      to: '/vocabulary/notebook/review',
    })
  }

  const withData = (report?.skills ?? []).filter((row) => (SKILLS as readonly string[]).includes(row.skill) && row.kpCount > 0)
  if (withData.length > 0) {
    const weakest = [...withData].sort((a, b) =>
      (b.tierCounts.PRIORITY ?? 0) - (a.tierCounts.PRIORITY ?? 0) || (a.mastery ?? 1) - (b.mastery ?? 1))[0]
    const priority = weakest.tierCounts.PRIORITY ?? 0
    const label = SKILL_LABEL[weakest.skill]
    items.push({
      id: `weakest-${weakest.skill.toLowerCase()}`,
      iconType: SKILL_ICON[weakest.skill],
      badgeText: priority > 0 ? 'Điểm yếu' : 'Nên luyện thêm',
      title: `Luyện ${label}`,
      description: priority > 0
        ? `${priority} điểm kiến thức ${label} đang cần ưu tiên ôn`
        : `Mức nắm vững ${label} hiện khoảng ${Math.round((weakest.mastery ?? 0) * 100)}%`,
      to: `/practice-tests?skill=${weakest.skill.toLowerCase()}`,
    })
  } else if (report && report.estimatedBand?.value == null) {
    items.push({
      id: 'placement',
      iconType: 'book',
      badgeText: 'Bắt đầu',
      title: 'Làm bài kiểm tra đầu vào',
      description: 'Xác định band hiện tại để hệ thống gợi ý lộ trình phù hợp',
      to: '/learn/placement',
    })
  }

  if (items.length < 3) {
    items.push({
      id: 'practice-tests',
      iconType: 'headphones',
      badgeText: 'Luyện tập',
      title: 'Luyện đề 4 kỹ năng',
      description: 'Chọn đề Listening, Reading, Writing hoặc Speaking để luyện',
      to: '/practice-tests',
    })
  }
  return items.slice(0, 3)
}
