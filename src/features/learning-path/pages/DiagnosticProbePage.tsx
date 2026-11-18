import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AnswerInput, DiagnosticProbe, DiagnosticProbeSubmission, ExerciseBlockData } from '~types/learningPath'
import { learningApi, toApiError } from '../api'
import { AudioBlock } from '../components/blocks/AudioBlock'
import { ExerciseBlock, type GradedOutcome } from '../components/blocks/ExerciseBlock'
import { PassageBlock } from '../components/blocks/PassageBlock'
import { LearnTrail } from '../components/LearnTrail'
import { ApiErrorState, PageSkeleton } from '../components/PageState'
import { reviewPath } from '../lib/masteryGuide'
import { newRequestId } from '../lib/requestId'
import { reportApiError } from '../lib/reviewGate'
import { useApiResource } from '../lib/useApiResource'

function toExerciseBlock(probe: DiagnosticProbe): ExerciseBlockData {
  return {
    id: probe.probeId,
    sortOrder: 1,
    type: 'EXERCISE',
    title: 'Kiểm tra kiến thức nền',
    instructions: 'Trả lời các câu dưới đây.',
    knowledgePointCode: '',
    questions: probe.questions,
    state: 'NOT_ATTEMPTED',
    savedAnswers: null,
    solutions: null,
  }
}

function toOutcome(submission: DiagnosticProbeSubmission): GradedOutcome {
  return {
    passed: submission.passed,
    percent: submission.total === 0 ? 0 : Math.round((submission.correct / submission.total) * 100),
    correctCount: submission.correct,
    totalCount: submission.total,
    results: submission.results,
  }
}

/** One probe of a prerequisite diagnosis. The learner answers once; the result and solutions show afterwards. */
export function DiagnosticProbePage() {
  const { reviewId = '', sessionId = '', probeId = '' } = useParams()
  const resource = useApiResource(`probe:${sessionId}:${probeId}`, () => learningApi.getDiagnosticProbe(sessionId, probeId))
  const [submission, setSubmission] = useState<DiagnosticProbeSubmission | null>(null)
  const backToReview = reviewPath(reviewId)

  if (resource.status === 'loading') return <PageSkeleton label="Đang tải bài kiểm tra…" variant="article" />
  if (resource.status === 'error' && resource.error) return <ApiErrorState error={resource.error} onRetry={resource.reload} />
  if (!resource.data) return null
  const probe = resource.data

  async function submit(answers: AnswerInput[]): Promise<GradedOutcome> {
    try {
      const outcome = await learningApi.submitDiagnosticProbe(sessionId, probeId, { requestId: newRequestId(), answers })
      setSubmission(outcome)
      return toOutcome(outcome)
    } catch (reason) {
      const error = toApiError(reason)
      reportApiError(error)
      // A closed probe has nothing left to answer: reload shows its current state.
      if (error.code === 'PROBE_CLOSED') resource.reload()
      throw error
    }
  }

  return (
    <article aria-labelledby="lp-probe-title" className="lp-page lp-review-page">
      <LearnTrail
        items={[
          { label: 'Khóa học', to: '/learn' },
          { label: 'Bài ôn', to: backToReview },
          { label: 'Kiểm tra kiến thức nền' },
        ]}
      />
      <header className="lp-review-head">
        <p className="lp-eyebrow">Kiểm tra kiến thức nền</p>
        <h1 id="lp-probe-title">Bài kiểm tra ngắn</h1>
      </header>

      {probe.status !== 'OPEN' ? (
        <section className="lp-done" role="status">
          <div className="lp-done__body">
            <h2>Bài kiểm tra này không còn mở</h2>
            <p>Bạn có thể quay lại bài ôn để xem bước tiếp theo.</p>
          </div>
          <div className="lp-done__actions">
            <Button asChild className="lp-btn lp-btn--accent"><Link to={backToReview}>Về bài ôn</Link></Button>
          </div>
        </section>
      ) : (
        <section className="lp-split" aria-label="Câu hỏi kiểm tra">
          <div className="lp-split__passage">
            {probe.audio?.mediaUrl ? <AudioBlock audio={probe.audio} title="Audio kiểm tra" /> : null}
            {probe.passage.paragraphs.length > 0 || probe.passage.title ? <PassageBlock passage={probe.passage} /> : null}
          </div>
          <div className="lp-split__work">
            <ExerciseBlock allowResubmit={false} block={toExerciseBlock(probe)} onSubmit={submit} />
            {submission ? (
              <div className="lp-review-retry">
                <p>
                  {submission.sessionStatus === 'CONCLUDED'
                    ? 'Đã có kết luận từ các bài kiểm tra. Quay lại bài ôn để tiếp tục.'
                    : 'Quay lại bài ôn để làm bài kiểm tra tiếp theo, nếu còn.'}
                </p>
                <Button asChild className="lp-btn lp-btn--accent">
                  <Link to={backToReview}><ArrowLeft aria-hidden="true" size={15} />Quay lại bài ôn</Link>
                </Button>
              </div>
            ) : null}
          </div>
        </section>
      )}
    </article>
  )
}
