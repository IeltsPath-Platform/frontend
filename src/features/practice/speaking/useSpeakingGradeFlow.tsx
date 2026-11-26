import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { KeyActivationDialog } from '@/features/home/components/KeyActivationDialog'
import { POINT_PRODUCTS } from '@/features/home/pricingData'
import { HttpError } from '@/lib/httpClient'
import { isEntitlementUnavailable, isPremiumRequired } from '../lib/premiumErrors'
import { useToast } from '@/components/toast/toastContext'
import { PremiumUpgradeDialog } from '../components/PremiumUpgradeDialog'
import { GradeConfirmDialog, NotEnoughPointsDialog } from '../writing/WritingParts'
import type { GradeDialogCopy } from '../writing/WritingParts'
import { hasActivePremium } from '../writing/gradeOptions'
import { useWritingWallet } from '../writing/useWritingWallet'
import type { GradingAccess } from '../writing/useWritingWallet'
import { formatDuration } from '../lib/time'
import { sendSpeakingSubmission } from './sendSpeakingSubmission'
import type { RecordingToSend, SendProgress } from './sendSpeakingSubmission'
import { SpeakingSendDialog } from './SpeakingSendDialog'
import { getSpeakingTerms } from './speakingPracticeApi'
import type { SpeakingSubmission, SpeakingTerms } from './speakingPracticeApi'
import { clearSession } from './speakingSession'
import '../writing/writing-workspace.css'
import '../writing/writing-examiner.css'

export const CONSENT_LABEL = 'Tôi đồng ý gửi bản ghi giọng nói của mình tới dịch vụ nhận dạng giọng nói và mô hình AI để chấm bài.'
const BUSY_PROGRESS = 'Đang gửi bài…'
const DISABLED = 'Chấm Speaking bằng AI hiện chưa được bật. Vui lòng thử lại sau.'

const CONFIRM_COPY: GradeDialogCopy = {
  description: 'AI chấm theo 4 tiêu chí IELTS Speaking (Fluency, Lexical, Grammar, Pronunciation) và trả về band, lỗi cần sửa và gợi ý cải thiện.',
  backLabel: 'Quay lại xem lại bài',
  note: 'Point chỉ bị trừ khi AI chấm xong. Nếu AI gặp lỗi, point không bị trừ.',
}

const PREMIUM_CONFIRM_COPY: GradeDialogCopy = { ...CONFIRM_COPY, note: 'Giữ trang này mở cho đến khi bài được nhận.' }

