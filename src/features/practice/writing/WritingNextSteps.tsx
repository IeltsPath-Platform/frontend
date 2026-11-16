import { Link } from 'react-router-dom'
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePointPractise, type Practise } from '@/features/learning-path/components/usePointPractise'
import { freePracticePath, type FreePracticeNavigationState } from '@/features/learning-path/lib/routes'
import type { EssayKnowledgeJudgment, EssayStudyPoint } from '~types/learningPath'
import type { PracticeSince } from '../history/submissionHistoryApi'
import { dateText } from './examinerReviewsView'
import { usePractisedSinceEssay } from './usePractisedSinceEssay'
import { buildNextSteps, type NextStep } from './writingStudySteps'

/** The screen a practice set leads back to, named on that set's page. */
const BACK_LABEL = 'Kết quả bài viết'

function lastText(practised: PracticeSince) {
  const score = practised.lastTotalCount ? `${practised.lastCorrectCount ?? 0}/${practised.lastTotalCount} câu` : null
  const verdict = practised.lastPassed == null ? null : practised.lastPassed ? 'đạt' : 'chưa đạt'
  const when = dateText(practised.lastSubmittedAt)
  return ['lần gần nhất', [score, verdict].filter(Boolean).join(', '), when].filter(Boolean).join(' · ')
}

/** Whether the learner has practised a step since this essay; shown only once that is known, for a step that can be practised. */
function PractiseStatus({ step, practised, backTo }: { step: NextStep; practised: PracticeSince | undefined; backTo: string }) {
  if (!practised) {
    return <p className="wr-next__status"><Circle aria-hidden="true" size={14} />Chưa luyện sau bài này</p>
  }
  return (
    <p className="wr-next__status is-done">
      <CheckCircle2 aria-hidden="true" size={14} />
      <span>Đã luyện {practised.attempts} lần sau bài này · {lastText(practised)}</span>
      <Link
        className="wr-next__last" to={freePracticePath(practised.lastAttemptId)}
        state={{ freePractice: { pointName: step.title, pointCode: step.point.code ?? '', backTo, backLabel: BACK_LABEL } } satisfies FreePracticeNavigationState}
      >
        Xem lần gần nhất
      </Link>
    </p>
  )
}

function Step({ step, practised, known, backTo, onPractise }: {
  step: NextStep
  practised: PracticeSince | undefined
  /** False until what was practised is known; the status is not guessed meanwhile. */
  known: boolean
  backTo: string
  onPractise?: Practise
}) {
  const { opening, error, practise } = usePointPractise(step.point, onPractise)
  const canPractise = Boolean(onPractise && step.target)
  return (
    <li className={`wr-next__item wr-next__item--${step.kind.toLowerCase().replace('_', '-')}${practised ? ' is-practised' : ''}`}>
      <div className="wr-next__body">
        <h4 className="wr-next__title">{step.title}</h4>
        {step.meta ? <p className="wr-next__meta">{step.meta}</p> : null}
        {step.excerpt ? <p className="wr-next__quote"><span>Bạn viết:</span> <q>{step.excerpt}</q></p> : null}
        {step.reasons.map((reason, index) => <p className="wr-next__why" key={index}>{reason}</p>)}
        {known && step.target ? <PractiseStatus backTo={backTo} practised={practised} step={step} /> : null}
        {error ? <p className="wr-next__error" role="alert">{error}</p> : null}
      </div>
      {canPractise ? (
        <Button
          aria-label={`${practised ? 'Luyện lại' : 'Luyện tập'} ${step.title}`} className="wr-next__go" disabled={opening}
          onClick={() => void practise()} type="button" variant="outline"
        >
          {opening ? <Loader2 aria-hidden="true" className="lp-spin" /> : null}
          {opening ? 'Đang mở…' : practised ? 'Luyện lại' : 'Luyện tập'}
        </Button>
      ) : null}
    </li>
  )
}

/**
 * What to study next, in one list: the points of the question the essay failed, the weak criteria and the AI's advice.
 * Each step that can be practised says whether it was practised since this essay, how the latest set went, and opens that
 * set again; every set is also listed under "Lịch sử nộp bài" → "Luyện theo kiến thức". Points of the question that need
 * nothing more fold into one line, so the list holds only what is worth doing.
 */
export function WritingNextSteps({ points, judgments, submissionId, backTo, onPractise }: {
  points: readonly EssayStudyPoint[]
  judgments: readonly EssayKnowledgeJudgment[] | undefined
  /** The essay; without it the list does not say what was practised. */
  submissionId?: string
  /** This page, for the way back from a practice set. */
  backTo: string
  /** Starts practice on a step's knowledge point; a refusal shows under that step. */
  onPractise?: Practise
}) {
  const { steps, passed, unassessed } = buildNextSteps(points, judgments)
  const targets = steps.flatMap((step) => (step.target ? [step.target] : []))
  const practised = usePractisedSinceEssay(submissionId, targets)
  const settled = passed.length + unassessed.length
  if (steps.length === 0 && settled === 0) return null
  const practisable = steps.filter((step) => step.target)
  const done = practised ? practisable.filter((step) => practised.has(step.target!)).length : 0
  return (
    <section className="wr-next" aria-labelledby="wr-next-title">
      <header className="wr-next__head">
        <div>
          <h3 id="wr-next-title">Nên học gì tiếp</h3>
          <p className="wr-muted">{steps.length > 0 ? 'Xếp theo thứ tự nên làm trước, từ điểm yếu của bài này.' : 'Bài này không có điểm nào cần luyện thêm.'}</p>
        </div>
        {practised && practisable.length > 0 ? (
          <p className="wr-next__progress" aria-live="polite">
            <b>{done}/{practisable.length}</b> mục đã luyện
            <Link className="wr-next__history" to="/submission-history?tab=knowledge">Xem tất cả lần luyện</Link>
          </p>
        ) : null}
      </header>
      {steps.length > 0 ? (
        <ol className="wr-next__list">
          {steps.map((step) => (
            <Step
              backTo={backTo} key={step.key} known={practised !== null} onPractise={onPractise} step={step}
              practised={step.target ? practised?.get(step.target) : undefined}
            />
          ))}
        </ol>
      ) : null}
      {settled > 0 ? (
        <details className="wr-next__settled">
          <summary>Các điểm kiến thức khác của đề ({settled})</summary>
          {passed.length > 0 ? <p><b>Đã đạt:</b> {passed.join(', ')}</p> : null}
          {unassessed.length > 0 ? <p><b>Chưa đủ bằng chứng để đánh giá:</b> {unassessed.join(', ')}</p> : null}
        </details>
      ) : null}
    </section>
  )
}
