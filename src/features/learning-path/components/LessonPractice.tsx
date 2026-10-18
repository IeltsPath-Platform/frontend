import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, CheckCircle2, CircleDot, Loader2, Lock, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type {
  AnswerInput,
  ExerciseBlockData,
  HeartsStatus,
  LessonPracticeSets,
  PracticeAttemptView,
  PracticeSetItem,
  PracticeSubmissionResult,
  ReviewRef,
} from '~types/learningPath'
import { learningApi, toApiError, userMessage } from '../api'
import { AudioBlock } from './blocks/AudioBlock'
import { ExerciseBlock } from './blocks/ExerciseBlock'
import { PassageBlock } from './blocks/PassageBlock'
import { HeartsPanel } from './HeartsPanel'
import { ApiErrorState, LoadingState } from './PageState'
import { RewardSummary } from './RewardSummary'
import { newRequestId } from '../lib/requestId'
import { reportApiError, setPendingReviews } from '../lib/reviewGate'
import { useApiResource } from '../lib/useApiResource'
import type { ReviewOrigin } from '../lib/routes'

type ItemMeta = { label: string; tone: 'success' | 'accent' | 'locked'; icon: typeof Lock }

const ITEM_META: Partial<Record<PracticeSetItem['status'], ItemMeta>> = {
  IN_PROGRESS: { label: 'Đang làm', tone: 'accent', icon: CircleDot },
  PASSED: { label: 'Đã đạt', tone: 'success', icon: CheckCircle2 },
  LOCKED: { label: 'Chưa mở', tone: 'locked', icon: Lock },
}

/**
 * A submitted set has done its part for the lesson, passed or not: a failed one only waits for the review it created.
 * Once that review is finished, the set is done and is never required again.
 */
function itemMeta(item: PracticeSetItem, waitsForReview: boolean): ItemMeta | undefined {
  if (item.status !== 'ATTEMPTED') return ITEM_META[item.status]
  return waitsForReview
    ? { label: 'Cần làm bài ôn', tone: 'accent', icon: ShieldAlert }
    : { label: 'Đã xong', tone: 'success', icon: CheckCircle2 }
}

const PRACTICE_STATUS_TEXT: Record<string, string> = {
  REQUIRED: 'Bắt buộc: làm hết các bộ dưới đây, và bài ôn nếu có, để hoàn thành bài và mở bài tiếp theo.',
  PASSED: 'Đã hoàn thành phần luyện tập của bài.',
  LOCKED: 'Chưa mở',
}

/** The Practice of a lesson: the pending reviews it created, then its sets. */
export function LessonPractice({ lessonId, onChanged, reviewOrigin }: {
  lessonId: string
  onChanged?: () => void
  reviewOrigin?: ReviewOrigin
}) {
  const resource = useApiResource(`practice:${lessonId}`, () => learningApi.getLessonPracticeSets(lessonId))
  const reviews = useApiResource(`practice-reviews:${lessonId}`, async () =>
    (await learningApi.getPendingReviews()).filter((review) => review.lessonId === lessonId))
  // The hearts are an extra: if they cannot be read, the sets still open and the server refuses them when needed.
  const hearts = useApiResource('hearts', () => learningApi.getHearts())
  const reloadAll = () => {
    resource.reload()
    reviews.reload()
    hearts.reload()
    onChanged?.()
  }

  if (resource.status === 'loading') return <LoadingState label="Đang tải luyện thêm…" />
  if (resource.status === 'error' && resource.error) return <ApiErrorState error={resource.error} onRetry={resource.reload} />
  if (!resource.data) return null
  return (
    <PracticeView
      catalog={resource.data}
      hearts={hearts.data}
      onHeartsChanged={hearts.reload}
      onReload={reloadAll}
      reviewOrigin={reviewOrigin}
      reviews={reviews.data ?? []}
    />
  )
}

