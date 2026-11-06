import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyActivationDialog } from '@/features/home/components/KeyActivationDialog'
import { POINT_PRODUCTS } from '@/features/home/pricingData'
import { HttpError } from '@/lib/httpClient'
import { GradeMethodDialog } from '../writing/GradeMethodDialog'
import { GradeConfirmDialog, NotEnoughPointsDialog } from '../writing/WritingParts'
import type { GradeDialogCopy } from '../writing/WritingParts'
import { gradeOptions } from '../writing/gradeOptions'
import type { GradeOptions } from '../writing/gradeOptions'
import { useWritingWallet } from '../writing/useWritingWallet'
import type { GradingAccess } from '../writing/useWritingWallet'
import { formatDuration } from '../lib/time'
import { sendSpeakingSubmission } from './sendSpeakingSubmission'
import type { RecordingToSend, SendProgress } from './sendSpeakingSubmission'
import { SpeakingSentDialog } from './SpeakingSentDialog'
import { getSpeakingTerms } from './speakingPracticeApi'
import type { SpeakingTerms } from './speakingPracticeApi'
import { clearSession } from './speakingSession'
import '../writing/writing-workspace.css'
import '../writing/writing-examiner.css'

/** Price shown until the server's terms arrive; the server's figure is the one that is charged. */
export const SPEAKING_AI_POINT_COST = 5
/** The server's limit for one recording, used only if the terms cannot be read. */
const FALLBACK_MAX_RECORDING_BYTES = 10 * 1024 * 1024
const CATALOG_PATH = '/practice-tests?skill=speaking'

export const TEACHER_SOON = 'Giáo viên chấm Speaking sắp có. Hiện bài Speaking được AI chấm.'
export const CONSENT_LABEL = 'Tôi đồng ý gửi bản ghi giọng nói của mình tới dịch vụ nhận dạng giọng nói và mô hình AI để chấm bài.'
const BUSY_PROGRESS = 'Đang gửi bài…'

const METHOD_COPY = {
  description: 'Bài Speaking của bạn có thể được AI hoặc giáo viên chấm. Bạn chọn cách nào cũng được.',
  teacher: 'Giáo viên IELTS nghe bài nói của bạn và nhận xét chi tiết từng tiêu chí.',
  ai: 'AI nghe bài nói, trả band Fluency, Lexical, Grammar, Pronunciation, lỗi cần sửa và gợi ý cải thiện.',
}

const CONFIRM_COPY: GradeDialogCopy = {
  description: 'AI chấm theo 4 tiêu chí IELTS Speaking (Fluency, Lexical, Grammar, Pronunciation) và trả về band, lỗi cần sửa và gợi ý cải thiện.',
  backLabel: 'Quay lại xem lại bài',
  note: 'Point chỉ bị trừ khi AI chấm xong. Nếu AI gặp lỗi, point không bị trừ.',
  busyLabel: 'Đang gửi bài…',
}

type Popup = 'method' | 'confirm' | 'short' | 'sent' | null

/** The two ways to grade, with the teacher closed: there is no teacher grading for Speaking yet. */
function speakingOptions(access: GradingAccess, cost: number, enabled: boolean): GradeOptions {
  const options = gradeOptions({ balance: access.balance, cost, subscription: access.subscription })
  return {
    teacher: { enabled: false, credits: null, reason: TEACHER_SOON },
    ai: enabled ? options.ai : { ...options.ai, enabled: false, shortBy: 0,
      reason: 'Chấm Speaking bằng AI hiện chưa được bật. Vui lòng thử lại sau.' },
  }
}

/** What to tell the learner when sending fails. */
function failureMessage(cause: unknown): string {
  if (cause instanceof HttpError) {
    if (cause.code === 'SPEAKING_SUBMISSION_IN_PROGRESS') {
      return 'Bạn đang có một bài Speaking chờ chấm. Hãy đợi bài đó xong trước khi gửi bài mới.'
    }
    if (cause.isNetworkError) return 'Mất kết nối khi gửi bài. Bản ghi của bạn vẫn còn, hãy bấm gửi lại.'
    return cause.message
  }
  return cause instanceof Error ? cause.message : 'Không gửi được bài. Bản ghi của bạn vẫn còn, hãy thử lại.'
}

/**
 * What "Tiếp tục" does on the Speaking review: read the learner's points, ask who grades, and lead to the confirm popup or,
 * when the points fall short, to the key activation. Confirming sends the answers: the server opens the submission (and
 * checks the points), each answer is converted to WAV and stored, and the submission is completed. A failed send can be
 * repeated: it keeps the same request id, so the server continues the same submission.
 */
