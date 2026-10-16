import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HttpError } from '@/lib/httpClient'
import { getGradingTerms, submitFreeWriting } from './writingApi'
import type { GradingTerms, WritingMode, WritingTask } from './writingApi'
import { clearDraft, storeResultContext } from './writingText'

const FALLBACK_TERMS: GradingTerms = { pointCost: 3, minWords: 50, maxWords: 1000 }

const ERRORS: Record<string, string> = {
  ESSAY_EMPTY: 'Bài viết đang trống.',
  ESSAY_TOO_SHORT: 'Bài viết còn quá ngắn để chấm.',
  ESSAY_TOO_LONG: 'Bài viết quá dài để chấm.',
  GRADING_UNAVAILABLE: 'Hệ thống chấm bài đang bận, point chưa bị trừ. Hãy thử lại sau.',
  GRADING_IN_PROGRESS: 'Bài này đang được chấm. Hãy đợi trong giây lát.',
  DAILY_LIMIT_REACHED: 'Bạn đã dùng hết số lần chấm bài trong hôm nay.',
  PAYMENT_UNAVAILABLE: 'Chưa thanh toán được point. Hãy thử lại sau.',
}

/** Sending the essay to the AI grader: the confirm step, the cost, and what to show when it goes wrong. */
export function useWritingGrading({ task, mode, draftKey, essay, seconds, retryPath, onPointsShort }: {
  task: WritingTask
  mode: WritingMode
  draftKey: string
  essay: string
  seconds: number
  retryPath: string
  /** Called when the grader refused because the balance is under the cost. */
  onPointsShort: () => void
}) {
  const navigate = useNavigate()
  const [terms, setTerms] = useState<GradingTerms>(FALLBACK_TERMS)
  const [grading, setGrading] = useState(false)
  const [error, setError] = useState('')
  // One id per essay text: a resend of the same essay continues the same grading instead of paying twice.
  const request = useRef<{ essay: string; id: string } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    void getGradingTerms(controller.signal).then(setTerms).catch(() => undefined)
    return () => controller.abort()
  }, [])

  async function grade() {
    if (grading) return
    if (request.current?.essay !== essay) request.current = { essay, id: crypto.randomUUID() }
    setGrading(true)
    setError('')
    try {
      const result = await submitFreeWriting({
        requestId: request.current.id, packageVersionId: task.packageVersionId,
        questionVersionId: task.questionVersionId, essayText: essay,
      })
      storeResultContext(result.submissionId, { seconds, timeLimitSeconds: task.timeLimitSeconds, title: task.title, mode, retryPath })
      clearDraft(draftKey)
      void navigate(`/practice/writing/submissions/${result.submissionId}/result`, { replace: true })
    } catch (cause) {
      if (cause instanceof HttpError && (cause.status === 402 || cause.code === 'INSUFFICIENT_POINTS')) onPointsShort()
      else setError(cause instanceof HttpError ? ERRORS[cause.code ?? ''] ?? cause.message : 'Chưa chấm được bài. Hãy thử lại.')
      setGrading(false)
    }
  }

  return { terms, grading, error, clearError: () => setError(''), grade }
}
