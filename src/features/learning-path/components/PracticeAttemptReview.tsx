import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PracticeAttemptReview as Review, PracticeSetItem } from '~types/learningPath'
import { learningApi } from '../api'
import { useApiResource } from '../lib/useApiResource'
import { AudioBlock } from './blocks/AudioBlock'
import { PassageBlock } from './blocks/PassageBlock'
import { ApiErrorState, LoadingState } from './PageState'
import { PracticeEssays } from './PracticeEssays'

const percentOf = (value: number) => Math.round(value * (value <= 1 ? 100 : 1))

/** The questions of a submitted set with the right answer and explanation the submission already showed. */
function QuestionResults({ review }: { review: Review }) {
  const { attempt, result } = review
  const byQuestion = new Map(result.results.map((item) => [item.questionId, item]))
  return (
    <ol className="lp-result-items" aria-label="Kết quả từng câu">
      {attempt.questions.map((question) => {
        const outcome = byQuestion.get(question.id)
        const correct = outcome?.correct === true
        const answerLabel = question.options?.find((option) => option.value === outcome?.correctAnswer)?.label
        return (
          <li className={`lp-result-item ${correct ? 'is-correct' : 'is-wrong'}`} key={question.id}>
            <span aria-label={correct ? 'Đúng' : 'Sai'}>
              {correct ? <CheckCircle2 aria-hidden="true" size={18} /> : <XCircle aria-hidden="true" size={18} />}
            </span>
            <div>
              <p><strong>{question.number}.</strong> {question.prompt}</p>
              {outcome?.correctAnswer ? (
                <p>Đáp án đúng: {outcome.correctAnswer}{answerLabel ? ` · ${answerLabel}` : ''}</p>
              ) : null}
              {outcome?.explanation ? <p>{outcome.explanation}</p> : null}
            </div>
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
export function PracticeAttemptReview({ attemptId, item, onBack }: {
  attemptId: string
  item: PracticeSetItem
  onBack: () => void
}) {
  const resource = useApiResource(`practice-review:${attemptId}`, () => learningApi.getPracticeAttemptReview(attemptId))
  if (resource.status === 'loading') return <LoadingState label="Đang tải kết quả…" />
  if (resource.status === 'error' && resource.error) return <ApiErrorState error={resource.error} onRetry={resource.reload} />
  if (!resource.data) return null

  const review = resource.data
  const { attempt, result } = review
  const hasQuestions = attempt.questions.length > 0
  const backButton = (
    <Button className="lp-btn lp-btn--accent" onClick={onBack} type="button">
      <ArrowLeft aria-hidden="true" size={16} /> Về danh sách luyện tập
    </Button>
  )

  return (
    <section className="lp-practice" aria-labelledby="lp-practice-review-title">
      <header className="lp-lesson-head lp-practice-attempt-head">
        <p className="lp-eyebrow">Xem lại · {item.code}</p>
        <h2 id="lp-practice-review-title">{item.title}</h2>
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
          onExit={onBack}
          onFinish={async () => undefined}
        />
      ) : null}
    </section>
  )
}