export function useSpeakingGradeFlow({ context, packageVersionId, partSectionIds, recordings, seconds, attemptId, onSent }: {
  /** First line of the popups, such as the test and the parts. */
  context: string
  /** The practice test being answered; leave out for the answer of a lesson's practice set (`attemptId`). */
  packageVersionId?: string
  partSectionIds?: string[]
  /** The answers to send, one per question. */
  recordings: RecordingToSend[]
  seconds: number
  /** The lesson's practice attempt the answer belongs to: its grade then counts toward mastery. */
  attemptId?: string
  /** With it, the page follows the submission itself: the "sent" popup is skipped and this gets the submission id. */
  onSent?: (submissionId: string) => void
}): { start: () => void; checking: boolean; dialogs: ReactNode; viewingId: string | null } {
  const navigate = useNavigate()
  const [popup, setPopup] = useState<Popup>(null)
  /** Set when the learner asks for the result: the page then shows it in place instead of leaving for another page. */
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [activationOpen, setActivationOpen] = useState(false)
  const [access, setAccess] = useState<GradingAccess>({ balance: null, subscription: undefined })
  const [terms, setTerms] = useState<SpeakingTerms | null>(null)
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  /** How many answers were sent: the session's recordings are cleared once the send succeeds, so they cannot be counted later. */
  const [sentCount, setSentCount] = useState(0)
  const [consent, setConsent] = useState(false)
  const [sending, setSending] = useState(false)
  const [progress, setProgress] = useState<SendProgress | null>(null)
  const [error, setError] = useState('')
  const requestId = useRef<string | null>(null)
  const wallet = useWritingWallet()
  const cost = terms?.pointCost ?? SPEAKING_AI_POINT_COST
  const options = speakingOptions(access, cost, terms?.enabled !== false)

  function start() {
    if (checking) return
    setChecking(true)
    void Promise.all([wallet.checkAccess(), getSpeakingTerms().catch((): null => null)]).then(([found, loaded]) => {
      setAccess(found)
      setTerms(loaded)
      setPopup('method')
    }).finally(() => setChecking(false))
  }

  function send() {
    if (sending) return
    requestId.current ??= crypto.randomUUID()
    const count = recordings.length
    setSending(true)
    setError('')
    setProgress(null)
    void sendSpeakingSubmission({
      requestId: requestId.current,
      packageVersionId,
      partSectionIds,
      attemptId,
      recordings,
      maxRecordingBytes: terms?.maxRecordingBytes ?? FALLBACK_MAX_RECORDING_BYTES,
      onProgress: setProgress,
    }).then((submission) => {
      requestId.current = null
      setSubmissionId(submission.id)
      setSentCount(count)
      if (packageVersionId) clearSession(packageVersionId)
      if (onSent) { setPopup(null); onSent(submission.id) } else setPopup('sent')
    }).catch((cause: unknown) => {
      if (cause instanceof HttpError && cause.status === 402) {
        // The balance changed since it was read: show the figure the server judged by.
        void wallet.check().then((balance) => setAccess((current) => ({ ...current, balance })))
        setPopup('short')
        return
      }
      setError(failureMessage(cause))
    }).finally(() => setSending(false))
  }

  const dialogs = (
    <>
      {popup === 'method' && (
        <GradeMethodDialog
          options={options}
          context={context}
          copy={METHOD_COPY}
          onClose={() => setPopup(null)}
          onTeacher={() => setPopup(null)}
          onAi={() => setPopup(options.ai.enabled ? 'confirm' : 'short')}
        />
      )}
      {popup === 'confirm' && (
        <GradeConfirmDialog
          busy={sending}
          error={error}
          canGrade={recordings.length > 0}
          copy={CONFIRM_COPY}
          consent={{ label: CONSENT_LABEL, checked: consent, onChange: setConsent }}
          progress={progress ? `Đang gửi bản ghi ${Math.min(progress.done + 1, progress.total)}/${progress.total}…` : BUSY_PROGRESS}
          onGrade={send}
          onClose={() => { setError(''); setPopup(null) }}
          figures={{
            cost,
            balance: access.balance ?? wallet.balance,
            context,
            benefits: ['Band từng tiêu chí và band tổng (điểm ước lượng để luyện tập)', 'Lỗi cần sửa, kèm gợi ý cải thiện', 'Bài luyện tiếp theo cho điểm yếu của bạn'],
            checks: [{ text: `${recordings.length} bản ghi · tổng ${formatDuration(seconds)}`, ok: true }],
          }}
        />
      )}
      {popup === 'short' && (
        <NotEnoughPointsDialog
          cost={cost}
          balance={access.balance ?? wallet.balance}
          copy={{ backLabel: 'Quay lại xem lại bài', kept: 'các bản ghi của bạn vẫn được giữ nguyên' }}
          onClose={() => setPopup(null)}
          onActivate={() => { setPopup(null); setActivationOpen(true) }}
        />
      )}
      {popup === 'sent' && submissionId && (
        <SpeakingSentDialog recorded={sentCount} cost={cost} context={context}
          onClose={() => navigate(CATALOG_PATH)} onViewResult={() => { setPopup(null); setViewingId(submissionId) }} />
      )}
      <KeyActivationDialog
        product={activationOpen ? POINT_PRODUCTS[0] : null}
        isLoggedIn={wallet.isLoggedIn}
        client={wallet.client}
        onClose={() => setActivationOpen(false)}
        onActivated={(result) => {
          wallet.onActivated(result)
          if (result.newBalance !== null) setAccess((current) => ({ ...current, balance: result.newBalance }))
        }}
        returnFocus={() => undefined}
      />
    </>
  )

  return { start, checking, dialogs, viewingId }
}
