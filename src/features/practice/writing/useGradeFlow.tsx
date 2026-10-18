import { useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { KeyActivationDialog } from '@/features/home/components/KeyActivationDialog'
import { POINT_PRODUCTS } from '@/features/home/pricingData'
import { GradeConfirmDialog, NotEnoughPointsDialog } from './WritingParts'
import type { WritingMode, WritingTask } from './writingApi'
import { countWords } from './writingText'
import { useWritingGrading } from './useWritingGrading'
import { useWritingWallet } from './useWritingWallet'

type Popup = 'confirm' | 'short' | null

/**
 * What "Hoàn thành" does on a Writing screen: read the learner's points, then open the confirm popup (or the
 * not-enough-points popup, which leads to key activation) and send the essay to the AI grader when confirmed.
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
}): { start: () => void; checking: boolean; dialogs: ReactNode } {
  const { pathname, search } = useLocation()
  const [popup, setPopup] = useState<Popup>(null)
  const [checking, setChecking] = useState(false)
  const [activationOpen, setActivationOpen] = useState(false)
  const wallet = useWritingWallet()
  const grading = useWritingGrading({
    task, mode, draftKey, essay, seconds, retryPath: `${pathname}${search}`,
    onPointsShort: () => setPopup('short'),
  })
  const words = countWords(essay)
  const minWords = task.minWords ?? grading.terms.minWords
  const canGrade = words >= grading.terms.minWords

  function start() {
    if (checking) return
    setChecking(true)
    void wallet.check().then((balance) => {
      setPopup(balance !== null && balance < grading.terms.pointCost ? 'short' : 'confirm')
    }).finally(() => setChecking(false))
  }

  const dialogs = (
    <>
      {popup === 'confirm' && (
        <GradeConfirmDialog
          busy={grading.grading}
          error={grading.error || (canGrade ? '' : `Cần ít nhất ${grading.terms.minWords} từ để AI chấm bài.`)}
          canGrade={canGrade}
          onGrade={() => void grading.grade()}
          onClose={() => { grading.clearError(); setPopup(null) }}
          figures={{
            cost: grading.terms.pointCost,
            balance: wallet.balance,
            context: `Writing ${task.task === 'TASK_2' ? 'Task 2' : 'Task 1'} · ${task.title} · ${label}`,
            benefits,
            checks: [...extraChecks, { text: `Số từ: ${words} (tối thiểu ${minWords})`, ok: words >= minWords }],
          }}
        />
      )}
      {popup === 'short' && (
        <NotEnoughPointsDialog
          cost={grading.terms.pointCost}
          balance={wallet.balance}
          onClose={() => setPopup(null)}
          onActivate={() => { setPopup(null); setActivationOpen(true) }}
        />
      )}
      <KeyActivationDialog
        product={activationOpen ? POINT_PRODUCTS[0] : null}
        isLoggedIn={wallet.isLoggedIn}
        client={wallet.client}
        onClose={() => setActivationOpen(false)}
        onActivated={wallet.onActivated}
        returnFocus={() => undefined}
      />
    </>
  )

  return { start, checking, dialogs }
}
