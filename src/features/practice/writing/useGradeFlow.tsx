import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Hourglass } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { KeyActivationDialog } from '@/features/home/components/KeyActivationDialog'
import { POINT_PRODUCTS } from '@/features/home/pricingData'
import { getPendingExaminerSubmission } from './examinerApi'
import { ExaminerPickDialog } from './ExaminerPickDialog'
import { GradeMethodDialog } from './GradeMethodDialog'
import { GradeConfirmDialog, NotEnoughPointsDialog } from './WritingParts'
import { gradeOptions } from './gradeOptions'
import type { WritingMode, WritingTask } from './writingApi'
import { countWords } from './writingText'
import { useExaminerSubmission } from './useExaminerSubmission'
import { useWritingGrading } from './useWritingGrading'
import { useWritingWallet } from './useWritingWallet'
import type { GradingAccess } from './useWritingWallet'

type Popup = 'method' | 'confirm' | 'short' | 'examiner' | null

/**
 * What "Hoàn thành" does on a Writing screen: read the learner's points and Premium credits, then ask who grades. A teacher
 * needs Premium with a credit left and is picked from the examiners who take work; the AI needs enough points and goes
 * through the confirm popup (or the not-enough-points popup, which leads to key activation).
 */
export function useGradeFlow({ task, mode, draftKey, essay, seconds, label, benefits, extraChecks }: {
  task: WritingTask
  mode: WritingMode
  draftKey: string
  essay: string
  seconds: number
  /** Last part of the popup's context line, such as "Viết tự do". */
  label: string
  benefits: string[]
  /** Checks shown under the figures besides the word count, such as the steps done. */
  extraChecks: Array<{ text: string; ok: boolean }>
}): { start: () => void; checking: boolean; dialogs: ReactNode; pendingNotice: ReactNode } {
  const { pathname, search } = useLocation()
  const [popup, setPopup] = useState<Popup>(null)
  const [waiting, setWaiting] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [activationOpen, setActivationOpen] = useState(false)
  const [access, setAccess] = useState<GradingAccess>({ balance: null, subscription: undefined })
  const wallet = useWritingWallet()
  const retryPath = `${pathname}${search}`
  const grading = useWritingGrading({
    task, mode, draftKey, essay, seconds, retryPath,
    onPointsShort: () => setPopup('short'),
  })
  const examiner = useExaminerSubmission({ task, mode, draftKey, essay, seconds, retryPath })

  // The learner may come back to a prompt they already sent to a teacher: say so before they write it again.
  useEffect(() => {
    const controller = new AbortController()
    getPendingExaminerSubmission(task.questionVersionId, controller.signal)
      .then((id) => { if (!controller.signal.aborted) setWaiting(id) })
      .catch(() => undefined)
    return () => controller.abort()
  }, [task.questionVersionId])
  const pendingId = examiner.pendingId ?? waiting
  const words = countWords(essay)
  const minWords = task.minWords ?? grading.terms.minWords
  const canGrade = words >= grading.terms.minWords
  const options = gradeOptions({ balance: access.balance, cost: grading.terms.pointCost, subscription: access.subscription, teacherPending: pendingId !== null })
  const context = `Writing ${task.task === 'TASK_2' ? 'Task 2' : 'Task 1'} · ${task.title} · ${label}`

  function start() {
    if (checking) return
    setChecking(true)
    void wallet.checkAccess().then((found) => {
      setAccess(found)
      setPopup('method')
    }).finally(() => setChecking(false))
  }

  const dialogs = (
    <>
      {popup === 'method' && (
        <GradeMethodDialog
          options={options}
          context={context}
          onClose={() => setPopup(null)}
          onTeacher={() => setPopup('examiner')}
          onAi={() => setPopup(options.ai.enabled ? 'confirm' : 'short')}
        />
      )}
      {popup === 'examiner' && (
        <ExaminerPickDialog
          words={words}
          minWords={grading.terms.minWords}
          busy={examiner.busy}
          error={examiner.error}
          onSend={(examinerId) => void examiner.send(examinerId)}
          onBack={() => { examiner.clearError(); setPopup('method') }}
          onClose={() => { examiner.clearError(); setPopup(null) }}
        />
      )}
      {popup === 'confirm' && (
        <GradeConfirmDialog
          busy={grading.grading}
          error={grading.error || (canGrade ? '' : `Cần ít nhất ${grading.terms.minWords} từ để AI chấm bài.`)}
          canGrade={canGrade}
          onGrade={() => void grading.grade()}
          onClose={() => { grading.clearError(); setPopup(null) }}
          figures={{
            cost: grading.terms.pointCost,
            balance: access.balance ?? wallet.balance,
            context,
            benefits,
            checks: [...extraChecks, { text: `Số từ: ${words} (tối thiểu ${minWords})`, ok: words >= minWords }],
          }}
        />
      )}
      {popup === 'short' && (
        <NotEnoughPointsDialog
          cost={grading.terms.pointCost}
          balance={access.balance ?? wallet.balance}
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
    </>
  )

  const pendingNotice = pendingId ? (
    <div className="we-pending" role="status">
      <span aria-hidden="true" className="we-pending__icon"><Hourglass size={20} /></span>
      <div className="we-pending__body">
        <strong>Bài này đã gửi giáo viên và đang chờ chấm</strong>
        <p>Bạn gửi lại cho giáo viên được sau khi giáo viên chấm xong. Trong lúc chờ, bạn có thể chọn AI chấm.</p>
      </div>
      <Link className="we-pending__action" to={`/practice/writing/submissions/${pendingId}/result`}>Xem bài đang chờ chấm</Link>
    </div>
  ) : null

  return { start, checking, dialogs, pendingNotice }
}
