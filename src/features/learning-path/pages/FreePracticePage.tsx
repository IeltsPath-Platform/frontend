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
import { LearnTrail, type TrailItem } from '../components/LearnTrail'
import { PracticeAttemptReview } from '../components/PracticeAttemptReview'
import { ApiErrorState, LoadingState } from '../components/PageState'
import { RewardSummary } from '../components/RewardSummary'
import { newRequestId } from '../lib/requestId'
import { HISTORY_PATH, historyTrail, readOrigin } from '../lib/resultOrigin'
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

/**
 * The trail follows where the learner came from. From the knowledge tree it is Khóa học › Cây kiến thức; from "Lịch sử nộp bài"
 * it is Trang chủ › Lịch sử nộp bài (the tab they were on); from the result of an essay it is that list, then the result.
 */
function trailOf(origin: FreePracticeNavigationState['freePractice'], backTo: string, backLabel: string): TrailItem[] {
  const current = origin ? `Luyện · ${origin.pointName}` : 'Luyện tự do'
  if (origin?.backLabel) {
    if (backTo === HISTORY_PATH || backTo.startsWith(`${HISTORY_PATH}?`)) return historyTrail(current, { to: backTo })
    return historyTrail(current, readOrigin(new URL(backTo, 'http://local').search), [{ label: backLabel, to: backTo }])
  }
  return [{ label: 'Khóa học', to: '/learn' }, { label: backLabel, to: backTo }, { label: current }]
}

/** One free practice set on a knowledge point, reached from a card of the knowledge tree, an essay's result or the history. */
export function FreePracticePage() {
  const { attemptId = '' } = useParams()
  const origin = (useLocation().state as FreePracticeNavigationState | null)?.freePractice
  const backTo = origin?.backTo ?? FALLBACK_BACK
  const backLabel = origin?.backLabel ?? 'Cây kiến thức'
  const attempt = useApiResource(`free-practice:${attemptId}`, () => learningApi.getPracticeAttempt(attemptId))

  if (attempt.status === 'loading') return <LoadingState label="Đang tải bộ luyện…" />
  if (attempt.error) return <ApiErrorState error={attempt.error} onRetry={attempt.reload} />
  if (!attempt.data) return null

  return (
    <article className="lp-page lp-free-practice" aria-labelledby="lp-free-practice-title">
      <LearnTrail items={trailOf(origin, backTo, backLabel)} />
      <header className="lp-lesson-head">
        <p className="lp-eyebrow">Luyện tự do{origin ? ` · ${origin.pointCode}` : ''}</p>
        <h1 id="lp-free-practice-title">{origin?.pointName ?? 'Bộ luyện tự do'}</h1>
      </header>
      {isAttemptView(attempt.data)
        ? <PracticeSet attempt={attempt.data} backLabel={backLabel} backTo={backTo} origin={origin} />
        : <PracticeAttemptReview attemptId={attemptId} />}
    </article>
  )
}

function PracticeSet({ attempt, origin, backTo, backLabel }: {
  attempt: PracticeAttemptView
  origin: FreePracticeNavigationState['freePractice']
  backTo: string
  backLabel: string
}) {
  const [submission, setSubmission] = useState<PracticeSubmissionResult | null>(null)

  async function submit(answers: AnswerInput[]) {
    try {
      const outcome = await learningApi.submitPracticeAttempt(attempt.attemptId, { requestId: newRequestId(), answers })
      setSubmission(outcome)
      return {
        passed: outcome.passed,
        percent: toPercent(outcome.percent),
        correctCount: outcome.correct,
        totalCount: outcome.total,
        results: outcome.results,
      }
    } catch (reason) {
      const error = toApiError(reason)
      // A refusal for lack of hearts opens the owl's popup from here.
      reportApiError(error)
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
              <Link to={backTo}><ArrowLeft aria-hidden="true" />{backText(backLabel)}</Link>
            </Button>
          </section>
        ) : null}
      </div>
    </section>
  )
}

/** "Về cây kiến thức", or "Về kết quả bài viết" for the screen the learner came from. */
function backText(backLabel: string) {
  return `Về ${backLabel.charAt(0).toLocaleLowerCase('vi')}${backLabel.slice(1)}`
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
