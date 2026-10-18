import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type {
  AnswerInput,
  ExerciseBlockData,
  PracticeAttemptView,
  PracticeSubmissionResult,
} from '~types/learningPath'
import { learningApi, toApiError } from '../api'
import { AudioBlock } from '../components/blocks/AudioBlock'
import { ExerciseBlock } from '../components/blocks/ExerciseBlock'
import { PassageBlock } from '../components/blocks/PassageBlock'
import { HeartsPanel } from '../components/HeartsPanel'
import { LearnTrail } from '../components/LearnTrail'
import { ApiErrorState, LoadingState } from '../components/PageState'
import { RewardSummary } from '../components/RewardSummary'
import { newRequestId } from '../lib/requestId'
import type { FreePracticeNavigationState } from '../lib/routes'
import { reportApiError } from '../lib/reviewGate'
import { useApiResource } from '../lib/useApiResource'

const FALLBACK_BACK = '/learn'

function isAttemptView(value: PracticeAttemptView | PracticeSubmissionResult): value is PracticeAttemptView {
  return 'questions' in value
}

function toPercent(fraction: number) {
  return Math.round(fraction * (fraction <= 1 ? 100 : 1))
}

/** One free practice set on a knowledge point, reached from a card of the knowledge tree. */
export function FreePracticePage() {
  const { attemptId = '' } = useParams()
  const origin = (useLocation().state as FreePracticeNavigationState | null)?.freePractice
  const backTo = origin?.backTo ?? FALLBACK_BACK
  const attempt = useApiResource(`free-practice:${attemptId}`, () => learningApi.getPracticeAttempt(attemptId))
  const hearts = useApiResource('hearts', () => learningApi.getHearts())

  if (attempt.status === 'loading') return <LoadingState label="Đang tải bộ luyện…" />
  if (attempt.error) return <ApiErrorState error={attempt.error} onRetry={attempt.reload} />
  if (!attempt.data) return null

  return (
    <article className="lp-page lp-free-practice" aria-labelledby="lp-free-practice-title">
      <LearnTrail
        items={[
          { label: 'Khóa học', to: '/learn' },
          { label: 'Cây kiến thức', to: backTo },
          { label: origin ? `Luyện · ${origin.pointName}` : 'Luyện tự do' },
        ]}
      />
      <header className="lp-lesson-head">
        <p className="lp-eyebrow">Luyện tự do{origin ? ` · ${origin.pointCode}` : ''}</p>
        <h1 id="lp-free-practice-title">{origin?.pointName ?? 'Bộ luyện tự do'}</h1>
      </header>
      {hearts.data && hearts.data.hearts === 0 ? <HeartsPanel onChanged={hearts.reload} status={hearts.data} /> : null}
      {isAttemptView(attempt.data)
        ? <PracticeSet attempt={attempt.data} backTo={backTo} onHeartsChanged={hearts.reload} origin={origin} />
        : <AlreadySubmitted backTo={backTo} result={attempt.data} />}
    </article>
  )
}

function PracticeSet({ attempt, origin, backTo, onHeartsChanged }: {
  attempt: PracticeAttemptView
  origin: FreePracticeNavigationState['freePractice']
  backTo: string
  onHeartsChanged: () => void
}) {
  const [submission, setSubmission] = useState<PracticeSubmissionResult | null>(null)

  async function submit(answers: AnswerInput[]) {
    try {
      const outcome = await learningApi.submitPracticeAttempt(attempt.attemptId, { requestId: newRequestId(), answers })
      setSubmission(outcome)
      // Wrong answers cost hearts, so what is left has changed.
      if ((outcome.gamification?.heartsLost ?? 0) > 0) onHeartsChanged()
      return {
        passed: outcome.passed,
        percent: toPercent(outcome.percent),
        correctCount: outcome.correct,
        totalCount: outcome.total,
        results: outcome.results,
      }
    } catch (reason) {
      const error = toApiError(reason)
      reportApiError(error)
      if (error.code === 'HEARTS_DEPLETED') onHeartsChanged()
      throw error
    }
  }

  return (
    <section className="lp-split" aria-label="Bộ luyện tự do">
      <div className="lp-split__passage">
        {attempt.audio?.mediaUrl ? <AudioBlock audio={attempt.audio} title="Audio luyện" /> : null}
        {attempt.passage && (attempt.passage.paragraphs.length > 0 || attempt.passage.title)
          ? <PassageBlock passage={attempt.passage} />
          : null}
      </div>
      <div className="lp-split__work">
        <ExerciseBlock
          allowResubmit={false}
          block={toExerciseBlock(attempt, origin)}
          failedFooter={null}
          onSubmit={submit}
        />
        <RewardSummary gamification={submission?.gamification ?? null} />
        {submission ? (
          <section className="lp-complete-bar" aria-label="Sau khi nộp bài">
            <p>
              {submission.passed
                ? 'Bạn đã hoàn thành bộ này. Luyện tự do không tạo bài ôn và không khóa bài học.'
                : 'Bộ này chưa đạt. Luyện tự do không tạo bài ôn và không khóa bài học; bạn có thể chọn một bộ khác.'}
            </p>
            <Button asChild className="lp-btn lp-btn--accent lp-btn--cta">
              <Link to={backTo}><ArrowLeft aria-hidden="true" />Về cây kiến thức</Link>
            </Button>
          </section>
        ) : null}
      </div>
    </section>
  )
}

function AlreadySubmitted({ result, backTo }: { result: PracticeSubmissionResult; backTo: string }) {
  return (
    <section className="lp-done" role="status" aria-labelledby="lp-free-practice-done">
      <div className="lp-done__body">
        <h2 id="lp-free-practice-done">Bộ này đã được nộp</h2>
        <p>Bạn đúng {result.correct}/{result.total} câu ({toPercent(result.percent)}%).</p>
      </div>
      <div className="lp-done__actions">
        <Button asChild className="lp-btn lp-btn--accent lp-btn--cta">
          <Link to={backTo}><ArrowLeft aria-hidden="true" />Về cây kiến thức</Link>
        </Button>
      </div>
    </section>
  )
}

function toExerciseBlock(
  attempt: PracticeAttemptView,
  origin: FreePracticeNavigationState['freePractice'],
): ExerciseBlockData {
  return {
    id: attempt.attemptId,
    sortOrder: 1,
    type: 'EXERCISE',
    title: origin?.pointName ?? 'Bộ luyện tự do',
    instructions: 'Trả lời hết các câu. Kết quả được tính vào mức nắm của điểm kiến thức này.',
    knowledgePointCode: origin?.pointCode ?? '',
    questions: attempt.questions,
    state: 'NOT_ATTEMPTED',
    savedAnswers: null,
    solutions: null,
  }
}