function PracticeView({ catalog, hearts, onHeartsChanged, onReload, reviewOrigin, reviews }: {
  catalog: LessonPracticeSets
  hearts: HeartsStatus | null
  onHeartsChanged: () => void
  onReload: () => void
  reviewOrigin?: ReviewOrigin
  reviews: ReviewRef[]
}) {
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
      setError(userMessage(apiError))
      if (apiError.code === 'HEARTS_DEPLETED') onHeartsChanged()
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
      // Wrong answers cost hearts, so what is left has changed.
      if ((outcome.gamification?.heartsLost ?? 0) > 0) onHeartsChanged()
      if (outcome.reviewsCreated.length > 0) {
        setPendingReviews(outcome.reviewsCreated.map((review) => ({
          reviewId: review.reviewId,
          lessonId: catalog.lessonId,
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
      if (apiError.code === 'HEARTS_DEPLETED') onHeartsChanged()
      throw apiError
    }
  }

  if (active) {
    const percentDisplay = submission
      ? Math.round(submission.percent * (submission.percent <= 1 ? 100 : 1))
      : null
    return (
      <section className="lp-practice" aria-labelledby="lp-practice-attempt-title">
        <header className="lp-lesson-head lp-practice-attempt-head">
          <p className="lp-eyebrow">Luyện thêm · {active.item.code}</p>
          <h2 id="lp-practice-attempt-title">{active.item.title}</h2>
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
            {hearts?.hearts === 0 ? <HeartsPanel onChanged={onHeartsChanged} status={hearts} /> : null}
            <ExerciseBlock
              allowResubmit={false}
              block={toExerciseBlock(active)}
              failedFooter={submission && !submission.passed ? (
                <div className="lp-review-retry">
                  <p>Chọn một bộ khác, hoặc làm bài ôn nếu hệ thống đã tạo cho bạn.</p>
                  <Button className="lp-btn" onClick={() => { setActive(null); setSubmission(null); onReload() }} type="button">
                    Về danh sách
                  </Button>
                </div>
              ) : null}
              onSubmit={submit}
            />
            <RewardSummary gamification={submission?.gamification ?? null} />
            {submission?.reviewsCreated[0] ? (
              <div className="lp-done lp-done--review" role="status">
                <p>Đã tạo bài ôn bắt buộc sau lần luyện này.</p>
                <Button asChild className="lp-btn lp-btn--accent lp-btn--cta">
                  <Link to={`/learn/reviews/${submission.reviewsCreated[0].reviewId}`} state={reviewOrigin ? { reviewOrigin } : undefined}>
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
      </section>
    )
  }

  // A review sits right under the set whose attempt created it. Reviews without a set in this list, such as the ones
  // an assessment created, come first.
  const setIds = new Set(catalog.items.map((item) => item.packageId))
  const reviewsBySet = new Map<string, ReviewRef[]>()
  const looseReviews: ReviewRef[] = []
  for (const review of reviews) {
    if (review.sourcePackageId && setIds.has(review.sourcePackageId)) {
      reviewsBySet.set(review.sourcePackageId, [...(reviewsBySet.get(review.sourcePackageId) ?? []), review])
    } else {
      looseReviews.push(review)
    }
  }
  const openItems = catalog.items.filter((item) => item.accessLevel !== 'PREMIUM')
  // The highlighted set is the one the learner still owes: a set already submitted is never the next step.
  const primaryId = (openItems.find((item) => item.status === 'IN_PROGRESS')
    ?? openItems.find((item) => item.status === 'AVAILABLE'))?.packageId

  return (
    <section className="lp-practice" aria-labelledby="lp-practice-title">
      <header className="lp-practice-head">
        <div className="lp-practice-head__heading">
          <h2 id="lp-practice-title">Luyện tập</h2>
          {catalog.items.length > 0 ? <span className="lp-practice-head__count">{catalog.items.length} bộ bài tập</span> : null}
        </div>
        <p className="lp-practice-head__lead">
          {PRACTICE_STATUS_TEXT[catalog.practiceStatus] ?? catalog.practiceStatus}
        </p>
      </header>
      {hearts ? <HeartsPanel onChanged={onHeartsChanged} status={hearts} /> : null}
      {error ? <p className="lp-error" role="alert">{error}</p> : null}
      {catalog.items.length === 0 && reviews.length === 0 ? (
        <p className="lp-empty">Bài này không có bộ luyện thêm.</p>
      ) : (
        <ul className="lp-practice-list" aria-label="Bài ôn và các bộ luyện thêm">
          {looseReviews.map((review) => <ReviewCard key={review.reviewId} review={review} reviewOrigin={reviewOrigin} />)}
          {catalog.items.map((item) => {
            const meta = itemMeta(item, reviewsBySet.has(item.packageId))
            const StateIcon = meta?.icon
            const withoutLabel = item.title.replace(/^(?:Luyện thêm|Luyện tập)\s+/i, '')
            const title = withoutLabel.startsWith(`${item.code}:`)
              ? withoutLabel.slice(item.code.length + 1).trim() || item.title
              : withoutLabel
            const premium = item.accessLevel === 'PREMIUM'
            const canStart = !premium && (item.status === 'AVAILABLE' || item.status === 'IN_PROGRESS' || item.status === 'ATTEMPTED' || item.status === 'PASSED')
            const disabled = !canStart || startingId === item.packageId
            const label = premium
              ? 'Premium'
              : item.status === 'LOCKED'
                ? 'Khóa'
                : item.status === 'PASSED' || item.status === 'ATTEMPTED'
                  ? 'Làm lại'
                  : startingId === item.packageId
                    ? 'Đang mở…'
                    : item.status === 'IN_PROGRESS'
                      ? 'Làm tiếp'
                      : 'Bắt đầu'
            return (
            <Fragment key={item.packageId}>
              <li className={`lp-practice-card${item.packageId === primaryId ? ' is-current' : ''}${premium ? ' is-premium' : ''}`}>
                <div className="lp-practice-card__body">
                  <span className="lp-practice-card__code">{item.code}</span>
                  <h3>{title}</h3>
                  <p>{item.questionCount} câu{item.bestPercent != null ? ` · điểm cao nhất ${Math.round(item.bestPercent * (item.bestPercent <= 1 ? 100 : 1))}%` : ''}</p>
                  {item.revealed && (item.status === 'AVAILABLE' || item.status === 'IN_PROGRESS') ? (
                    <p className="lp-hint lp-hint--warn">Đáp án bộ này đã hiện ở bài ôn, nên lần làm này không được tính điểm.</p>
                  ) : null}
                  {premium ? <p className="lp-hint">Bộ Premium, chưa mở trong giai đoạn này.</p> : null}
                </div>
                <div className="lp-practice-card__aside">
                  {meta && StateIcon ? <span className={`lp-practice-card__status lp-practice-card__status--${meta.tone}`}>
                    <StateIcon aria-hidden="true" size={14} />{meta.label}
                  </span> : null}
                  {item.status === 'LOCKED' && !premium ? null : <Button
                    aria-label={`${label}: ${item.title}`}
                    className={`lp-btn lp-practice-card__action${item.packageId === primaryId ? ' is-primary' : ''}`}
                    disabled={disabled}
                    type="button"
                    variant="ghost"
                    onClick={() => void startSet(item)}
                  >
                    {startingId === item.packageId ? <Loader2 aria-hidden="true" className="lp-spin" /> : null}
                    {label}
                    {startingId === item.packageId || !canStart ? null : <ArrowRight aria-hidden="true" size={16} />}
                  </Button>}
                </div>
              </li>
              {reviewsBySet.get(item.packageId)?.map((review) => <ReviewCard key={review.reviewId} review={review} reviewOrigin={reviewOrigin} />)}
            </Fragment>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/** A pending review of the lesson, in the list of its Practice. */
function ReviewCard({ review, reviewOrigin }: { review: ReviewRef; reviewOrigin?: ReviewOrigin }) {
  return (
    <li className="lp-practice-card is-review">
      <div className="lp-practice-card__body">
        <span className="lp-practice-card__code">Bài ôn bắt buộc</span>
        <h3>{review.knowledgePointTitle}</h3>
        <p>Làm xong để luyện tập tiếp và mở bài sau.</p>
      </div>
      <div className="lp-practice-card__aside">
        <span className="lp-practice-card__status lp-practice-card__status--accent">
          <ShieldAlert aria-hidden="true" size={13} />
          Cần làm
        </span>
        <Button asChild className="lp-btn lp-practice-card__action is-primary" variant="ghost">
          <Link to={`/learn/reviews/${review.reviewId}`} state={reviewOrigin ? { reviewOrigin } : undefined}>
            Làm bài ôn<ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </li>
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
