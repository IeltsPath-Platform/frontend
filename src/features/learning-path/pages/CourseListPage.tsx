import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CSSProperties } from 'react'
import { ArrowRight, Gauge, Route } from 'lucide-react'
import { Button } from '@/components/ui/button'
import mascotImage from '@/assets/triceratops-class-mascot.png'
import type { CourseSummary } from '~types/learningPath'
import { learningApi } from '../api'
import { NoticeBanner } from '../components/NoticeBanner'
import { CourseArt } from '../components/CourseArt'
import { SegmentMeter } from '../components/SegmentMeter'
import { ApiErrorState, CourseCatalogSkeleton, EmptyState } from '../components/PageState'
import { entryBand } from '../lib/courseMeta'
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
  // The hero only suggests a course when there is a reason to: an unfinished course,
  // or a placement-based recommendation. Otherwise it asks the learner to take the placement test.
  const activeCourse = sorted?.find(isInProgress) ?? null
  const recommendedCourse = sorted?.find((course) => course.recommended) ?? null
  const focusCourse = activeCourse ?? recommendedCourse

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
      </header>

      {courses.status === 'success' ? (
        focusCourse ? (
          <CourseSpotlight course={focusCourse} resuming={focusCourse === activeCourse} />
        ) : (
          <PlacementSpotlight />
        )
      ) : null}

      <section className="lp-section" aria-labelledby="lp-courses-title">
        <h2 className="lp-sr-only" id="lp-courses-title">Danh sách khóa học</h2>
        {tabs.length > 1 ? (
          <div className="lp-section__head lp-section__head--end">
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
          </div>
        ) : null}

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
          <ul className="lp-tiles" aria-label="Danh sách khóa học theo band">
            {visible.map((course, index) => (
              <CourseTile
                course={course}
                focused={course.id === focusCourse?.id}
                index={index}
                key={course.id}
              />
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  )
}

function isInProgress(course: CourseSummary) {
  return course.passedTopicCount > 0 && course.testStatus !== 'PASSED'
}

function progressPct(course: CourseSummary) {
  return course.topicCount === 0 ? 0 : Math.round((course.passedTopicCount / course.topicCount) * 100)
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
  const pct = progressPct(course)

  return (
    <section className="lp-spotlight" aria-labelledby="lp-spotlight-title">
      <div className="lp-band-ticket" aria-hidden="true">
        <span>Band</span>
        <strong>{course.bandLevel.toFixed(1)}</strong>
      </div>

      <div className="lp-spotlight__body">
        <p className="lp-spotlight__label">{resuming ? 'Đang học dở' : 'Gợi ý từ bài test đầu vào'}</p>
        <h2 id="lp-spotlight-title">{course.title}</h2>
        <p className="lp-spotlight__meta">
          {course.topicCount} chặng topic · đầu vào khuyến nghị ~{entryBand(course.bandLevel)} · kết thúc bằng bài thi cuối khóa
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

function PlacementSpotlight() {
  return (
    <section className="lp-spotlight lp-spotlight--placement" aria-labelledby="lp-spotlight-title">
      <div className="lp-band-ticket lp-band-ticket--unknown" aria-hidden="true">
        <span>Band</span>
        <strong>?</strong>
      </div>

      <div className="lp-spotlight__body">
        <p className="lp-spotlight__label">Chưa biết bắt đầu từ đâu</p>
        <h2 id="lp-spotlight-title">Làm test đầu vào để biết band hiện tại</h2>
        <p className="lp-spotlight__meta">
          Bài test 4 kỹ năng miễn phí, khoảng 15–20 phút. Xong bài, hệ thống gợi ý khóa vừa sức với bạn.
        </p>
      </div>

      <Button asChild className="lp-btn lp-btn--accent lp-btn--cta lp-spotlight__action">
        <Link to="/learn/placement">
          Làm test đầu vào
          <ArrowRight aria-hidden="true" size={18} />
        </Link>
      </Button>
    </section>
  )
}

function CourseTile({ course, focused, index }: { course: CourseSummary; focused: boolean; index: number }) {
  const chip = courseChip(course)
  const passed = course.testStatus === 'PASSED'
  const started = course.passedTopicCount > 0

  return (
    <li
      className={`lp-tile${focused ? ' is-focused' : ''}${passed ? ' is-passed' : ''}`}
      style={{ '--i': index } as CSSProperties}
    >
      <Link className="lp-tile__link" to={`/learn/courses/${course.id}`}>
        <div className="lp-tile__art">
          <CourseArt band={course.bandLevel} />
          <span className="lp-tile__band">
            <small>Band</small>
            {course.bandLevel.toFixed(1)}
          </span>
          {chip ? <span className={`lp-chip lp-chip--${chip.tone} lp-tile__chip`}>{chip.label}</span> : null}
        </div>

        <div className="lp-tile__body">
          <h3 className="lp-tile__title">{course.title}</h3>
          <ul className="lp-tile__facts" aria-label="Thông tin khóa học">
            <li>
              <Route aria-hidden="true" size={14} />
              {course.topicCount} chặng topic
            </li>
            <li>
              <Gauge aria-hidden="true" size={14} />
              Đầu vào ~{entryBand(course.bandLevel)}
            </li>
          </ul>

          <div className="lp-tile__progress">
            <SegmentMeter done={course.passedTopicCount} total={course.topicCount} unit="chặng" />
            <span className="lp-tile__count">
              {started ? `${course.passedTopicCount}/${course.topicCount} chặng` : 'Chưa bắt đầu'}
            </span>
          </div>

          <span className="lp-tile__cta">
            {courseCta(course)}
            <span className="lp-tile__go" aria-hidden="true">
              <ArrowRight size={15} />
            </span>
          </span>
        </div>
      </Link>
    </li>
  )
}
