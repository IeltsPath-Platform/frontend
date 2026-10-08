import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { BRAND_LOGO_URL } from '@/components/brandLogo'
import type { AnswerMap } from '~types/learningPath'
import type { TestSection } from '../lib/attemptSnapshot'
import type { SaveState } from '../lib/useAttemptAnswers'
import { formatMinutesSeconds, useSectionSeconds } from './sectionClock'
import { SKILL_META, skillOf } from './placementSkills'

/** What every section screen gets from the test that owns the attempt and its answers. */
export interface SectionRunnerProps {
  attemptId: string
  section: TestSection
  /** 1-based position among the test's sections. */
  partNumber: number
  answers: AnswerMap
  saveStates: Record<string, SaveState>
  setAnswer: (itemId: string, value: string) => void
  saveAnswer: (itemId: string, value: string) => Promise<boolean>
  /** Back to the test hub without finishing; the answers stay saved and the section can be reopened. */
  onExit: () => void
  /**
   * Finishes the section on the server once its answers (and any essays or recordings) are sent. It cannot be
   * reopened afterwards; finishing the last section submits the whole test.
   */
  onComplete: () => Promise<void>
}

interface PlacementExamShellProps {
  section: TestSection
  partNumber: number
  onExit: () => void
  /** Overrides the task line under "Part N"; defaults to the section's own instructions. */
  instructions?: string
  /** Extra controls in the top bar, e.g. the Listening audio. */
  toolbar?: ReactNode
  /** Sticky bottom bar: question navigation and the finish button. Sections that carry their own controls omit it. */
  footer?: ReactNode
  footerClassName?: string
  children: ReactNode
}

/** Full-screen exam frame over the site chrome, like the real computer-based test. */
export function PlacementExamShell({ section, partNumber, onExit, instructions, toolbar, footer, footerClassName, children }: PlacementExamShellProps) {
  const meta = SKILL_META[skillOf(section)]
  const clock = formatMinutesSeconds(useSectionSeconds())

  // The page behind the exam must not scroll with it.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [])

  return (
    <div className="pl-exam" role="dialog" aria-modal="true" aria-labelledby="pl-exam-title">
      <header className="pl-exam__top">
        <img alt="IELTS Space" className="pl-exam__logo" height={74} src={BRAND_LOGO_URL} width={175} />
        <div className="pl-exam__title">
          <h1 id="pl-exam-title">Bài kiểm tra đầu vào · {meta.label}</h1>
          <p>Đã làm {clock} · không giới hạn thời gian</p>
        </div>
        {toolbar ? <div className="pl-exam__toolbar">{toolbar}</div> : null}
        <button className="pl-exam__close" onClick={onExit} type="button" aria-label="Lưu và quay lại danh sách phần thi" title="Lưu và quay lại">
          <X aria-hidden="true" size={18} />
        </button>
      </header>
      <div className="pl-exam__part">
        <strong>Part {partNumber}</strong>
        <span>{instructions || section.snapshot?.instructions || section.snapshot?.title || 'Trả lời các câu hỏi bên dưới.'}</span>
      </div>
      <div className="pl-exam__body">{children}</div>
      {footer ? <footer className={`pl-exam__foot ${footerClassName ?? ''}`}>{footer}</footer> : null}
    </div>
  )
}
