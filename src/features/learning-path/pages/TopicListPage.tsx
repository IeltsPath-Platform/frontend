import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Flag, Loader2, Network, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/toast/toastContext'
import type { CourseSummary } from '~types/learningPath'
import { learningApi, toApiError } from '../api'
import { CourseHero } from '../components/CourseHero'
import { CoursePracticeTests } from '../components/CoursePracticeTests'
import { CourseSkillBoard } from '../components/CourseSkillBoard'
import { LearnTrail } from '../components/LearnTrail'
import { NoticeBanner } from '../components/NoticeBanner'
import { ApiErrorState, TopicListSkeleton } from '../components/PageState'
import { reportApiError } from '../lib/reviewGate'
import { knowledgeTreePath } from '../lib/routes'
import { useApiResource } from '../lib/useApiResource'

/** One course, picked on the course list screen: its four skills and the final test. */
export function TopicListPage() {
  const { courseId = '' } = useParams()
  const topicsResource = useApiResource('topics', () => learningApi.listTopics())
  const coursesResource = useApiResource('courses', () => learningApi.listCourses())
  const topics = topicsResource.data?.filter((topic) => topic.course?.id === courseId) ?? null
  const courseSummary = coursesResource.data?.find((row) => row.id === courseId) ?? null
  const course = courseSummary ?? topics?.[0]?.course ?? null
  const loading = topicsResource.status === 'loading' || coursesResource.status === 'loading'
  const error = topicsResource.error ?? coursesResource.error
  const passed = topics?.filter((topic) => topic.status === 'PASSED').length ?? 0
  const total = topics?.length ?? 0
  // The server counts a practice-test milestone in this order, so the n-th title is the chặng it opens after.
  const topicTitlesInOrder = (topics ?? []).slice().sort((a, b) => a.sequenceOrder - b.sequenceOrder).map((topic) => topic.title)
  const lessonCount = courseSummary?.totalLessons ?? topics?.reduce((sum, topic) => sum + topic.totalLessons, 0) ?? 0

  function reload() {
    topicsResource.reload()
    coursesResource.reload()
  }

  return (
    <div className="lp-page lp-course-page">
      <NoticeBanner />
      <LearnTrail items={[{ label: 'Khóa học', to: '/learn' }, { label: course?.title ?? 'Lộ trình khóa học' }]} />

      <CourseHero
        course={course}
        done={total > 0 && passed === total}
        lessonCount={lessonCount}
      />

      {total > 0 ? (
        <p className="lp-course-tree-link">
          <Button asChild className="lp-btn">
            <Link to={knowledgeTreePath(courseId)}><Network aria-hidden="true" size={16} />Cây kiến thức và luyện tự do</Link>
          </Button>
        </p>
      ) : null}

      {total > 0 ? <CoursePracticeTests courseId={courseId} topicTitles={topicTitlesInOrder} /> : null}

      {loading ? <TopicListSkeleton /> : null}
      {error ? <ApiErrorState error={error} onRetry={reload} /> : null}
      {topics?.length === 0 ? <p className="lp-empty">Khóa này chưa có chặng nào.</p> : null}
      {topics && topics.length > 0 ? (
        <CourseSkillBoard
          course={courseSummary}
          finish={courseSummary && courseSummary.testStatus !== 'NONE' ? (
            <CourseFinalTestStop course={courseSummary} onChanged={reload} />
          ) : null}
          onUnlocked={reload}
          topics={topics}
        />
      ) : null}
    </div>
  )
}

function CourseFinalTestStop({ course, onChanged }: { course: CourseSummary; onChanged: () => void }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [starting, setStarting] = useState(false)
  const inFlight = useRef(false)
  const status = course.testStatus

  async function startTest() {
    if (inFlight.current) return
    inFlight.current = true
    setStarting(true)
    try {
      const assignment = await learningApi.createCourseTestAssignment(course.id)
      const attempt = await learningApi.createAttempt({
        packageVersionId: assignment.packageVersionId,
        attemptType: 'COURSE_TEST',
        mode: 'STANDARD',
        channel: 'WEB',
        expiresAt: null,
      })
      navigate(`/learn/tests/${attempt.id}?course=${course.id}`)
    } catch (reason) {
      const error = toApiError(reason)
      reportApiError(error)
      if (error.code === 'TEST_LOCKED') {
        toast({ title: 'Bài thi cuối khóa chưa mở. Hoàn thành mọi chặng trong khóa trước.', tone: 'error' })
        onChanged()
      } else if (error.code === 'TEST_UNAVAILABLE') {
        toast({ title: 'Chưa có đề thi cuối cho khóa này. Hãy quay lại sau.', tone: 'error' })
      } else {
        toast({ title: `${error.message} Hãy thử lại.`, tone: 'error' })
      }
      inFlight.current = false
      setStarting(false)
    }
  }

  const description = status === 'PASSED'
    ? 'Bạn đã đạt bài thi cuối khóa.'
    : status === 'AVAILABLE'
      ? 'Bạn đã qua mọi chặng. Đề tổng hợp theo band mục tiêu, cần đạt từ 70%.'
      : `Mở khi qua đủ ${course.topicCount} chặng (hiện ${course.passedTopicCount}/${course.topicCount}). Cần đạt từ 70%.`

  return (
    <li className={`lp-stop lp-stop--finish lp-finish--${status.toLowerCase()}`}>
      <span className="lp-stop__node" aria-hidden="true">
        {status === 'PASSED' ? <Trophy size={17} /> : <Flag size={16} />}
      </span>
      <section className="lp-finish" aria-labelledby="lp-course-final-title">
        <div className="lp-finish__head">
          <div className="lp-finish__text">
            <p className="lp-stop__kicker">Về đích</p>
            <h3 id="lp-course-final-title" className="lp-stop__title">Bài thi cuối khóa</h3>
            <p className="lp-finish__meta">{description}</p>
          </div>
          {status === 'AVAILABLE' ? (
            <Button className="lp-btn lp-btn--accent lp-btn--cta" disabled={starting} onClick={startTest} type="button">
              {starting ? <Loader2 aria-hidden="true" className="lp-spin" /> : null}
              {starting ? 'Đang giao đề…' : 'Làm bài thi cuối khóa'}
            </Button>
          ) : status === 'PASSED' ? (
            <span className="lp-chip lp-chip--success">Đã đạt</span>
          ) : null}
        </div>
      </section>
    </li>
  )
}