type Popup = 'terms' | 'confirm' | 'short' | 'sent' | null

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
 * What "Tiếp tục" does on the Speaking review. The AI is the only grader, so there is nothing to choose: a learner with
 * enough points gets the confirm popup with the cost and what will be left, one who is short gets the key activation, and a
 * Premium learner gets the confirm popup with no points on it. Confirming sends the answers while the popup stays up: the
 * server opens the submission (and checks the points), each answer is converted to WAV and stored, and the submission is
 * completed. The popup then says the work was received, and going on leads to the grading. A failed send brings the confirm
 * popup back with the reason and can be repeated: it keeps the same request id, so the server continues the same
 * submission.
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
  /** With it, the page follows the submission itself and this gets the submission id; without it, see `viewingId`. */
  onSent?: (submissionId: string) => void
}): { start: () => void; checking: boolean; dialogs: ReactNode; viewingId: string | null } {
  const [popup, setPopup] = useState<Popup>(null)
  /** The submission the server took, until the learner goes on from the popup that says so. */
  const [sent, setSent] = useState<SpeakingSubmission | null>(null)
  /** Set when the learner goes on: the page then shows the result in place instead of leaving for another page. */
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [premiumRequired, setPremiumRequired] = useState(false)
  const { toast } = useToast()
  const [checking, setChecking] = useState(false)
  const [activationOpen, setActivationOpen] = useState(false)
  const [access, setAccess] = useState<GradingAccess>({ balance: null, subscription: undefined })
  const [terms, setTerms] = useState<SpeakingTerms | null>(null)
  const [consent, setConsent] = useState(false)
  const [sending, setSending] = useState(false)
  const [progress, setProgress] = useState<SendProgress | null>(null)
  const [error, setError] = useState('')
  const requestId = useRef<string | null>(null)
  const termsRequest = useRef<AbortController | null>(null)
  const wallet = useWritingWallet()
  const premium = hasActivePremium(access.subscription)

  useEffect(() => () => termsRequest.current?.abort(), [])

  function start() {
    if (checking) return
    const controller = new AbortController()
    termsRequest.current = controller
    setChecking(true)
    setTerms(null)
    setPopup('terms')
    void Promise.all([wallet.checkAccess(), getSpeakingTerms(controller.signal).catch((): null => null)]).then(([found, loaded]) => {
      if (controller.signal.aborted) return
      setAccess(found)
      setTerms(loaded)
      // Without terms, or with grading switched off, the first popup stays and says why.
      if (!loaded || loaded.enabled === false) return
      // An unreadable balance does not block: the server checks the points again when the answers are sent.
      const affordable = hasActivePremium(found.subscription) || found.balance === null || found.balance >= loaded.pointCost
      setPopup(affordable ? 'confirm' : 'short')
    }).finally(() => { if (!controller.signal.aborted) setChecking(false) })
  }

  function send() {
    if (sending || !terms || terms.enabled === false || !consent || recordings.length === 0) return
    requestId.current ??= crypto.randomUUID()
    setSending(true)
    setError('')
    setProgress(null)
    void sendSpeakingSubmission({
      requestId: requestId.current,
      packageVersionId,
      partSectionIds,
      attemptId,
      recordings,
      maxRecordingBytes: terms.maxRecordingBytes,
      onProgress: setProgress,
    }).then((submission) => {
      requestId.current = null
      if (packageVersionId) clearSession(packageVersionId)
      setSent(submission)
      setPopup('sent')
    }).catch((cause: unknown) => {
      if (cause instanceof HttpError && cause.status === 402) {
        // The balance changed since it was read: show the figure the server judged by.
        void wallet.check().then((balance) => setAccess((current) => ({ ...current, balance })))
        setPopup('short')
        return
      }
      if (isPremiumRequired(cause)) {
        setPremiumRequired(true)
        return
      }
      if (isEntitlementUnavailable(cause)) {
        toast({ title: cause.message, tone: 'error' })
        return
      }
      setError(failureMessage(cause))
    }).finally(() => setSending(false))
  }

  function followGrading() {
    if (!sent) return
    setPopup(null)
    setSent(null)
    if (onSent) onSent(sent.id)
    else setViewingId(sent.id)
  }

  const progressNote = progress
    ? `Đang gửi bản ghi ${Math.min(progress.done + 1, progress.total)}/${progress.total}…` : BUSY_PROGRESS

  const dialogs = (
    <>
      {popup === 'terms' && (
        <Dialog open onOpenChange={(opened) => {
          if (!opened) { termsRequest.current?.abort(); setChecking(false); setPopup(null) }
        }}>
          <DialogContent className="ww-dialog">
            <DialogTitle className="ww-dialog-title">Chấm bài bằng AI</DialogTitle>
            <DialogDescription>{context}</DialogDescription>
            <p role={checking ? 'status' : 'alert'}>
              {checking ? 'Đang kiểm tra tài khoản…' : terms ? DISABLED : 'Chưa tải được điều khoản chấm. Hãy thử lại.'}
            </p>
            <button type="button" className="ww-secondary" disabled={checking} onClick={start}>Thử lại</button>
          </DialogContent>
        </Dialog>
      )}
      {popup === 'confirm' && terms && !sending && (
        <GradeConfirmDialog
          busy={false}
          error={error}
          canGrade={recordings.length > 0 && terms.enabled !== false}
          copy={premium ? PREMIUM_CONFIRM_COPY : CONFIRM_COPY}
          free={premium}
          consent={{ label: CONSENT_LABEL, checked: consent, onChange: setConsent }}
          onGrade={send}
          onClose={() => { setError(''); setPopup(null) }}
          figures={{
            cost: terms.pointCost,
            balance: access.balance ?? wallet.balance,
            context,
            benefits: ['Band từng tiêu chí và band tổng (điểm ước lượng để luyện tập)', 'Lỗi cần sửa, kèm gợi ý cải thiện', 'Bài luyện tiếp theo cho điểm yếu của bạn'],
            checks: [{ text: `${recordings.length} bản ghi · tổng ${formatDuration(seconds)}`, ok: true }],
          }}
        />
      )}
      {((popup === 'confirm' && sending) || popup === 'sent') && (
        <SpeakingSendDialog context={context} progress={progressNote} sent={sent} onContinue={followGrading} />
      )}
      {popup === 'short' && terms && (
        <NotEnoughPointsDialog
          cost={terms.pointCost}
          balance={access.balance ?? wallet.balance}
          copy={{ backLabel: 'Quay lại xem lại bài', kept: 'các bản ghi của bạn vẫn được giữ nguyên' }}
          onClose={() => setPopup(null)}
          onActivate={() => { setPopup(null); setActivationOpen(true) }}
        />
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
      <PremiumUpgradeDialog open={premiumRequired} onClose={() => setPremiumRequired(false)} />
    </>
  )

  return { start, checking, dialogs, viewingId }
}
