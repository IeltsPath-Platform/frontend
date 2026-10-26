import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HttpError } from '@/lib/httpClient'
import { submitToExaminer } from './examinerApi'
import type { WritingMode, WritingTask } from './writingApi'
import { clearDraft, storeResultContext } from './writingText'

const ERRORS: Record<string, string> = {
  ESSAY_EMPTY: 'Bài viết đang trống.',
  ESSAY_TOO_SHORT: 'Bài viết còn quá ngắn để gửi giáo viên chấm.',
  ESSAY_TOO_LONG: 'Bài viết quá dài để chấm.',
  HUMAN_GRADING_CREDIT_REQUIRED: 'Gói Premium của bạn đã hết lượt giáo viên chấm, hoặc đã hết hạn.',
  EXAMINER_UNAVAILABLE: 'Giáo viên này vừa đủ bài hôm nay hoặc đang tắt nhận bài. Hãy chọn giáo viên khác.',
  HUMAN_REVIEW_UNAVAILABLE: 'Chưa gửi được cho giáo viên, lượt chấm của bạn chưa bị trừ. Hãy thử lại sau.',
  USER_SERVICE_UNAVAILABLE: 'Chưa kiểm tra được giáo viên. Hãy thử lại sau.',
  EXAMINER_REVIEW_PENDING: 'Bài này đã gửi giáo viên và đang chờ chấm, nên chưa gửi lại được. Bạn gửi lại được sau khi giáo viên chấm xong; lượt chấm của bạn không bị trừ thêm.',
}

/** The essay that still waits for its teacher, when the server refused because of it. */
export function pendingSubmissionOf(cause: unknown): string | null {
  if (!(cause instanceof HttpError) || cause.code !== 'EXAMINER_REVIEW_PENDING') return null
  const id = (cause.body as { submissionId?: unknown } | null)?.submissionId
  return typeof id === 'string' ? id : null
}

/** What to tell the learner when sending the essay to an examiner did not work. */
export function examinerSubmitMessage(cause: unknown) {
  if (!(cause instanceof HttpError)) return 'Chưa gửi được bài cho giáo viên. Hãy thử lại.'
  if (cause.status === 402) return ERRORS.HUMAN_GRADING_CREDIT_REQUIRED
  return ERRORS[cause.code ?? ''] ?? cause.message
}

/** Sending the essay to the examiner the learner chose, in place of the AI grade. No points are involved. */
export function useExaminerSubmission({ task, mode, draftKey, essay, seconds, retryPath }: {
  task: WritingTask
  mode: WritingMode
  draftKey: string
  essay: string
  seconds: number
  retryPath: string
}) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pendingId, setPendingId] = useState<string | null>(null)
  // One id per essay text: sending the same essay again, to the same or another examiner, continues the same essay.
  const request = useRef<{ essay: string; id: string } | null>(null)

  async function send(examinerId: string) {
    if (busy) return
    if (request.current?.essay !== essay) request.current = { essay, id: crypto.randomUUID() }
    setBusy(true)
    setError('')
    try {
      const result = await submitToExaminer({
        requestId: request.current.id, packageVersionId: task.packageVersionId,
        questionVersionId: task.questionVersionId, essayText: essay, examinerId,
      })
      storeResultContext(result.submissionId, { seconds, timeLimitSeconds: task.timeLimitSeconds, title: task.title, mode, retryPath })
      clearDraft(draftKey)
      void navigate(`/practice/writing/submissions/${result.submissionId}/result`, { replace: true })
    } catch (cause) {
      setPendingId(pendingSubmissionOf(cause))
      setError(examinerSubmitMessage(cause))
      setBusy(false)
    }
  }

  return { busy, error, pendingId, clearError: () => setError(''), send }
}
