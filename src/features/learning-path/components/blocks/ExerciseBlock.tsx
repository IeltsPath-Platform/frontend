import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { CheckCircle2, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/toast/toastContext'
import type { ToastOptions } from '@/components/toast/toastContext'
import type { AnswerInput, AnswerMap, ExerciseBlockData, QuestionResult } from '~types/learningPath'
import { toApiError, userMessage } from '../../api/apiError'
import { StatusBadge } from '../StatusBadge'
import { QuestionField } from './QuestionField'

export interface GradedOutcome {
  passed: boolean
  percent: number
  correctCount: number
  totalCount: number
  results: QuestionResult[]
}

interface ExerciseBlockProps {
  block: ExerciseBlockData
  onSubmit: (answers: AnswerInput[]) => Promise<GradedOutcome>
  /** Lesson blocks can be resubmitted; a review set closes after one submission. */
  allowResubmit?: boolean
  failedFooter?: ReactNode
}

interface Graded {
  outcome: GradedOutcome
  answers: AnswerMap
}

const PASSED_META = { label: 'Đã đạt', tone: 'success', icon: CheckCircle2 } as const

function initialGraded(block: ExerciseBlockData): Graded | null {
  if (block.state !== 'PASSED' || !block.solutions || !block.savedAnswers) return null
  const correctCount = block.solutions.filter((result) => result.correct).length
  const totalCount = block.questions.length
  return {
    answers: block.savedAnswers,
    outcome: { passed: true, correctCount, totalCount, percent: Math.round((correctCount / totalCount) * 100), results: block.solutions },
  }
}

/** Display only: the server decides `passed`. Mirrors the 70% bar so the learner sees how far off they were. */
const PASS_PERCENT = 70
const VERDICT_TOAST_MS = 6000

/** The grade of one submission, reported as a toast: the score, the verdict and which questions were wrong. */
function verdictToast(outcome: GradedOutcome, questions: ExerciseBlockData['questions'], allowResubmit: boolean): ToastOptions {
  const { passed, correctCount, totalCount, percent, results } = outcome
  const correctById = new Map(results.map((result) => [result.questionId, result.correct]))
  const title = `${passed ? 'Đã đạt' : 'Chưa đạt'}: ${correctCount}/${totalCount} câu đúng`
  if (passed) {
    return { title, description: 'Đáp án và giải thích hiện dưới từng câu.', tone: 'success', duration: VERDICT_TOAST_MS }
  }
  const needed = Math.ceil((totalCount * PASS_PERCENT) / 100)
  const wrongNumbers = questions.filter((question) => !correctById.get(question.id)).map((question) => question.number)
  const parts = [`${percent}% số câu đúng, cần từ ${PASS_PERCENT}% (${needed}/${totalCount} câu).`]
  if (wrongNumbers.length > 0) parts.push(`Sai: câu ${wrongNumbers.join(', ')}.`)
  if (allowResubmit) parts.push('Sửa các câu sai rồi nộp lại.')
  return { title, description: parts.join(' '), tone: 'error', duration: VERDICT_TOAST_MS }
}

export function ExerciseBlock({ block, onSubmit, allowResubmit = true, failedFooter }: ExerciseBlockProps) {
  const titleId = useId()
  const { toast } = useToast()
  const [answers, setAnswers] = useState<AnswerMap>(block.savedAnswers ?? {})
  const [graded, setGraded] = useState<Graded | null>(() => initialGraded(block))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)
  const mounted = useRef(true)
  // Strict Mode re-runs effect cleanup+setup on the same instance; reset so async
  // submit can still update UI after the simulated cleanup.
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const passed = graded?.outcome.passed === true
  const closed = passed || (graded !== null && !allowResubmit)
  const unanswered = block.questions.filter((question) => !(answers[question.id] ?? '').trim()).length
  const canSubmit = !closed && !submitting && unanswered === 0
  const results = new Map(graded?.outcome.results.map((result) => [result.questionId, result]))

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inFlight.current || !canSubmit) return
    inFlight.current = true
    setSubmitting(true)
    setError(null)
    const snapshot = { ...answers }
    try {
      const outcome = await onSubmit(block.questions.map((question) => ({ questionId: question.id, answer: snapshot[question.id].trim() })))
      if (mounted.current) {
        setGraded({ outcome, answers: snapshot })
        toast(verdictToast(outcome, block.questions, allowResubmit))
      }
    } catch (reason) {
      if (mounted.current) {
        const apiError = toApiError(reason)
        // Out of hearts or a review owed: retrying at once changes nothing, so the message says what to do instead.
        const noRetry = apiError.code === 'HEARTS_DEPLETED' || apiError.code === 'REVIEW_REQUIRED'
        setError(noRetry ? userMessage(apiError) : `${apiError.message} Hãy thử nộp lại.`)
      }
    } finally {
      inFlight.current = false
      if (mounted.current) setSubmitting(false)
    }
  }

  function restart() {
    setAnswers({})
    setGraded(null)
  }

  return (
    <form aria-labelledby={titleId} className={`lp-exercise${passed ? ' is-passed' : ''}`} noValidate onSubmit={handleSubmit}>
      <header className="lp-exercise__head">
        <div>
          <p className="lp-eyebrow">Bài tập</p>
          <h3 id={titleId}>{block.title}</h3>
        </div>
        {passed ? <StatusBadge meta={PASSED_META} /> : null}
      </header>
      <p className="lp-exercise__instructions">{block.instructions}</p>
      <ol className="lp-questions">
        {block.questions.map((question) => {
          const result = results.get(question.id)
          const stillGraded = result && graded?.answers[question.id] === answers[question.id]
          return (
            <li key={question.id}>
              <QuestionField
                disabled={closed || submitting}
                onChange={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))}
                question={question}
                result={stillGraded ? result : undefined}
                value={answers[question.id] ?? ''}
              />
            </li>
          )
        })}
      </ol>
      <footer className="lp-exercise__foot">
        {error ?<p className="lp-error" role="alert">{error}</p> : null}
        {!closed ? (
          <div className="lp-exercise__actions">
            <Button className="lp-btn" disabled={!canSubmit} type="submit">
              {submitting ? <Loader2 aria-hidden="true" className="lp-spin" /> : null}
              {submitting ? 'Đang nộp…' : graded ? 'Nộp lại' : 'Nộp'}
            </Button>
            {graded ? <Button className="lp-btn" onClick={restart} type="button" variant="outline"><RotateCcw aria-hidden="true" />Làm lại từ đầu</Button> : null}
            {unanswered > 0 ? <span className="lp-hint">Còn {unanswered} câu chưa trả lời</span> : null}
          </div>
        ) : null}
        {graded && !passed && !allowResubmit ? failedFooter : null}
      </footer>
    </form>
  )
}
