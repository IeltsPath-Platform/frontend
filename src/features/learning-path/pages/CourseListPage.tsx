import { Link } from 'react-router-dom'
import type { CSSProperties } from 'react'
import { ArrowRight } from 'lucide-react'
import type { CourseSummary } from '~types/learningPath'
import { learningApi } from '../api'
import { NoticeBanner } from '../components/NoticeBanner'
import { ApiErrorState, LoadingState } from '../components/PageState'
import { useApiResource } from '../lib/useApiResource'

export function CourseListPage() {
  const courses = useApiResource('courses', () => learningApi.listCourses())

  return (
    <div className="lp-page">
      <NoticeBanner />
      <header className="lp-hero">
        <p className="lp-eyebrow">Lộ trình IELTS</p>
        <h1>Chọn course để bắt đầu học</h1>
        <p>Mỗi course gồm các topic theo band mục tiêu. Course được gợi ý dựa trên bài xếp lớp, nhưng bạn có thể chọn bất kỳ course nào.</p>
      </header>
      {courses.status === 'loading' ? <LoadingState label="Đang tải danh sách course…" /> : null}
      {courses.status === 'error' && courses.error ? <ApiErrorState error={courses.error} onRetry={courses.reload} /> : null}
      {courses.data?.length === 0 ? <p className="lp-empty">Chưa có course nào.</p> : null}
      {courses.data && courses.data.length > 0 ? (
        <ol className="lp-trail" aria-label="Các course">
          {[...courses.data].sort((a, b) => a.bandLevel - b.bandLevel).map((course, index) => (
            <CourseCard course={course} index={index} key={course.id} />
          ))}
        </ol>
      ) : null}
    </div>
  )
}

function CourseCard({ course, index }: { course: CourseSummary; index: number }) {
  return (
    <li className="lp-station lp-station--in_progress" style={{ '--i': index } as CSSProperties}>
      <Link className="lp-station__card" to={`/learn/courses/${course.id}`}>
        <div className="lp-station__top">
          <span className="lp-station__code">Band {course.bandLevel.toFixed(1)}</span>
          {course.recommended ? <span className="lp-badge lp-tone-accent">Gợi ý cho bạn</span> : null}
          {course.testStatus === 'PASSED' ? <span className="lp-badge lp-tone-success">Đã qua bài thi cuối</span> : null}
        </div>
        <h2>{course.title}</h2>
        <div className="lp-station__foot">
          <span>{course.passedTopicCount}/{course.topicCount} topic đã qua</span>
          <ArrowRight aria-hidden="true" size={18} />
        </div>
      </Link>
    </li>
  )
}
