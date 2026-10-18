import { StudyActivityTracker } from '@/features/study-time/StudyActivityTracker'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ArrowRight, BookOpenCheck, Loader2, RefreshCw, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LearnTrail, type TrailItem } from '../components/LearnTrail'
import { courseTopicPath, topicPagePath, type ReviewNavigationState, type ReviewOrigin } from '../lib/routes'
import { lessonPracticePath } from '../lib/lessonPractice'
import type {
  AnswerInput,
  ExerciseBlockData,
  Question,
  ReviewDetail,
  ReviewSet,
  ReviewSubmissionResult,
} from '~types/learningPath'
import { learningApi, toApiError } from '../api'
import { AudioBlock } from '../components/blocks/AudioBlock'
import { ExerciseBlock } from '../components/blocks/ExerciseBlock'
import { RewardSummary } from '../components/RewardSummary'
import { PassageBlock } from '../components/blocks/PassageBlock'
import { ApiErrorState, LoadingState } from '../components/PageState'
import { LessonSummary } from '../components/resources/LessonSummary'
import { newRequestId } from '../lib/requestId'
import { reportApiError, resolvePendingReview } from '../lib/reviewGate'
import { useApiResource } from '../lib/useApiResource'

export function ReviewPage() {
  const location = useLocation()
  const savedOrigin = (location.state as ReviewNavigationState | null)?.reviewOrigin
  const missingCourseTopicId = savedOrigin && !savedOrigin.course ? savedOrigin.topicId : null
  const originCourse = useApiResource(`review-course:${missingCourseTopicId ?? ''}`, async () => {
    if (!missingCourseTopicId) return null
    return (await learningApi.listTopics()).find((topic) => topic.id === missingCourseTopicId)?.course ?? null
  })
  const reviewOrigin = savedOrigin && originCourse.data
    ? { ...savedOrigin, course: savedOrigin.course ?? originCourse.data }
    : savedOrigin
  const { reviewId = '' } = useParams()
  const resource = useApiResource(`review:${reviewId}`, () => learningApi.getReview(reviewId))

  if (resource.status === 'loading') return <LoadingState label="Đang tải bài ôn…" />
  if (resource.status === 'error' && resource.error) return <ApiErrorState error={resource.error} onRetry={resource.reload} />
  if (!resource.data) return null
  const review = resource.data
  return (
    <ReviewView
      key={`${review.reviewId}:${review.stage}:${review.set?.setId ?? 'theory'}:${review.status}`}
      onAdvance={async () => {
        const next = await learningApi.getReview(review.reviewId)
        resource.mutate((current) => current.reviewId === next.reviewId ? next : current)
      }}
      onReload={resource.reload}
      review={review}
      reviewOrigin={reviewOrigin}
    />
  )
}

function resumePath(review: Pick<ReviewDetail, 'resumeLessonId' | 'topicId'>) {
  if (review.resumeLessonId) return `/learn/lessons/${review.resumeLessonId}`
  if (review.topicId) return topicPagePath(review.topicId)
  return '/learn'
}

function toExerciseBlock(title: string, questions: Question[], code: string, setId: string): ExerciseBlockData {
  return {
    id: setId,
    sortOrder: 1,
    type: 'EXERCISE',
    title,
    instructions: 'Trả lời các câu dưới đây.',
    knowledgePointCode: code,
    questions,
    state: 'NOT_ATTEMPTED',
    savedAnswers: null,
    solutions: null,
  }
}

