import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { LearnerReportSummary } from '../api/overviewApi'
import { courseSkillMastery } from '../overviewDashboardModel'
import type { HeroCourse } from '../overviewViewModel'
import type { StatisticsResource } from '../hooks/useStatisticsResource'
import { OverviewBlockStatus } from './OverviewBlockStatus'

type SourceState = Pick<StatisticsResource<unknown>, 'loading' | 'error' | 'reload'>

interface OverviewSkillsAndCoursesProps {
  report: LearnerReportSummary | null
  courses: HeroCourse[]
  reportSource: SourceState
  courseSource: SourceState
}

const SKILL_LABEL = { LISTENING: 'Listening', READING: 'Reading', WRITING: 'Writing', SPEAKING: 'Speaking' }

const percentOf = (course: HeroCourse) =>
  Math.min(100, Math.max(0, course.percent ?? (course.totalLessons > 0 ? Math.round((course.completedLessons / course.totalLessons) * 100) : 0)))

/** The lowest value, when at least two skills have one and they are not all equal; null otherwise. */
function weakestSkill<T extends string>(rows: { skill: T; value: number | null }[]): T | null {
  const scored = rows.filter((row): row is { skill: T; value: number } => row.value !== null)
  if (scored.length < 2) return null
  const lowest = Math.min(...scored.map((row) => row.value))
  const highest = Math.max(...scored.map((row) => row.value))
  return lowest === highest ? null : scored.find((row) => row.value === lowest)?.skill ?? null
}

/** Mastery of each skill inside one chosen course, and every course the learner has started. */
export function OverviewSkillsAndCourses({ report, courses, reportSource, courseSource }: OverviewSkillsAndCoursesProps) {
  const [choice, setChoice] = useState<string | null>(null)
  const hasCoursePoints = courses.length > 0 && (report?.knowledgePoints?.length ?? 0) > 0
  const skillsLoading = !hasCoursePoints && reportSource.loading
  const showSkills = hasCoursePoints || skillsLoading || !!reportSource.error
  const showCourses = courses.length > 0 || courseSource.loading || !!courseSource.error
  if (!showSkills && !showCourses) return null

  // Before the learner picks, the most recently studied course is shown.
  const selected = hasCoursePoints ? courses.find((course) => course.id === choice) ?? courses[0] : null
  const courseRows = selected ? courseSkillMastery(report, selected.bandLevel) : []
  const rows = courseRows.map((row) => ({ skill: row.skill, value: row.mastery === null ? null : row.mastery * 100, text: row.mastery === null ? '—' : `${Math.round(row.mastery * 100)}%`, width: row.mastery === null ? 0 : row.mastery * 100 }))
  const weakest = weakestSkill(rows)
  const courseHasData = courseRows.some((row) => row.points > 0)

  return (
    <div className="overview-focus-grid">
      {showSkills && (
        <section className="overview-focus-card" aria-labelledby="overview-skills-title">
          <header className="overview-focus-heading">
            <h2 id="overview-skills-title">Kỹ năng theo khóa</h2>
            {selected !== null && selected.bandLevel !== null && <p>Khóa band <strong>{selected.bandLevel.toFixed(1)}</strong></p>}
          </header>
          {hasCoursePoints && (
            <div className="overview-skill-picker" role="group" aria-label="Chọn khóa học">
              {courses.map((course) => (
                <button key={course.id} type="button" aria-pressed={selected?.id === course.id} onClick={() => setChoice(course.id)}>{course.name}</button>
              ))}
            </div>
          )}
          <OverviewBlockStatus loading={skillsLoading} error={reportSource.error} onRetry={reportSource.reload} />
          {courseHasData && (
            <ul className="overview-skill-list">
              {rows.map((row) => (
                <li key={row.skill} className={`overview-skill-row${row.skill === weakest ? ' is-weakest' : ''}`}>
                  <span className="overview-skill-name">{SKILL_LABEL[row.skill]}{row.skill === weakest && <em>Cần ưu tiên</em>}</span>
                  <span className="overview-skill-track" aria-hidden="true"><span className="overview-skill-fill" style={{ width: `${row.width}%` }} /></span>
                  <strong className="overview-skill-band">{row.text}</strong>
                </li>
              ))}
            </ul>
          )}
          {selected !== null && !courseHasData && <p className="overview-skill-empty">Chưa có kỹ năng nào được đánh giá trong khóa này.</p>}
        </section>
      )}
      {showCourses && (
        <section className="overview-focus-card" aria-labelledby="overview-courses-title">
          <header className="overview-focus-heading"><h2 id="overview-courses-title">Các khóa đang học</h2></header>
          <OverviewBlockStatus loading={courseSource.loading && courses.length === 0} error={courseSource.error} onRetry={courseSource.reload} />
          {courses.length > 0 && (
            <ul className="overview-course-list">
              {courses.map((course) => {
                const percent = percentOf(course)
                return (
                  <li key={course.id}>
                    <Link to={`/learn/courses/${course.id}`} className="overview-course-row" aria-label={`${course.name}: hoàn thành ${course.completedLessons}/${course.totalLessons} bài`}>
                      <span className="overview-course-top"><strong>{course.name}</strong><span>{course.completedLessons}/{course.totalLessons} bài</span><ChevronRight size={16} aria-hidden="true" /></span>
                      <span className="overview-course-track" aria-hidden="true"><span style={{ width: `${percent}%` }} /></span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
