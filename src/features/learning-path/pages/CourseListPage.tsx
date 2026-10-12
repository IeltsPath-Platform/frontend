import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CSSProperties } from 'react'
import { ArrowRight, GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import mascotImage from '@/assets/triceratops-class-mascot.png'
import type { CourseSummary } from '~types/learningPath'
import { learningApi } from '../api'
import { NoticeBanner } from '../components/NoticeBanner'
import { ApiErrorState, CourseCatalogSkeleton, EmptyState } from '../components/PageState'
import { useApiResource } from '../lib/useApiResource'

type CourseFilter = 'ALL' | 'RECOMMENDED' | 'IN_PROGRESS' | 'PASSED'

const FILTERS: Array<{ key: CourseFilter; label: string; match: (course: CourseSummary) => boolean }> = [
  { key: 'ALL', label: 'Tất cả', match: () => true },
  { key: 'RECOMMENDED', label: 'Gợi ý cho bạn', match: (course) => course.recommended },
  { key: 'IN_PROGRESS', label: 'Đang học', match: isInProgress },
  { key: 'PASSED', label: 'Đã hoàn thành', match: (course) => course.testStatus === 'PASSED' },
]

export function CourseListPage() {
  const courses = useApiResource('courses', () => learningApi.listCourses())
  const [filter, setFilter] = useState<CourseFilter>('ALL')

  const sorted = useMemo(
    () => (courses.data ? [...courses.data].sort((a, b) => a.bandLevel - b.bandLevel) : null),
    [courses.data],
  )
  const activeCourse = sorted?.find(isInProgress) ?? null
  const spotlight = activeCourse ?? sorted?.find((course) => course.recommended) ?? sorted?.[0] ?? null

  const tabs = FILTERS
    .map((tab) => ({ ...tab, count: sorted?.filter(tab.match).length ?? 0 }))
    .filter((tab) => tab.key === 'ALL' || tab.count > 0)
  const activeTab = FILTERS.find((tab) => tab.key === filter) ?? FILTERS[0]
  const visible = sorted?.filter(activeTab.match) ?? []

  return (
    <div className="lp-page lp-catalog">
      <NoticeBanner />

      <header className="lp-pagehead">
        <p className="lp-eyebrow">Khóa học</p>
        <h1>Lộ trình IELTS theo band mục tiêu</h1>
        <p className="lp-pagehead__lead">
          Mỗi khóa gồm các chặng topic ngắn. Học xong các bài trong chặng và đạt bài kiểm tra chặng để mở chặng kế tiếp.
        </p>
      </header>

      {spotlight ? <CourseSpotlight course={spotlight} resuming={spotlight === activeCourse} /> : null}

      <section className="lp-section" aria-labelledby="lp-courses-title">
        <div className="lp-section__head">
          <h2 id="lp-courses-title">Tất cả khóa học</h2>
          {tabs.length > 1 ? (
            <div className="lp-segment" role="group" aria-label="Lọc khóa học">
              {tabs.map((tab) => (
                <button
                  aria-pressed={filter === tab.key}
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  type="button"
                >
                  {tab.label}
                  <span className="lp-segment__count">{tab.count}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {courses.status === 'loading' ? <CourseCatalogSkeleton /> : null}
        {courses.status === 'error' && courses.error ? <ApiErrorState error={courses.error} onRetry={courses.reload} /> : null}

        {courses.status === 'success' && visible.length === 0 ? (
          <EmptyState
            actionLabel="Xem tất cả khóa học"
            description="Không có khóa học nào trong nhóm này."
            onAction={() => setFilter('ALL')}
            title="Không tìm thấy khóa học"
          />
        ) : null}

        {courses.status === 'success' && visible.length > 0 ? (
          <ul className="lp-course-grid" aria-label="Danh sách khóa học">
            {visible.map((course, index) => (
              <CourseCard course={course} index={index} key={course.id} />
            ))}
            {filter === 'ALL' ? <PlacementCard index={visible.length} /> : null}
          </ul>
        ) : null}
      </section>
    </div>
  )
}

function isInProgress(course: CourseSummary) {
  return course.passedTopicCount > 0 && course.testStatus !== 'PASSED'
}

function entryBand(course: CourseSummary) {
  return Math.max(course.bandLevel - 1, 3.5).toFixed(1)
}

function courseCta(course: CourseSummary): string {
  if (course.testStatus === 'PASSED') return 'Xem lại lộ trình'
  if (course.testStatus === 'AVAILABLE') return 'Làm bài thi cuối khóa'
  if (course.passedTopicCount > 0) return 'Học tiếp'
  return 'Bắt đầu học'
}

function courseChip(course: CourseSummary): { label: string; tone: 'success' | 'primary' | 'accent' } | null {
  if (course.testStatus === 'PASSED') return { label: 'Đã hoàn thành', tone: 'success' }
  if (course.testStatus === 'AVAILABLE') return { label: 'Sẵn sàng thi cuối', tone: 'accent' }
  if (isInProgress(course)) return { label: 'Đang học', tone: 'primary' }
  if (course.recommended) return { label: 'Gợi ý cho bạn', tone: 'accent' }
  return null
}

function CourseSpotlight({ course, resuming }: { course: CourseSummary; resuming: boolean }) {
  const pct = course.topicCount === 0 ? 0 : Math.round((course.passedTopicCount / course.topicCount) * 100)
  const label = resuming ? 'Đang học dở' : course.recommended ? 'Gợi ý cho bạn' : 'Gợi ý bắt đầu'

  return (
    <section className="lp-spotlight" aria-labelledby="lp-spotlight-title">
      <div className="lp-band-ticket" aria-hidden="true">
        <span>Band</span>
        <strong>{course.bandLevel.toFixed(1)}</strong>
      </div>

      <div className="lp-spotlight__body">
        <p className="lp-spotlight__label">{label}</p>
        <h2 id="lp-spotlight-title">{course.title}</h2>
        <p className="lp-spotlight__meta">
          {course.topicCount} chặng topic · đầu vào khuyến nghị ~{entryBand(course)} · kết thúc bằng bài thi cuối khóa
        </p>
        {course.passedTopicCount > 0 ? (
          <div className="lp-meter lp-spotlight__meter">
            <progress className="lp-progress" max={100} value={pct}>{pct}%</progress>
            <span className="lp-meter__value">{course.passedTopicCount}/{course.topicCount} chặng</span>
          </div>
        ) : null}
        <Button asChild className="lp-btn lp-btn--accent lp-btn--cta lp-spotlight__cta">
          <Link to={`/learn/courses/${course.id}`}>
            {courseCta(course)}
            <ArrowRight aria-hidden="true" size={18} />
          </Link>
        </Button>
      </div>

      <img alt="" aria-hidden="true" className="lp-spotlight__mascot" src={mascotImage} />
    </section>
  )
}

function CourseCard({ course, index }: { course: CourseSummary; index: number }) {
  const pct = course.topicCount === 0 ? 0 : Math.round((course.passedTopicCount / course.topicCount) * 100)
  const chip = courseChip(course)

  return (
    <li className="lp-ccard" style={{ '--i': index } as CSSProperties}>
      <Link className="lp-ccard__link" to={`/learn/courses/${course.id}`}>
        <div className="lp-ccard__top">
          <span className="lp-ccard__band">
            <small>Band</small>
            {course.bandLevel.toFixed(1)}
          </span>
          {chip ? <span className={`lp-chip lp-chip--${chip.tone}`}>{chip.label}</span> : null}
        </div>
        <h3 className="lp-ccard__title">{course.title}</h3>
        <p className="lp-ccard__meta">{course.topicCount} chặng topic · đầu vào ~{entryBand(course)}</p>
        <div className="lp-ccard__progress">
          {course.passedTopicCount > 0 ? (
            <>
              <progress className="lp-progress" max={100} value={pct}>{pct}%</progress>
              <span>{course.passedTopicCount}/{course.topicCount} chặng</span>
            </>
          ) : (
            <span className="lp-ccard__fresh">Chưa bắt đầu</span>
          )}
        </div>
        <span className="lp-ccard__cta">
          {courseCta(course)}
          <ArrowRight aria-hidden="true" size={16} />
        </span>
      </Link>
    </li>
  )
}

function PlacementCard({ index }: { index: number }) {
  return (
    <li className="lp-ccard lp-ccard--placement" style={{ '--i': index } as CSSProperties}>
      <Link className="lp-ccard__link" to="/placement">
        <span className="lp-ccard__icon" aria-hidden="true">
          <GraduationCap size={22} />
        </span>
        <h3 className="lp-ccard__title">Chưa biết nên chọn band nào?</h3>
        <p className="lp-ccard__meta">
          Làm bài test đầu vào 4 kỹ năng miễn phí trong 15–20 phút để được gợi ý khóa phù hợp.
        </p>
        <span className="lp-ccard__cta">
          Làm test đầu vào
          <ArrowRight aria-hidden="true" size={16} />
        </span>
      </Link>
    </li>
  )
}