function ReviewView({ review, onAdvance, onReload, reviewOrigin }: {
  review: ReviewDetail
  onAdvance: () => Promise<void>
  onReload: () => void
  reviewOrigin?: ReviewOrigin
}) {
  const [result, setResult] = useState<ReviewSubmissionResult | null>(null)
  const [advancing, setAdvancing] = useState(false)
  const [advanceError, setAdvanceError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const status = result?.status ?? review.status
  // Keep the submitted set visible until the learner explicitly moves to the server's next stage.
  const stage = review.stage
  const set = review.status === 'PENDING' && stage === 'PRACTICE' ? review.set : null
  const showTheoryGate = review.status === 'PENDING' && stage === 'THEORY'
  // The theory step never waits for a click: the review opens its questions at once, whether it starts at the theory
  // (a low score) or returns to it after a failed set. The theory stays on the page above the questions.
  const opensQuestions = showTheoryGate
  const autoOpened = useRef(false)
  const openQuestions = useEffectEvent(() => { void confirmTheory() })
  useEffect(() => {
    if (!opensQuestions || autoOpened.current) return
    autoOpened.current = true
    openQuestions()
  }, [opensQuestions])
  const parents: TrailItem[] = [{ label: 'Khóa học', to: '/learn' }]
  if (reviewOrigin) {
    if (reviewOrigin.course) {
      parents.push({ label: reviewOrigin.course.title, to: courseTopicPath(reviewOrigin.course.id, reviewOrigin.topicId) })
    }
    parents.push(
      { label: reviewOrigin.topicTitle, to: topicPagePath(reviewOrigin.topicId) },
      { label: reviewOrigin.lessonLabel, to: lessonPracticePath(reviewOrigin.lessonId) },
    )
  } else if (review.resumeLessonId) {
    parents.push({ label: 'Bài học', to: lessonPracticePath(review.resumeLessonId) })
  } else if (review.topicId) {
    parents.push({ label: 'Danh sách bài học', to: topicPagePath(review.topicId) })
  }

  async function submitPractice(activeSet: ReviewSet, answers: AnswerInput[]) {
    try {
      const outcome = await learningApi.submitReview(review.reviewId, {
        requestId: newRequestId(),
        setId: activeSet.setId,
        answers,
      })
      if (outcome.status !== 'PENDING') resolvePendingReview(review.reviewId)
      setResult(outcome)
      return outcome
    } catch (reason) {
      const error = toApiError(reason)
      reportApiError(error)
      if (error.code === 'REVIEW_SET_CLOSED' || error.code === 'REVIEW_REQUIRED') onReload()
      throw error
    }
  }

  async function advanceReview() {
    if (advancing) return
    setAdvancing(true)
    setAdvanceError(null)
    try {
      await onAdvance()
    } catch (reason) {
      const error = toApiError(reason)
      reportApiError(error)
      setAdvanceError(`${error.message} Hãy thử tiếp tục.`)
    } finally {
      setAdvancing(false)
    }
  }

  /** The theory is the lesson summary, so confirming that it was read is all the theory step asks. */
  async function confirmTheory() {
    setConfirming(true)
    setConfirmError(null)
    try {
      await learningApi.submitTheoryCheck(review.reviewId, { requestId: newRequestId(), answers: [] })
      onReload()
    } catch (reason) {
      const error = toApiError(reason)
      reportApiError(error)
      setConfirmError(error.message)
    } finally {
      setConfirming(false)
    }
  }

  return (
    <article className="lp-page lp-review-page" aria-labelledby="lp-review-title">
      <StudyActivityTracker sourceType="REVIEW" sourceId={review.reviewId} enabled={status === 'PENDING'} />
      <LearnTrail
        items={[
          ...parents,
          { label: `Bài ôn · ${review.knowledgePoint.title}` },
        ]}
      />
      <header className="lp-review-head">
        <p className="lp-eyebrow">
          Bài ôn bắt buộc
          {stage ? ` · Bước ${stage === 'THEORY' ? 'đọc lý thuyết' : 'luyện tập'}` : ''}
        </p>
        <h1 id="lp-review-title">{review.knowledgePoint.title}</h1>
        {review.status === 'PENDING' && review.failedSets > 0 ? (
          <p>Số bộ chưa đạt: {review.failedSets}/{review.maxFailedSets}.</p>
        ) : null}
      </header>

      {review.theory.length > 0 ? (
        <section className="lp-theory" aria-labelledby="lp-theory-title">
          <h2 id="lp-theory-title"><BookOpenCheck aria-hidden="true" size={20} />Lý thuyết cần nhớ</h2>
          <LessonSummary markdown={review.theory.join('\n\n')} />
        </section>
      ) : null}

      {opensQuestions && !confirmError ? (
        <p className="lp-hint" role="status">
          <Loader2 aria-hidden="true" className="lp-spin" size={16} /> Đang mở bộ câu hỏi ôn…
        </p>
      ) : null}

      {showTheoryGate && (!opensQuestions || confirmError) ? (
        <section className="lp-complete-bar" aria-label="Xác nhận đã đọc lý thuyết">
          <p>Xác nhận đã đọc lý thuyết để sang bước luyện tập.</p>
          <Button
            className="lp-btn lp-btn--accent lp-btn--cta"
            disabled={confirming}
            type="button"
            onClick={() => void confirmTheory()}
          >
            Tiếp tục luyện ôn
          </Button>
          {confirmError ? <p className="lp-error" role="alert">{confirmError}</p> : null}
        </section>
      ) : null}

      {set ? (
        <section className="lp-split" aria-label="Bộ câu hỏi ôn">
          <div className="lp-split__passage">
            {set.audio?.mediaUrl ? <AudioBlock audio={set.audio} title="Audio ôn" /> : null}
            {set.passage.paragraphs.length > 0 || set.passage.title ? <PassageBlock passage={set.passage} /> : null}
          </div>
          <div className="lp-split__work">
            <ExerciseBlock
              allowResubmit={false}
              block={toExerciseBlock(
                `Bộ ${set.attemptNumber}${set.maxAttempts ? `/${set.maxAttempts}` : ''} · ${set.packageCode}`,
                set.questions,
                review.knowledgePoint.code,
                set.setId,
              )}
              failedFooter={result?.status === 'PENDING' ? (
                <div className="lp-review-retry">
                  <p>
                    Đã dùng {result.failedSets}{review.maxFailedSets !== null ? `/${review.maxFailedSets}` : ''} bộ.
                    {' '}Tiếp tục khi bạn đã xem xong kết quả.
                  </p>
                  <Button className="lp-btn" disabled={advancing} onClick={() => void advanceReview()} type="button">
                    {advancing ? <Loader2 aria-hidden="true" className="lp-spin" /> : <RefreshCw aria-hidden="true" />}
                    {advancing ? 'Đang tải…' : 'Làm bộ tiếp theo'}
                  </Button>
                  {advanceError ? <p className="lp-error" role="alert">{advanceError}</p> : null}
                </div>
              ) : null}
              onSubmit={(answers) => submitPractice(set, answers)}
            />
            <RewardSummary gamification={result?.gamification ?? null} />
          </div>
        </section>
      ) : null}
      {status === 'DONE' || status === 'SKIPPED' ? <ReviewOutcome review={review} status={status} /> : null}
    </article>
  )
}

function ReviewOutcome({ review, status }: { review: ReviewDetail; status: 'DONE' | 'SKIPPED' }) {
  const skipped = status === 'SKIPPED'
  return (
    <section className={`lp-done${skipped ? ' lp-done--review' : ''}`} role="status" aria-labelledby="lp-review-outcome">
      <span className="lp-done__icon" aria-hidden="true">{skipped ? <SkipForward size={24} /> : <BookOpenCheck size={24} />}</span>
      <div className="lp-done__body">
        <h2 id="lp-review-outcome">{skipped ? 'Đã bỏ qua bài ôn' : 'Đã hoàn thành bài ôn'}</h2>
        <p>
          {skipped
            ? `Bạn chưa đạt sau ${review.maxFailedSets} bộ. Bài ôn được bỏ qua để bạn tiếp tục học.`
            : 'Lộ trình đã mở lại. Bạn có thể học tiếp.'}
        </p>
      </div>
      <div className="lp-done__actions">
        <Button asChild className="lp-btn lp-btn--accent lp-btn--cta">
          <Link to={resumePath(review)}>Học tiếp<ArrowRight aria-hidden="true" /></Link>
        </Button>
      </div>
    </section>
  )
}
