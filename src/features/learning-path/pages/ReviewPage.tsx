import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, BookOpenCheck, RefreshCw, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AnswerInput, ExerciseBlockData, ReviewDetail, ReviewSet, ReviewSubmissionResult } from '~types/learningPath'
import { learningApi, toApiError } from '../api'
import { BlockList } from '../components/blocks/BlockList'
import type { BlockRenderContext } from '../components/blocks/blockRegistry'
import { ExerciseBlock } from '../components/blocks/ExerciseBlock'
import { PassageBlock } from '../components/blocks/PassageBlock'
import { ApiErrorState, LoadingState } from '../components/PageState'
import { newRequestId } from '../lib/requestId'
import { reportApiError, resolvePendingReview } from '../lib/reviewGate'
import { useApiResource } from '../lib/useApiResource'

const THEORY_CONTEXT: BlockRenderContext = {
  submitExercise: () => Promise.reject(new Error('Phần lý thuyết không có bài tập.')),
}

export function ReviewPage() {
  const { reviewId = '' } = useParams()
  const resource = useApiResource(`review:${reviewId}`, () => learningApi.getReview(reviewId))

  if (resource.status === 'loading') return <LoadingState label="Đang tải bài ôn…" />
  if (resource.status === 'error' && resource.error) return <ApiErrorState error={resource.error} onRetry={resource.reload} />
  if (!resource.data) return null
  const review = resource.data
  return <ReviewView key={`${review.reviewId}:${review.set?.setId ?? review.status}`} onReload={resource.reload} review={review} />
}

function resumePath(review: Pick<ReviewDetail, 'resumeLessonId' | 'topicId'>) {
  return review.resumeLessonId ? `/learn/lessons/${review.resumeLessonId}` : `/learn/topics/${review.topicId}`
}

function toExerciseBlock(review: ReviewDetail, set: ReviewSet): ExerciseBlockData {
  return {
    id: set.setId,
    sortOrder: 1,
    type: 'EXERCISE',
    title: `Bộ ${set.attemptNumber}/${set.maxAttempts} · ${set.packageCode}`,
    instructions: 'Đọc đoạn văn và trả lời. Đạt từ 70% để hoàn thành bài ôn; chưa đạt sẽ nhận bộ khác.',
    knowledgePointCode: review.knowledgePoint.code,
    questions: set.questions,
    state: 'NOT_ATTEMPTED',
    savedAnswers: null,
    solutions: null,
  }
}

function ReviewView({ review, onReload }: { review: ReviewDetail; onReload: () => void }) {
  const [result, setResult] = useState<ReviewSubmissionResult | null>(null)
  const status = result?.status ?? review.status
  const set = review.status === 'PENDING' ? review.set : null

  async function submit(activeSet: ReviewSet, answers: AnswerInput[]) {
    try {
      const outcome = await learningApi.submitReview(review.reviewId, { requestId: newRequestId(), setId: activeSet.setId, answers })
      if (outcome.status !== 'PENDING') resolvePendingReview(review.reviewId)
      setResult(outcome)
      return outcome
    } catch (reason) {
      const error = toApiError(reason)
      reportApiError(error)
      if (error.code === 'REVIEW_SET_CLOSED') onReload()
      throw error
    }
  }

  return (
    <article className="lp-page lp-review-page" aria-labelledby="lp-review-title">
      <header className="lp-review-head">
        <p className="lp-eyebrow">Ôn bắt buộc · {review.knowledgePoint.code}</p>
        <h1 id="lp-review-title">{review.knowledgePoint.title}</h1>
        <p>Bạn đã sai ở phần này trong lần nộp đầu. Xem lại lý thuyết từ bài "{review.sourceLessonTitle}", rồi làm một bộ câu hỏi.</p>
      </header>

      {status === 'DONE' || status === 'SKIPPED' ? <ReviewOutcome review={review} status={status} /> : null}

      {review.theory.length > 0 ? (
        <section className="lp-theory" aria-labelledby="lp-theory-title">
          <h2 id="lp-theory-title"><BookOpenCheck aria-hidden="true" size={20} />Lý thuyết cần nhớ</h2>
          <BlockList blocks={review.theory} context={THEORY_CONTEXT} />
        </section>
      ) : null}

      {set ? (
        <section className="lp-split" aria-label="Bộ câu hỏi ôn">
          <div className="lp-split__passage"><PassageBlock passage={set.passage} /></div>
          <div className="lp-split__work">
            <ExerciseBlock
              allowResubmit={false}
              block={toExerciseBlock(review, set)}
              failedFooter={result?.status === 'PENDING' ? (
                <div className="lp-review-retry">
                  <p>Chưa đạt. Bộ tiếp theo dùng đoạn văn khác.</p>
                  <Button className="lp-btn" onClick={onReload} type="button"><RefreshCw aria-hidden="true" />Làm bộ tiếp theo</Button>
                </div>
              ) : null}
              onSubmit={(answers) => submit(set, answers)}
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
            ? 'Bạn chưa đạt sau 3 bộ liên tiếp. Bài ôn được bỏ qua để bạn tiếp tục học; hãy xem lại phần lý thuyết khi cần.'
            : 'Lộ trình đã mở lại. Bạn có thể học tiếp.'}
        </p>
      </div>
      <div className="lp-done__actions">
        <Button asChild className="lp-btn"><Link to={resumePath(review)}>Học tiếp<ArrowRight aria-hidden="true" /></Link></Button>
      </div>
    </section>
  )
}
