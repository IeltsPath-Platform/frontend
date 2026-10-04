import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, BookOpenCheck, RefreshCw, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type {
  AnswerInput,
  ExerciseBlockData,
  Question,
  ReviewDetail,
  ReviewSet,
  ReviewSubmissionResult,
  TheoryCheckResult,
} from '~types/learningPath'
import { learningApi, toApiError } from '../api'
import { AudioBlock } from '../components/blocks/AudioBlock'
import { BlockList } from '../components/blocks/BlockList'
import type { BlockRenderContext } from '../components/blocks/blockRegistry'
import { ExerciseBlock } from '../components/blocks/ExerciseBlock'
import { PassageBlock } from '../components/blocks/PassageBlock'
import { ApiErrorState, LoadingState } from '../components/PageState'
import { newRequestId } from '../lib/requestId'
import { reportApiError, resolvePendingReview } from '../lib/reviewGate'
import { useApiResource } from '../lib/useApiResource'

const THEORY_CONTEXT: BlockRenderContext = {
  pointsBalance: 0,
  submitExercise: () => Promise.reject(new Error('Phần lý thuyết không có bài tập.')),
  submitEssay: () => Promise.reject(new Error('Phần lý thuyết không có bài luận.')),
}

export function ReviewPage() {
  const { reviewId = '' } = useParams()
  const resource = useApiResource(`review:${reviewId}`, () => learningApi.getReview(reviewId))

  if (resource.status === 'loading') return <LoadingState label="Đang tải bài ôn…" />
  if (resource.status === 'error' && resource.error) return <ApiErrorState error={resource.error} onRetry={resource.reload} />
  if (!resource.data) return null
  const review = resource.data
  return (
    <ReviewView
      key={`${review.reviewId}:${review.stage}:${review.set?.setId ?? 'theory'}:${review.status}`}
      onReload={resource.reload}
      review={review}
    />
  )
}

function resumePath(review: Pick<ReviewDetail, 'resumeLessonId' | 'topicId'>) {
  if (review.resumeLessonId) return `/learn/lessons/${review.resumeLessonId}`
  if (review.topicId) return `/learn/topics/${review.topicId}`
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

function ReviewView({ review, onReload }: { review: ReviewDetail; onReload: () => void }) {
  const [result, setResult] = useState<ReviewSubmissionResult | null>(null)
  const [theoryResult, setTheoryResult] = useState<TheoryCheckResult | null>(null)
  const status = result?.status ?? review.status
  const stage = theoryResult?.stage ?? result?.stage ?? review.stage
  const set = review.status === 'PENDING' && stage === 'PRACTICE' ? review.set : null
  const showTheoryGate = review.status === 'PENDING' && stage === 'THEORY'

  async function submitPractice(activeSet: ReviewSet, answers: AnswerInput[]) {
    try {
      const outcome = await learningApi.submitReview(review.reviewId, {
        requestId: newRequestId(),
        setId: activeSet.setId,
        answers,
      })
      if (outcome.status !== 'PENDING') resolvePendingReview(review.reviewId)
      setResult(outcome)
      if (outcome.stage === 'THEORY' || outcome.status === 'PENDING') onReload()
      return outcome
    } catch (reason) {
      const error = toApiError(reason)
      reportApiError(error)
      if (error.code === 'REVIEW_SET_CLOSED' || error.code === 'REVIEW_REQUIRED') onReload()
      throw error
    }
  }

  async function submitTheoryCheck(answers: AnswerInput[]) {
    try {
      const outcome = await learningApi.submitTheoryCheck(review.reviewId, {
        requestId: newRequestId(),
        answers,
      })
      setTheoryResult(outcome)
      onReload()
      return {
        passed: outcome.total > 0 ? outcome.correct === outcome.total : true,
        percent: outcome.total === 0 ? 100 : Math.round((outcome.correct / outcome.total) * 100),
        correctCount: outcome.correct,
        totalCount: outcome.total,
        results: outcome.results,
      }
    } catch (reason) {
      const error = toApiError(reason)
      reportApiError(error)
      throw error
    }
  }

  return (
    <article className="lp-page lp-review-page" aria-labelledby="lp-review-title">
      <header className="lp-review-head">
        <p className="lp-eyebrow">
          Ôn bắt buộc · {review.knowledgePoint.code}
          {stage ? ` · ${stage}` : ''}
          {review.status === 'PENDING' ? ` · fail ${review.failedSets}/${review.maxFailedSets}` : ''}
        </p>
        <h1 id="lp-review-title">{review.knowledgePoint.title}</h1>
        <p>
          {showTheoryGate
            ? 'Đọc lại lý thuyết rồi trả lời quick-check để mở bộ luyện ôn.'
            : 'Làm bộ câu hỏi ôn. Đạt để hoàn thành; chưa đạt có thể sang THEORY hoặc bộ khác.'}
        </p>
      </header>

      {status === 'DONE' || status === 'SKIPPED' ? <ReviewOutcome review={review} status={status} /> : null}

      {review.theory.length > 0 ? (
        <section className="lp-theory" aria-labelledby="lp-theory-title">
          <h2 id="lp-theory-title"><BookOpenCheck aria-hidden="true" size={20} />Lý thuyết cần nhớ</h2>
          <BlockList blocks={review.theory} context={THEORY_CONTEXT} />
        </section>
      ) : null}

      {showTheoryGate ? (
        <section className="lp-split" aria-label="Quick-check lý thuyết">
          <div className="lp-split__work" style={{ gridColumn: '1 / -1' }}>
            {review.quickCheck.length > 0 ? (
              <ExerciseBlock
                allowResubmit={false}
                block={toExerciseBlock(
                  'Quick-check lý thuyết',
                  review.quickCheck,
                  review.knowledgePoint.code,
                  `theory-check:${review.reviewId}`,
                )}
                onSubmit={submitTheoryCheck}
              />
            ) : (
              <div className="lp-complete-bar">
                <p>Không có câu quick-check. Xác nhận đã đọc lý thuyết để sang PRACTICE.</p>
                <Button
                  className="lp-btn lp-btn--accent lp-btn--cta"
                  type="button"
                  onClick={() => void submitTheoryCheck([])}
                >
                  Tiếp tục luyện ôn
                </Button>
              </div>
            )}
          </div>
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
                `Bộ ${set.attemptNumber}/${set.maxAttempts} · ${set.packageCode}`,
                set.questions,
                review.knowledgePoint.code,
                set.setId,
              )}
              failedFooter={result?.status === 'PENDING' && result.stage === 'PRACTICE' ? (
                <div className="lp-review-retry">
                  <p>Chưa đạt (failedSets {result.failedSets}/{review.maxFailedSets}). Tải bộ tiếp theo.</p>
                  <Button className="lp-btn" onClick={onReload} type="button"><RefreshCw aria-hidden="true" />Làm bộ tiếp theo</Button>
                </div>
              ) : null}
              onSubmit={(answers) => submitPractice(set, answers)}
            />
          </div>
        </section>
      ) : null}
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
            : 'Lộ trình đã mở lại. Bạn có thể học tiếp hoặc quay lại luyện thêm / đề cuối.'}
        </p>
      </div>
      <div className="lp-done__actions">
        <Button asChild className="lp-btn"><Link to={resumePath(review)}>Học tiếp<ArrowRight aria-hidden="true" /></Link></Button>
      </div>
    </section>
  )
}
