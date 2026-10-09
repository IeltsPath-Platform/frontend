import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, ArrowRight, Dumbbell, Loader2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type {
  AnswerInput,
  ExerciseBlockData,
  LessonPracticeSets,
  PracticeAttemptView,
  PracticeSetItem,
  PracticeSubmissionResult,
} from '~types/learningPath'
import { learningApi, toApiError } from '../api'
import { AudioBlock } from '../components/blocks/AudioBlock'
import { ExerciseBlock } from '../components/blocks/ExerciseBlock'
import { PassageBlock } from '../components/blocks/PassageBlock'
import { ApiErrorState, LoadingState } from '../components/PageState'
import { StatusBadge } from '../components/StatusBadge'
import { newRequestId } from '../lib/requestId'
import { reportApiError, setPendingReviews } from '../lib/reviewGate'
import { useApiResource } from '../lib/useApiResource'

const ITEM_META: Record<string, { label: string; tone: 'success' | 'primary' | 'accent' | 'locked'; icon: typeof Dumbbell }> = {
  AVAILABLE: { label: 'Sẵn sàng', tone: 'primary', icon: Dumbbell },
  IN_PROGRESS: { label: 'Đang làm', tone: 'accent', icon: Dumbbell },
  PASSED: { label: 'Đã đạt', tone: 'success', icon: Dumbbell },
  ATTEMPTED: { label: 'Đã thử', tone: 'locked', icon: Dumbbell },
  LOCKED: { label: 'Chưa mở', tone: 'locked', icon: Lock },
}

const PRACTICE_STATUS_TEXT: Record<string, string> = {
  REQUIRED: 'Bắt buộc: đạt ít nhất một bộ để mở bài kiểm tra chặng',
  PASSED: 'Đã đạt phần luyện thêm',
  LOCKED: 'Chưa mở',
}

export function PracticePage() {
  const { lessonId = '' } = useParams()
  const resource = useApiResource(`practice:${lessonId}`, () => learningApi.getLessonPracticeSets(lessonId))

  if (resource.status === 'loading') return <LoadingState label="Đang tải luyện thêm…" />
  if (resource.status === 'error' && resource.error) return <ApiErrorState error={resource.error} onRetry={resource.reload} />
  if (!resource.data) return null
  return <PracticeView catalog={resource.data} onReload={resource.reload} />
}

