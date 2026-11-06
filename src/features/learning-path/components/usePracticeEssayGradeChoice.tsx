import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ExaminerPickDialog } from '@/features/practice/writing/ExaminerPickDialog'
import { GradeMethodDialog } from '@/features/practice/writing/GradeMethodDialog'
import { gradeOptions } from '@/features/practice/writing/gradeOptions'
import { getGradingTerms } from '@/features/practice/writing/writingApi'
import { useWritingWallet, type GradingAccess } from '@/features/practice/writing/useWritingWallet'
import '@/features/practice/writing/writing-workspace.css'
import { learningApi, toApiError, userMessage } from '../api'
import { newRequestId } from '../lib/requestId'

/** The grading terms until the server answers: the same cost and length the server applies by default. */
const FALLBACK_TERMS = { pointCost: 3, minWords: 50 }

/** What to tell the learner when the essay could not be sent to the examiner; nothing is spent on any of these. */
function examinerMessage(cause: unknown): string {
  const error = toApiError(cause)
  if (error.status === 402) return 'Gói Premium của bạn đã hết lượt giáo viên chấm, hoặc đã hết hạn.'
  switch (error.code) {
    case 'EXAMINER_UNAVAILABLE':
      return 'Giáo viên này vừa đủ bài hôm nay, đang tắt nhận bài hoặc tạm chưa nhận bài mới. Hãy chọn giáo viên khác.'
    case 'EXAMINER_REVIEW_PENDING':
      return 'Bài này đã gửi giáo viên và đang chờ chấm, nên chưa gửi lại được.'
    case 'ESSAY_ALREADY_GRADED':
      return 'Bài này đã được AI chấm nên không gửi lại cho giáo viên như một bài mới.'
    case 'HUMAN_REVIEW_UNAVAILABLE':
      return 'Chưa gửi được cho giáo viên, lượt chấm của bạn chưa bị trừ. Hãy thử lại sau.'
    case 'USER_SERVICE_UNAVAILABLE':
      return 'Chưa kiểm tra được giáo viên. Hãy thử lại sau.'
    default:
      return userMessage(error)
  }
}

/**
 * "Nộp để chấm" of a Practice essay asks who grades it, as the Writing practice does: the AI (points, a grade in seconds)
 * or a teacher the learner picks (one Premium credit, up to 48 hours). The teacher's grade counts toward the learner's
 * mastery when it comes back, so an essay sent to a teacher is not graded by the AI as well.
 */
export function usePracticeEssayGradeChoice({ attemptId, questionVersionId, essayText, words, context, onAi, onSent }: {
  attemptId: string
  questionVersionId: string
  essayText: string
  words: number
  /** The line under the title of the choice, such as "Đề viết · Task 1 · Luyện tập bài học". */
  context: string
  onAi: () => void
  onSent: (submissionId: string) => void
}): { open: () => void; checking: boolean; dialogs: ReactNode } {
  const wallet = useWritingWallet()
  const [popup, setPopup] = useState<'method' | 'examiner' | null>(null)
  const [access, setAccess] = useState<GradingAccess>({ balance: null, subscription: undefined })
  const [terms, setTerms] = useState(FALLBACK_TERMS)
  const [checking, setChecking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // One id per essay text: sending the same text again, to the same or another teacher, continues the same essay.
  const request = useRef<{ text: string; id: string } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    void getGradingTerms(controller.signal)
      .then((found) => { if (!controller.signal.aborted) setTerms(found) })
      .catch(() => undefined)
    return () => controller.abort()
  }, [])

  function open() {
    if (checking) return
    setChecking(true)
    void wallet.checkAccess().then((found) => {
      setAccess(found)
      setPopup('method')
    }).finally(() => setChecking(false))
  }

  async function send(examinerId: string) {
    if (busy) return
    if (request.current?.text !== essayText) request.current = { text: essayText, id: newRequestId() }
    setBusy(true)
    setError('')
    try {
      const sent = await learningApi.submitPracticeEssayToExaminer(attemptId, questionVersionId, {
        requestId: request.current.id, essayText, examinerId,
      })
      setPopup(null)
      onSent(sent.submissionId)
    } catch (cause) {
      setError(examinerMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  const options = gradeOptions({ balance: access.balance, cost: terms.pointCost, subscription: access.subscription })
  const close = () => { setError(''); setPopup(null) }

  const dialogs = (
    <>
      {popup === 'method' && (
        <GradeMethodDialog
          options={options}
          context={context}
          onClose={close}
          onTeacher={() => setPopup('examiner')}
          onAi={() => { setPopup(null); onAi() }}
        />
      )}
      {popup === 'examiner' && (
        <ExaminerPickDialog
          words={words}
          minWords={terms.minWords}
          busy={busy}
          error={error}
          onSend={(examinerId) => void send(examinerId)}
          onBack={() => { setError(''); setPopup('method') }}
          onClose={close}
        />
      )}
    </>
  )

  return { open, checking, dialogs }
}
