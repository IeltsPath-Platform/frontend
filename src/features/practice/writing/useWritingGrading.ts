import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HttpError } from '@/lib/httpClient'
import { getGradingTerms, submitFreeWriting } from './writingApi'
import type { GradingTerms, WritingMode, WritingTask } from './writingApi'
import { clearDraft, storeResultContext } from './writingText'

const ERRORS: Record<string, string> = {
  ESSAY_EMPTY: 'Bài viết đang trống.',
  ESSAY_TOO_SHORT: 'Bài viết còn quá ngắn để chấm.',
  ESSAY_TOO_LONG: 'Bài viết quá dài để chấm.',
  GRADING_UNAVAILABLE: 'Hệ thống chấm bài đang bận, point chưa bị trừ. Hãy thử lại sau.',
  GRADING_IN_PROGRESS: 'Bài này đang được chấm. Hãy đợi trong giây lát.',
  DAILY_LIMIT_REACHED: 'Bạn đã dùng hết số lần chấm bài trong hôm nay.',
  PAYMENT_UNAVAILABLE: 'Chưa thanh toán được point. Hãy thử lại sau.',
}

/**
 * Sending the essay to the AI grader: the confirm step, the cost, and what to show when it goes wrong. `terms` stays null
 * until the server has sent them: the price is never guessed.
 */
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
  const [terms, setTerms] = useState<GradingTerms | null>(null)
  const [termsLoading, setTermsLoading] = useState(true)
  const [grading, setGrading] = useState(false)
  const [error, setError] = useState('')
  // One id per essay text: a resend of the same essay continues the same grading instead of paying twice.
  const request = useRef<{ essay: string; id: string } | null>(null)

  const loadTerms = useCallback((signal?: AbortSignal) => getGradingTerms(signal)
    .then((found) => { if (!signal?.aborted) setTerms(found) })
    .catch(() => undefined)
    .finally(() => { if (!signal?.aborted) setTermsLoading(false) }), [])

  useEffect(() => {
    const controller = new AbortController()
    void loadTerms(controller.signal)
    return () => controller.abort()
  }, [loadTerms])

  function reloadTerms() {
    setTermsLoading(true)
    void loadTerms()
  }

  async function grade() {
    if (grading || !terms) return
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

  return { terms, termsLoading, reloadTerms, grading, error, clearError: () => setError(''), grade }
}
