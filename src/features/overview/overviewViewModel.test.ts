import { describe, expect, it } from 'vitest'
import type { LearnerReportSummary, ProgressStatistics, StudyDay } from './api/overviewApi'
import {
  bandSummary,
  calendarKey,
  calendarStatuses,
  currentCourse,
  formatDuration,
  isoDate,
  orbitSkills,
  practiceSummary,
  recommendations,
  studyTotals,
} from './overviewViewModel'

const day = (date: string, actualSeconds: number | null, status: StudyDay['status'] = 'COMPLETE'): StudyDay =>
  ({ date, timezone: 'Asia/Ho_Chi_Minh', actualSeconds, plannedSeconds: null, status })

const TODAY = new Date(2026, 9, 28)

const skillRow = (skill: string, mastery: number | null, tiers: Record<string, number>, kpCount: number, band: number | null = null) =>
  ({ skill, mastery, tierCounts: { PRIORITY: 0, CONSOLIDATE: 0, MAINTAIN: 0, INSUFFICIENT: 0, ...tiers }, kpCount, band })

const report = (overrides: Partial<LearnerReportSummary> = {}): LearnerReportSummary => ({
  skills: [], estimatedBand: null, target: null, ...overrides,
})

const notebook = (dueNow: number) => ({ dueNow })