function PracticeView({ catalog, onReload }: { catalog: LessonPracticeSets; onReload: () => void }) {
  const [active, setActive] = useState<{ item: PracticeSetItem; attempt: PracticeAttemptView } | null>(null)
  const [startingId, setStartingId] = useState<string | null>(null)
  const [submission, setSubmission] = useState<PracticeSubmissionResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function startSet(item: PracticeSetItem) {
    if (item.status === 'LOCKED' || item.accessLevel === 'PREMIUM') return
    setStartingId(item.packageId)
    setError(null)
    setSubmission(null)
    try {
      const attempt = await learningApi.startPracticeAttempt(catalog.lessonId, item.packageId)
      setActive({ item, attempt })
    } catch (reason) {
      const apiError = toApiError(reason)
      reportApiError(apiError)
      setError(apiError.message)
    } finally {
      setStartingId(null)
    }
  }

  async function submit(answers: AnswerInput[]) {
    if (!active) throw new Error('Chưa có attempt')
    try {
      const outcome = await learningApi.submitPracticeAttempt(active.attempt.attemptId, {
        requestId: newRequestId(),
        answers,
      })
      setSubmission(outcome)
      if (outcome.reviewsCreated.length > 0) {
        setPendingReviews(outcome.reviewsCreated.map((review) => ({
          reviewId: review.reviewId,
          knowledgePointCode: review.knowledgePointId.slice(0, 8),
          knowledgePointTitle: 'Bài ôn từ luyện thêm',
        })))
      }
      return {
        passed: outcome.passed,
        percent: Math.round(outcome.percent * (outcome.percent <= 1 ? 100 : 1)),
        correctCount: outcome.correct,
        totalCount: outcome.total,
        results: outcome.results,
      }
    } catch (reason) {
      const apiError = toApiError(reason)
      reportApiError(apiError)
      throw apiError
    }
  }

  if (active) {
    const percentDisplay = submission
      ? Math.round(submission.percent * (submission.percent <= 1 ? 100 : 1))
      : null
    return (
      <article className="lp-page" aria-labelledby="lp-practice-attempt-title">
        <button className="lp-back" type="button" onClick={() => { setActive(null); setSubmission(null); onReload() }}>
          <ArrowLeft aria-hidden="true" size={16} />Danh sách luyện thêm
        </button>
        <header className="lp-lesson-head">
          <p className="lp-eyebrow">Luyện thêm · {active.item.code}</p>
          <h1 id="lp-practice-attempt-title">{active.item.title}</h1>
          {active.item.revealed ? (
            <p className="lp-hint lp-hint--warn" role="status">
              <AlertTriangle aria-hidden="true" size={16} /> Bộ này đã lộ đáp án trước đó nên lần nộp này không được tính.
            </p>
          ) : null}
        </header>
        <section className="lp-split" aria-label="Bài luyện thêm">
          <div className="lp-split__passage">
            {active.attempt.audio?.mediaUrl ? <AudioBlock audio={active.attempt.audio} title="Audio luyện" /> : null}
            {active.attempt.passage && (active.attempt.passage.paragraphs.length > 0 || active.attempt.passage.title)
              ? <PassageBlock passage={active.attempt.passage} />
              : null}
          </div>
          <div className="lp-split__work">
            <ExerciseBlock
              allowResubmit={false}
              block={toExerciseBlock(active)}
              failedFooter={submission && !submission.passed ? (
                <div className="lp-review-retry">
                  <p>Chưa đạt ({percentDisplay}%). Có thể chọn bộ khác hoặc làm bài ôn nếu được tạo.</p>
                  <Button className="lp-btn" onClick={() => { setActive(null); setSubmission(null); onReload() }} type="button">
                    Về danh sách
                  </Button>
                </div>
              ) : null}
              onSubmit={submit}
            />
            {submission?.reviewsCreated[0] ? (
              <div className="lp-done lp-done--review" role="status">
                <p>Đã tạo bài ôn bắt buộc sau lần luyện này.</p>
                <Button asChild className="lp-btn lp-btn--accent lp-btn--cta">
                  <Link to={`/learn/reviews/${submission.reviewsCreated[0].reviewId}`}>
                    Làm bài ôn<ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            ) : null}
            {submission?.passed ? (
              <div className="lp-done" role="status">
                <p>Đã đạt bộ luyện thêm ({percentDisplay}%).</p>
                <Button className="lp-btn lp-btn--cta" onClick={() => { setActive(null); setSubmission(null); onReload() }} type="button">
                  Tiếp tục luyện / về topic
                </Button>
              </div>
            ) : null}
          </div>
        </section>
      </article>
    )
  }

  const openItems = catalog.items.filter((item) => item.accessLevel !== 'PREMIUM')
  const primaryId = (openItems.find((item) => item.status === 'IN_PROGRESS')
    ?? openItems.find((item) => item.status === 'AVAILABLE' || item.status === 'ATTEMPTED'))?.packageId

  return (
    <article className="lp-page" aria-labelledby="lp-practice-title">
      <Link className="lp-back" to={`/learn/lessons/${catalog.lessonId}`}>
        <ArrowLeft aria-hidden="true" size={16} />Về bài học
      </Link>
      <header className="lp-lesson-head">
        <p className="lp-eyebrow">Luyện thêm</p>
        <h1 id="lp-practice-title">Củng cố trước khi mở bài kiểm tra chặng</h1>
        <p className="lp-lesson-head__lead">
          {PRACTICE_STATUS_TEXT[catalog.practiceStatus] ?? catalog.practiceStatus}
          {catalog.practicePassReason ? ` · ${catalog.practicePassReason}` : ''}
          {!catalog.lessonCompleted ? ' · Hoàn thành bài học trước khi luyện.' : ''}
        </p>
      </header>
      {error ? <p className="lp-error" role="alert">{error}</p> : null}
      {catalog.items.length === 0 ? (
        <p className="lp-empty">Bài này không có bộ luyện thêm.</p>
      ) : (
        <ul className="lp-practice-list" aria-label="Các bộ luyện thêm">
          {catalog.items.map((item) => {
            const meta = ITEM_META[item.status] ?? ITEM_META.LOCKED
            const premium = item.accessLevel === 'PREMIUM'
            const canStart = !premium && (item.status === 'AVAILABLE' || item.status === 'IN_PROGRESS' || item.status === 'ATTEMPTED' || item.status === 'PASSED')
            const disabled = !canStart || startingId === item.packageId
            const label = premium
              ? 'Premium'
              : item.status === 'LOCKED'
                ? 'Khóa'
                : item.status === 'PASSED'
                  ? 'Làm lại'
                  : startingId === item.packageId
                    ? 'Đang mở…'
                    : item.status === 'IN_PROGRESS'
                      ? 'Làm tiếp'
                      : 'Làm bộ này'
            return (
              <li className={`lp-practice-card${premium ? ' is-premium' : ''}`} key={item.packageId}>
                <div className="lp-practice-card__body">
                  <h2>{item.title}</h2>
                  <p>{item.questionCount} câu{item.bestPercent != null ? ` · điểm cao nhất ${Math.round(item.bestPercent * (item.bestPercent <= 1 ? 100 : 1))}%` : ''}</p>
                  {item.revealed ? <p className="lp-hint lp-hint--warn">Đã lộ đáp án nên không được tính.</p> : null}
                  {premium ? <p className="lp-hint">Bộ Premium, chưa mở trong giai đoạn này.</p> : null}
                </div>
                <div className="lp-practice-card__aside">
                  <StatusBadge meta={meta} />
                  {item.status === 'LOCKED' && !premium ? null : <Button
                    className={`lp-btn ${item.packageId === primaryId ? 'lp-btn--accent' : 'lp-btn--quiet'}`}
                    disabled={disabled}
                    type="button"
                    variant={item.packageId === primaryId ? 'default' : 'outline'}
                    onClick={() => void startSet(item)}
                  >
                    {startingId === item.packageId ? <Loader2 aria-hidden="true" className="lp-spin" /> : null}
                    {label}
                  </Button>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {catalog.practiceStatus === 'PASSED' ? (
        <div className="lp-done" role="status">
          <p>Bạn đã đạt phần luyện thêm. Quay lại chặng để làm bài kiểm tra (nếu không còn bài ôn).</p>
          <Button asChild className="lp-btn lp-btn--quiet" variant="outline"><Link to="/learn">Về lộ trình</Link></Button>
        </div>
      ) : null}
    </article>
  )
}

function toExerciseBlock(active: { item: PracticeSetItem; attempt: PracticeAttemptView }): ExerciseBlockData {
  return {
    id: active.attempt.attemptId,
    sortOrder: 1,
    type: 'EXERCISE',
    title: active.item.title,
    instructions: 'Trả lời hết câu. Đạt mới được tính evidence cho practice của bài.',
    knowledgePointCode: active.item.code,
    questions: active.attempt.questions,
    state: 'NOT_ATTEMPTED',
    savedAnswers: null,
    solutions: null,
  }
}
