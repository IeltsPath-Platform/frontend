import { Link } from 'react-router-dom'
import type { CSSProperties } from 'react'
import { ArrowRight, Flag, Sparkles } from 'lucide-react'
import type { CourseSummary, TestStatus } from '~types/learningPath'
import { learningApi } from '../api'
import { NoticeBanner } from '../components/NoticeBanner'
import { ApiErrorState, LoadingState } from '../components/PageState'
import { StatusBadge } from '../components/StatusBadge'
import { testStatusMeta } from '../lib/statusMeta'
import { useApiResource } from '../lib/useApiResource'

export function CourseListPage() {
  const courses = useApiResource('courses', () => learningApi.listCourses())
  const sorted = courses.data ? [...courses.data].sort((a, b) => a.bandLevel - b.bandLevel) : null
  const featured = sorted?.find((course) => course.recommended) ?? sorted?.[0] ?? null
  const rest = featured ? sorted?.filter((course) => course.id !== featured.id) ?? [] : []

  return (
    <div className="lp-page">
      <NoticeBanner />
      <header className="lp-catalog-head">
        <div>
          <p className="lp-eyebrow">Catalog khóa học</p>
          <h1>Chọn band để bắt đầu</h1>
          <p>Mỗi khóa là một band mục tiêu. Học theo lộ trình topic → bài học; khóa được gợi ý không khóa các band khác.</p>
        </div>
        {sorted ? (
          <p className="lp-catalog-head__count">
            <strong>{sorted.length}</strong>
            <span>khóa</span>
          </p>
        ) : null}
      </header>
      {courses.status === 'loading' ? <LoadingState label="Đang tải danh sách khóa học…" /> : null}
      {courses.status === 'error' && courses.error ? <ApiErrorState error={courses.error} onRetry={courses.reload} /> : null}
      {courses.data?.length === 0 ? <p className="lp-empty">Chưa có khóa học nào.</p> : null}
      {featured ? (
        <div className="lp-catalog">
          <CourseCard course={featured} featured index={0} />
          {rest.length > 0 ? (
            <ul className="lp-course-grid" aria-label="Các khóa khác">
              {rest.map((course, index) => (
                <CourseCard course={course} index={index + 1} key={course.id} />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function courseCta(course: CourseSummary): string {
  if (course.testStatus === 'PASSED') return 'Xem lại'
  if (course.testStatus === 'AVAILABLE') return 'Thi cuối khóa'
  if (course.passedTopicCount > 0) return 'Tiếp tục'
  return 'Bắt đầu'
}

function CourseCard({
  course,
  index,
  featured = false,
}: {
  course: CourseSummary
  index: number
  featured?: boolean
}) {
  const pct = course.topicCount === 0 ? 0 : Math.round((course.passedTopicCount / course.topicCount) * 100)
  const done = course.testStatus === 'PASSED'
  const ready = course.testStatus === 'AVAILABLE'
  const showTestBadge = course.testStatus !== 'NONE' && course.testStatus !== 'LOCKED'
  const Tag = featured ? 'article' : 'li'

  return (
    <Tag
      className={`lp-course-card${featured ? ' is-featured' : ''}${course.recommended ? ' is-recommended' : ''}${done ? ' is-passed' : ''}${ready ? ' is-ready' : ''}`}
      style={{ '--i': index } as CSSProperties}
    >
      <Link className="lp-course-card__link" to={`/learn/courses/${course.id}`}>
        <div className="lp-course-card__band" aria-hidden="true">
          <span className="lp-course-card__band-label">Band</span>
          <span className="lp-course-card__band-value">{course.bandLevel.toFixed(1)}</span>
        </div>
        <div className="lp-course-card__body">
          <div className="lp-course-card__tags">
            {course.recommended ? (
              <span className="lp-badge lp-tone-accent"><Sparkles aria-hidden="true" size={12} />Gợi ý cho bạn</span>
            ) : null}
            {showTestBadge ? <TestStatusChip status={course.testStatus} /> : null}
          </div>
          <h2>{course.title}</h2>
          <p className="lp-course-card__code">{course.code}</p>
          <div className="lp-course-card__progress">
            <div className="lp-course-card__progress-row">
              <span>{course.passedTopicCount}/{course.topicCount} topic đã qua</span>
              <span>{pct}%</span>
            </div>
            <progress className="lp-progress" max={100} value={pct}>{pct}%</progress>
          </div>
          <span className="lp-course-card__cta">
            {ready ? <Flag aria-hidden="true" size={16} /> : null}
            {courseCta(course)}
            <ArrowRight aria-hidden="true" size={18} />
          </span>
        </div>
      </Link>
    </Tag>
  )
}

function TestStatusChip({ status }: { status: TestStatus }) {
  if (status === 'PASSED') return <span className="lp-badge lp-tone-success">Đã qua thi cuối</span>
  if (status === 'AVAILABLE') return <StatusBadge meta={testStatusMeta('AVAILABLE')} />
  return null
}
