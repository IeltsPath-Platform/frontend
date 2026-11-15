import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PracticeAttemptReview as Review, PracticeSetItem } from '~types/learningPath'
import { learningApi } from '../api'
import { useApiResource } from '../lib/useApiResource'
import { AudioBlock } from './blocks/AudioBlock'
import { PassageBlock } from './blocks/PassageBlock'
import { QuestionField } from './blocks/QuestionField'
import { ApiErrorState, LoadingState } from './PageState'
import { PracticeEssays } from './PracticeEssays'

const percentOf = (value: number) => Math.round(value * (value <= 1 ? 100 : 1))

/**
 * The questions of a submitted set laid out as they were when the learner filled them in: their own answer chosen, the right
 * option marked, a wrong choice marked, and the explanation the submission already showed. A set submitted before the answers
 * were kept has no answer for a wrong question; a right one is known to have been the right option.
 */
function QuestionResults({ review }: { review: Review }) {
  const { attempt, result } = review
  const byQuestion = new Map(result.results.map((item) => [item.questionId, item]))
  return (
    <ol className="lp-questions lp-questions--review" aria-label="Bài làm đã nộp">
      {attempt.questions.map((question) => {
        const outcome = byQuestion.get(question.id)
        const answer = outcome?.submittedAnswer ?? (outcome?.correct ? outcome.correctAnswer ?? '' : '')
        return (
          <li key={question.id}>
            <QuestionField disabled onChange={() => undefined} question={question} result={outcome} review value={answer} />
          </li>
        )
      })}
    </ol>
  )
}

/**
 * A submitted Practice set reopened for reading: the score, each question with its answer, and the essays with the
 * grade they were given. Nothing here can be changed or sent again; "Làm lại" on the list starts a new attempt.
 */
export function PracticeAttemptReview({ attemptId, item, onBack, backLabel = 'Về danh sách luyện tập' }: {
  attemptId: string
  /** Names the set; needed with `onBack`, when this view carries its own title. */
  item?: Pick<PracticeSetItem, 'code' | 'title'>
  /**
   * Lesson Practice shows the set in place of its list, so the view has a title and a button back to the list. Without it the
   * host page already names the set and leads back (its trail), and the view shows only the score and the questions.
   */
  onBack?: () => void
  /** The words of the back button; it leads to the list the learner came from. */
  backLabel?: string
}) {
  const resource = useApiResource(`practice-review:${attemptId}`, () => learningApi.getPracticeAttemptReview(attemptId))
  if (resource.status === 'loading') return <LoadingState label="Đang tải kết quả…" />
  if (resource.status === 'error' && resource.error) return <ApiErrorState error={resource.error} onRetry={resource.reload} />
  if (!resource.data) return null

  const review = resource.data
  const { attempt, result } = review
  const hasQuestions = attempt.questions.length > 0
  const backButton = onBack ? (
    <Button className="lp-btn lp-btn--accent" onClick={onBack} type="button">
      <ArrowLeft aria-hidden="true" size={16} /> {backLabel}
    </Button>
  ) : null
  const titled = onBack !== undefined && item !== undefined

  return (
    <section className="lp-practice" aria-labelledby={titled ? 'lp-practice-review-title' : undefined}>
      <header className={titled ? 'lp-lesson-head lp-practice-attempt-head' : 'lp-practice-attempt-head lp-practice-attempt-head--bare'}>
        {titled ? <p className="lp-eyebrow">Xem lại · {item.code}</p> : null}
        {titled ? <h2 id="lp-practice-review-title">{item.title}</h2> : null}
        {hasQuestions ? (
          <p role="status">
            {result.passed ? 'Đã đạt' : 'Chưa đạt'} · {percentOf(result.percent)}% ({result.correct}/{result.total} câu đúng)
          </p>
        ) : null}
        {!result.countedAsEvidence && hasQuestions ? (
          <p className="lp-hint">Lần này không được tính điểm vì đáp án bộ đã hiện trước đó.</p>
        ) : null}
        {backButton}
      </header>
      {attempt.audio?.mediaUrl ? <AudioBlock audio={attempt.audio} title="Audio luyện" /> : null}
      {attempt.passage && (attempt.passage.paragraphs.length > 0 || attempt.passage.title)
        ? <PassageBlock passage={attempt.passage} />
        : null}
      {hasQuestions ? <QuestionResults review={review} /> : null}
      {attempt.essays.length > 0 ? (
        <PracticeEssays
          attemptId={attempt.attemptId}
          done={backButton}
          essays={attempt.essays}
          finished
          onExit={onBack ?? (() => undefined)}
          onFinish={async () => undefined}
        />
      ) : null}
    </section>
  )
}
