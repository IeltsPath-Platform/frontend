import type { CSSProperties } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowRight, Check, RotateCcw, Trophy, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AttemptItemResult, AttemptResult } from '~types/learningPath'
import { learningApi } from '../api'
import { ApiErrorState, LoadingState } from '../components/PageState'
import { useApiResource } from '../lib/useApiResource'

export function TopicTestResultPage() {
  const { attemptId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const topicId = searchParams.get('topic') ?? ''
  const courseId = searchParams.get('course') ?? ''
  const resource = useApiResource(`result:${attemptId}`, async () => {
    const result = await learningApi.getAttemptResult(attemptId)
    const withTopic = topicId && !result.topicId ? { ...result, topicId } : result

    if (courseId && withTopic.passed) {
      let courses = await learningApi.listCourses()
      for (let i = 0; i < 4; i += 1) {
        const current = courses.find((course) => course.id === courseId)
        if (current?.testStatus === 'PASSED') break
        await new Promise((resolve) => setTimeout(resolve, 400))
        courses = await learningApi.listCourses()
      }
      return {
        ...withTopic,
        nextTopicId: null,
        topicStatus: withTopic.topicStatus,
        courseId,
        coursePassed: courses.find((course) => course.id === courseId)?.testStatus === 'PASSED',
      }
    }

    // Poll topics briefly after a pass so PASSED / next IN_PROGRESS settle.
    let topics = await learningApi.listTopics()
    if (withTopic.passed && withTopic.topicId) {
      for (let i = 0; i < 4; i += 1) {
        const current = topics.find((topic) => topic.id === withTopic.topicId)
        if (current?.status === 'PASSED') break
        await new Promise((resolve) => setTimeout(resolve, 400))
        topics = await learningApi.listTopics()
      }
    }
    const nextTopic = topics.find((topic) => topic.status === 'IN_PROGRESS' && topic.id !== withTopic.topicId)
    return {
      ...withTopic,
      nextTopicId: withTopic.passed ? (nextTopic?.id ?? null) : null,
      topicStatus: topics.find((topic) => topic.id === withTopic.topicId)?.status ?? withTopic.topicStatus,
      courseId: courseId || null,
      coursePassed: false,
    }
  })

  if (resource.status === 'loading') return <LoadingState label="Đang chấm bài…" />
  if (resource.status === 'error' && resource.error) return <ApiErrorState error={resource.error} onRetry={resource.reload} />
  if (!resource.data) return null
  return <ResultView result={resource.data} />
}

type ResultViewModel = AttemptResult & {
  courseId?: string | null
  coursePassed?: boolean
}

function ResultView({ result }: { result: ResultViewModel }) {
  const isCourse = Boolean(result.courseId)
  const retryPath = result.topicId
    ? `/learn/topics/${result.topicId}`
    : result.courseId
      ? `/learn/courses/${result.courseId}`
      : '/learn'
  const coursePath = result.courseId ? `/learn/courses/${result.courseId}` : '/learn'

  return (
    <article className="lp-page lp-result-page" aria-labelledby="lp-result-title">
      <header className={`lp-score${result.passed ? ' is-passed' : ''}`}>
        <div className="lp-score__dial" aria-hidden="true" style={{ '--pct': result.percent } as CSSProperties}>
          <span>{result.percent}%</span>
        </div>
        <div className="lp-score__body">
          <p className="lp-eyebrow">Kết quả · mã đề {result.packageCode}</p>
          <h1 id="lp-result-title">
            {result.passed
              ? (isCourse ? 'Đạt thi cuối khóa' : 'Đạt bài kiểm tra cuối')
              : 'Chưa đạt lần này'}
          </h1>
          <p className="lp-score__line"><strong>{result.score}/{result.maxScore}</strong> câu đúng · {result.percent}% · cần từ 70%</p>
          <p>
            {result.passed
              ? isCourse
                ? (result.coursePassed
                  ? 'Khóa đã đánh dấu PASSED (poll GET /courses). Bạn có thể chọn khóa khác hoặc xem lại lộ trình.'
                  : 'Đã đạt điểm. Hệ thống đang cập nhật trạng thái khóa — làm mới danh sách khóa nếu chưa thấy PASSED.')
                : result.nextTopicId
                  ? 'Topic đã qua. Chặng tiếp theo đã mở (làm mới từ GET /topics).'
                  : 'Topic đã qua. Bạn đã hoàn thành toàn bộ lộ trình hiện có trong khóa — mở thi cuối khóa nếu sẵn sàng.'
              : isCourse
                ? 'Đáp án được ẩn khi chưa đạt. Ôn lại các topic rồi làm lại; lần sau bạn sẽ nhận mã đề khác.'
                : 'Đáp án được ẩn khi chưa đạt. Ôn lại các bài trong topic rồi làm lại; lần sau bạn sẽ nhận mã đề khác.'}
          </p>
          <div className="lp-score__actions">
            {result.passed && result.nextTopicId ? (
              <Button asChild className="lp-btn lp-btn--accent">
                <Link to={`/learn/topics/${result.nextTopicId}`}>
                  <Trophy aria-hidden="true" />Sang chặng tiếp theo<ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            ) : null}
            {result.passed && isCourse ? (
              <Button asChild className="lp-btn lp-btn--accent">
                <Link to={coursePath}>
                  <Trophy aria-hidden="true" />Về khóa học<ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            ) : null}
            {result.passed ? (
              <Button asChild className="lp-btn" variant="outline"><Link to="/learn">Xem danh sách khóa</Link></Button>
            ) : (
              <Button asChild className="lp-btn">
                <Link to={retryPath}>
                  <RotateCcw aria-hidden="true" />
                  {isCourse ? 'Về khóa để làm lại' : 'Về topic để làm lại'}
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <section aria-labelledby="lp-result-items">
        <h2 className="lp-section-title" id="lp-result-items">Từng câu</h2>
        <ol className="lp-result-items">
          {[...result.items].sort((a, b) => a.number - b.number).map((item) => <ResultItem item={item} key={item.itemId} />)}
        </ol>
      </section>
    </article>
  )
}

function ResultItem({ item }: { item: AttemptItemResult }) {
  return (
    <li className={`lp-result-item${item.correct ? ' is-correct' : ' is-wrong'}`}>
      <span aria-hidden="true">{item.correct ? <Check size={16} /> : <X size={16} />}</span>
      <div>
        <p><strong>Câu {item.number}</strong>{item.prompt ? ` · ${item.prompt}` : ''}</p>
        {item.correctAnswer ? <p>Đáp án: {item.correctAnswer}</p> : null}
        {item.explanation ? <p>{item.explanation}</p> : null}
      </div>
    </li>
  )
}
