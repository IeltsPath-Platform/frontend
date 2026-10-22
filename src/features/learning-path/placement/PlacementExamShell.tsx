import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { SiteLogo } from '@/components/SiteLogo'
import type { AnswerMap } from '~types/learningPath'
import type { SaveState } from '../lib/useAttemptAnswers'
import type { TestGroup } from './placementGroups'
import { formatMinutesSeconds, useSectionSeconds } from './sectionClock'
import { SKILL_META } from './placementSkills'

/** What every skill screen gets from the test that owns the attempt and its answers. */
export interface SectionRunnerProps {
  attemptId: string
  /** The skill being taken: all of its parts, with questions numbered across them. */
  group: TestGroup
  answers: AnswerMap
  saveStates: Record<string, SaveState>
  setAnswer: (itemId: string, value: string) => void
  saveAnswer: (itemId: string, value: string) => Promise<boolean>
  /** A part came on screen; the first time per part this tells the server when its clock started. */
  onOpenPart: (sectionId: string) => void
  /** Back to the test hub without finishing; the answers stay saved and the skill can be reopened. */
  onExit: () => void
  /**
   * Finishes every part of the skill on the server once its answers (and any essays or recordings) are sent. It cannot
   * be reopened afterwards; finishing the last skill submits the whole test.
   */
  onComplete: () => Promise<void>
}

interface PlacementExamShellProps {
  group: TestGroup
  /** Bold name of the part on screen, e.g. "Part 2". */
  partLabel: string
  /** The part's own instructions, e.g. "Questions 1–10. Complete the form below…". */
  instructions?: string
  onExit: () => void
  /** Extra controls in the top bar, e.g. the Listening audio. */
  toolbar?: ReactNode
  /** Sticky bottom bar: part and question navigation and the finish button. Skills that carry their own controls omit it. */
  footer?: ReactNode
  footerClassName?: string
  children: ReactNode
}

/** Full-screen exam frame over the site chrome, like the real computer-based test. */
export function PlacementExamShell({ group, partLabel, instructions, onExit, toolbar, footer, footerClassName, children }: PlacementExamShellProps) {
  const meta = SKILL_META[group.skill]
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
        <SiteLogo alt="IELTS Space" className="pl-exam__logo" />
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
        <strong>{partLabel}</strong>
        <span>{instructions || 'Trả lời các câu hỏi bên dưới.'}</span>
      </div>
      <div className="pl-exam__body">{children}</div>
      {footer ? <footer className={`pl-exam__foot ${footerClassName ?? ''}`}>{footer}</footer> : null}
    </div>
  )
}