describe('formatting', () => {
  it('formats a duration as hours and minutes, or minutes alone', () => {
    expect(formatDuration(47 * 3600 + 20 * 60)).toBe('47h 20m')
    expect(formatDuration(3600 + 5 * 60)).toBe('1h 05m')
    expect(formatDuration(35 * 60 + 59)).toBe('35m')
    expect(formatDuration(0)).toBe('0m')
    expect(formatDuration(-5)).toBe('0m')
  })

  it('writes a local date as yyyy-mm-dd and the calendar key without padding', () => {
    expect(isoDate(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(calendarKey('2026-01-05')).toBe('2026-1-5')
  })
})

describe('practiceSummary', () => {
  const item = (percent: number | null, skill = 'READING') => ({ attemptId: 'a', skill, status: 'SUBMITTED', submittedAt: null, percent })

  it('counts every finished attempt and averages the scores of the ones loaded', () => {
    expect(practiceSummary({ totalElements: 124, items: [item(80), item(70), item(null), item(75)] }))
      .toEqual({ completed: 124, averagePercent: 75, sample: 3 })
  })

  it('leaves pending Writing and Speaking attempts out of the mean, because the server reports them as 0', () => {
    expect(practiceSummary({ totalElements: 4, items: [item(90, 'LISTENING'), item(70), item(0, 'WRITING'), item(0, 'SPEAKING')] }))
      .toEqual({ completed: 4, averagePercent: 80, sample: 2 })
  })

  it('has no average when nothing is scored', () => {
    expect(practiceSummary({ totalElements: 2, items: [item(null)] })).toEqual({ completed: 2, averagePercent: null, sample: 0 })
    expect(practiceSummary({ totalElements: 0, items: [] })).toEqual({ completed: 0, averagePercent: null, sample: 0 })
  })
})

describe('studyTotals', () => {
  it('adds up studied seconds, counts studied days and the last seven days', () => {
    const totals = studyTotals([
      day('2026-10-01', 3600),
      day('2026-10-21', 1800), // exactly 7 days ago including today is 10-22, so this one is outside the week
      day('2026-10-22', 600),
      day('2026-10-28', 1200),
      day('2026-10-29', 900, 'FUTURE'), // not yet, must not count in the week
      day('2026-10-27', 0),
      day('2026-10-26', null, 'NOT_TRACKED'),
    ], TODAY)

    expect(totals.totalSeconds).toBe(3600 + 1800 + 600 + 1200 + 900)
    expect(totals.studyDays).toBe(5)
    expect(totals.weekSeconds).toBe(600 + 1200)
  })

  it('is empty when nothing was studied', () => {
    expect(studyTotals([day('2026-10-28', null, 'NOT_TRACKED')], TODAY)).toEqual({ totalSeconds: 0, studyDays: 0, weekSeconds: 0 })
  })
})

describe('calendarStatuses', () => {
  it('marks studied days, missed tracked days and future days, and leaves untracked days out', () => {
    const statuses = calendarStatuses([
      day('2026-10-26', 600),
      day('2026-10-27', 0),
      day('2026-10-28', 0, 'PARTIAL_DAY'),
      day('2026-10-29', null, 'FUTURE'),
      day('2026-10-10', null, 'NOT_TRACKED'),
    ])

    expect(statuses).toEqual({
      '2026-10-26': 'completed',
      '2026-10-27': 'missed',
      '2026-10-28': 'missed',
      '2026-10-29': 'upcoming',
    })
  })
})

describe('currentCourse', () => {
  const progress = (courses: Partial<ProgressStatistics['courses'][number]>[]): ProgressStatistics => ({
    availability: 'AVAILABLE', generatedAt: '', dataFrom: '', scope: '', curriculumRevision: '', skills: [],
    courses: courses.map((course, index) => ({
      courseId: `c${index}`, name: `Course ${index}`, bandLevel: 6, completedLessons: 3, totalLessons: 10, percent: 30,
      startedAt: '2026-10-01', lastStudiedAt: null, activityProvenance: '', resumeTarget: { type: 'COURSE', courseId: `c${index}` },
      ...course,
    })),
    page: 0, size: 4, totalCourses: courses.length, hasNext: false,
  })

  it('is null without a started course', () => {
    expect(currentCourse(null)).toBeNull()
    expect(currentCourse(progress([]))).toBeNull()
  })

  it('picks the course studied most recently', () => {
    const course = currentCourse(progress([
      { lastStudiedAt: '2026-10-20T10:00:00Z' },
      { lastStudiedAt: '2026-10-27T10:00:00Z', name: 'Latest', percent: 55.5 },
    ]))
    expect(course).toMatchObject({ id: 'c1', name: 'Latest', percent: 55.5, completedLessons: 3, totalLessons: 10 })
  })
})

describe('bandSummary', () => {
  it('prefers the estimate and marks it as one', () => {
    const summary = bandSummary(report({
      estimatedBand: { value: 6, estimated: true },
      target: { targetBand: 7, gap: 1, examDate: '2027-01-20' },
    }), 5)
    expect(summary).toEqual({ current: 6, currentIsEstimate: true, target: 7, examDate: '2027-01-20' })
  })

  it('falls back to the band the learner reported, then to nothing', () => {
    expect(bandSummary(report(), 5.5)).toMatchObject({ current: 5.5, currentIsEstimate: false, target: null })
    expect(bandSummary(null, null)).toEqual({ current: null, currentIsEstimate: false, target: null, examDate: null })
  })
})

describe('orbitSkills', () => {
  it('always lists the four skills and flags the one with priority points', () => {
    const skills = orbitSkills(report({
      skills: [
        skillRow('LISTENING', 0.62, { PRIORITY: 2, MAINTAIN: 3 }, 5, 5.5),
        skillRow('READING', 0.8, { MAINTAIN: 4 }, 4),
        skillRow('GRAMMAR', 0.5, {}, 3),
      ],
    }))

    expect(skills.map((skill) => skill.name)).toEqual(['Listening', 'Reading', 'Writing', 'Speaking'])
    expect(skills[0]).toMatchObject({ band: 5.5, badgeText: 'PRIORITY FOCUS', percent: 62 })
    expect(skills[0].details[0]).toEqual({ label: 'Cần ưu tiên', score: '2' })
    expect(skills[1]).toMatchObject({ badgeText: 'ĐANG TỐT', percent: 80 })
    expect(skills[2]).toMatchObject({ band: null, badgeText: 'CHƯA CÓ DỮ LIỆU', percent: 0 })
  })

  it('has no data for any skill before the report loads', () => {
    expect(orbitSkills(null).every((skill) => skill.badgeText === 'CHƯA CÓ DỮ LIỆU')).toBe(true)
  })
})

describe('recommendations', () => {
  it('offers due words, then the weakest skill, then general practice, at most three', () => {
    const items = recommendations(report({
      skills: [
        skillRow('LISTENING', 0.7, { PRIORITY: 1 }, 5),
        skillRow('WRITING', 0.3, { PRIORITY: 4 }, 5),
      ],
    }), notebook(24))

    expect(items.map((item) => item.id)).toEqual(['vocabulary-due', 'weakest-writing', 'practice-tests'])
    expect(items[0]).toMatchObject({ to: '/vocabulary/notebook/review', description: expect.stringContaining('24 từ') })
    expect(items[1]).toMatchObject({ to: '/practice-tests?skill=writing', badgeText: 'Điểm yếu', iconType: 'pen' })
  })

  it('suggests the placement test to a learner without any data', () => {
    const items = recommendations(report(), notebook(0))
    expect(items.map((item) => item.id)).toEqual(['placement', 'practice-tests'])
    expect(items[0].to).toBe('/learn/placement')
  })

  it('skips the word suggestion when nothing is due and falls back to practice while loading', () => {
    expect(recommendations(null, null).map((item) => item.id)).toEqual(['practice-tests'])
  })

  it('without priority points names the skill with the lowest mastery', () => {
    const items = recommendations(report({
      skills: [skillRow('READING', 0.9, { MAINTAIN: 4 }, 4), skillRow('SPEAKING', 0.55, { CONSOLIDATE: 2 }, 3)],
    }), null)
    expect(items[0]).toMatchObject({ id: 'weakest-speaking', badgeText: 'Nên luyện thêm', iconType: 'mic' })
    expect(items[0].description).toContain('55%')
  })
})
