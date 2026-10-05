import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { CheckCircle2, Loader2, PenLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { EssayBlockData, WritingSubmissionResult } from '~types/learningPath'
import { toApiError } from '../../api/apiError'
import { StatusBadge } from '../StatusBadge'

interface EssayBlockProps {
  block: EssayBlockData
  pointsBalance: number
  onSubmit: (essayText: string) => Promise<WritingSubmissionResult>
}

const PASSED_META = { label: 'Đã đạt', tone: 'success', icon: CheckCircle2 } as const
const POINT_COST = 3

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function EssayBlock({ block, pointsBalance, onSubmit }: EssayBlockProps) {
  const titleId = useId()
  const [text, setText] = useState('')
  const [result, setResult] = useState<WritingSubmissionResult | null>(
    block.latestSubmission?.status === 'GRADED'
      ? {
          submissionId: block.latestSubmission.id,
          status: 'GRADED',
          overallBand: block.latestSubmission.overallBand,
          passed: block.latestSubmission.passed,
          sampleAnswer: block.sampleAnswer,
        }
      : null,
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const words = countWords(text)
  const passed = result?.passed === true
  const canSubmit = !passed && !submitting && words >= Math.max(block.minWords, 50) && words <= 1000

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (inFlight.current || !canSubmit) return
    if (pointsBalance < POINT_COST) {
      setError(`Không đủ điểm. Cần ${POINT_COST} điểm để chấm bài (hiện có ${pointsBalance}).`)
      return
    }
    inFlight.current = true
    setSubmitting(true)
    setError(null)
    try {
      const outcome = await onSubmit(text)
      if (mounted.current) setResult(outcome)
    } catch (reason) {
      const apiError = toApiError(reason)
      if (mounted.current) {
        if (apiError.code === 'INSUFFICIENT_POINTS') setError('Không đủ điểm để chấm bài luận.')
        else if (apiError.code === 'GRADING_UNAVAILABLE') setError('Hệ thống chấm bài tạm thời không khả dụng. Thử lại sau.')
        else if (apiError.code === 'DAILY_LIMIT_REACHED') setError('Bạn đã hết hạn mức chấm bài trong ngày.')
        else setError(`${apiError.message} Hãy thử lại.`)
      }
    } finally {
      inFlight.current = false
      if (mounted.current) setSubmitting(false)
    }
  }

  return (
    <form aria-labelledby={titleId} className={`lp-essay${passed ? ' is-passed' : ''}`} noValidate onSubmit={handleSubmit}>
      <header className="lp-exercise__head">
        <div>
          <p className="lp-eyebrow"><PenLine aria-hidden="true" size={14} /> Writing · Task {block.task.replace('TASK_', '')}</p>
          <h3 id={titleId}>{block.title}</h3>
          <p>{block.stem}</p>
          <p className="lp-essay__meta">Tối thiểu {block.minWords} từ · đạt từ band {block.passBand} · mỗi lần chấm tốn {POINT_COST} điểm (còn {pointsBalance})</p>
        </div>
        {passed ? <StatusBadge meta={PASSED_META} /> : null}
      </header>

      {block.images.length > 0 ? (
        <div className="lp-essay__images">
          {block.images.map((image) => (
            <img alt={image.altText || 'Biểu đồ đề bài'} key={image.mediaUrl} src={image.mediaUrl} />
          ))}
        </div>
      ) : null}

      {!passed ? (
        <>
          <label className="lp-essay__label" htmlFor={`${block.id}-essay`}>Bài làm của bạn</label>
          <textarea
            className="lp-essay__input"
            disabled={submitting}
            id={`${block.id}-essay`}
            onChange={(event) => setText(event.target.value)}
            placeholder="Viết bài luận tại đây…"
            rows={12}
            value={text}
          />
          <p className="lp-essay__words">{words} từ</p>
          {error ? <p className="lp-error" role="alert">{error}</p> : null}
          <Button className="lp-btn" disabled={!canSubmit} type="submit">
            {submitting ? <Loader2 aria-hidden="true" className="lp-spin" /> : <PenLine aria-hidden="true" />}
            {submitting ? 'Đang chấm (có thể 10–45 giây)…' : `Nộp bài · ${POINT_COST} điểm`}
          </Button>
          <p className="lp-essay__disclaimer">Band là ước lượng AI, không phải điểm IELTS chính thức.</p>
        </>
      ) : null}

      {result?.status === 'GRADED' ? (
        <div className="lp-essay__result" role="status">
          <p><strong>Band ước lượng:</strong> {result.overallBand ?? '—'} {result.passed ? '· Đạt' : '· Chưa đạt'}</p>
          {result.summary ? <p>{result.summary}</p> : null}
          {result.criteria?.length ? (
            <ul className="lp-essay__criteria">
              {result.criteria.map((criterion) => (
                <li key={criterion.code}>
                  <strong>{criterion.code}</strong> {criterion.band}
                  {criterion.improvements?.[0] ? ` — ${criterion.improvements[0]}` : ''}
                </li>
              ))}
            </ul>
          ) : null}
          {result.corrections?.length ? (
            <ul className="lp-essay__corrections">
              {result.corrections.slice(0, 5).map((correction) => (
                <li key={`${correction.excerpt}-${correction.suggestion}`}>
                  <s>{correction.excerpt}</s> → {correction.suggestion}
                </li>
              ))}
            </ul>
          ) : null}
          {(result.sampleAnswer || block.sampleAnswer) ? (
            <details>
              <summary>Bài mẫu</summary>
              <p>{result.sampleAnswer || block.sampleAnswer}</p>
            </details>
          ) : null}
        </div>
      ) : null}
    </form>
  )
}

export default EssayBlock
