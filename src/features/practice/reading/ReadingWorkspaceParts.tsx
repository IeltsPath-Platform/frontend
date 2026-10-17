import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock3, Highlighter, Settings, X } from 'lucide-react'
import { PracticeSettingsPopover } from '../components/PracticeSettingsPopover'

export type WorkspaceFontSize = 'small' | 'medium' | 'large'

/** hh:mm:ss, the way the computer-delivered test shows its clock. */
function formatWorkspaceClock(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds))
  return [Math.floor(safe / 3600), Math.floor((safe % 3600) / 60), safe % 60]
    .map((value) => String(value).padStart(2, '0')).join(':')
}

/** Area A: exit, the clock and the display settings. */
export function ReadingTopBar({ seconds, timed, exitTo, eyeComfort, onToggleEyeComfort, fontSize, onChangeFontSize }: {
  seconds: number
  timed: boolean
  exitTo: string
  eyeComfort: boolean
  onToggleEyeComfort: (value: boolean) => void
  fontSize: WorkspaceFontSize
  onChangeFontSize: (size: WorkspaceFontSize) => void
}) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  return (
    <header className="rw-topbar">
      <Link className="rw-exit" to={exitTo} aria-label="Thoát bài làm"><X size={16} aria-hidden="true" /></Link>
      <p className="rw-timer" role="timer" aria-live="off" aria-label={timed ? 'Thời gian còn lại' : 'Thời gian đã làm'}>
        <Clock3 size={14} aria-hidden="true" /> {formatWorkspaceClock(seconds)}
      </p>
      <div className="rw-settings">
        <button type="button" className="rw-settings-button" aria-expanded={settingsOpen} onClick={() => setSettingsOpen((open) => !open)}>
          <Settings size={14} aria-hidden="true" /> Cài đặt
        </button>
        <PracticeSettingsPopover
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          eyeComfort={eyeComfort}
          onToggleEyeComfort={onToggleEyeComfort}
          fontSize={fontSize}
          onChangeFontSize={onChangeFontSize}
        />
      </div>
    </header>
  )
}

/** Area B: the practice tool. The real exam interface has none. */
export function ReadingToolRail({ hasSelection, hint, highlightsCount, onHighlight, onClearHighlights }: {
  hasSelection: boolean
  hint: string
  highlightsCount: number
  onHighlight: () => void
  onClearHighlights: () => void
}) {
  return (
    <aside className="rw-tools" aria-label="Công cụ hỗ trợ">
      <p className="rw-tools-title">Công cụ</p>
      {/* mousedown is cancelled so pressing the button never drops the text selection */}
      <button type="button" className="rw-tool" onMouseDown={(event) => event.preventDefault()} onClick={onHighlight} aria-keyshortcuts="H">
        <Highlighter size={16} aria-hidden="true" />
        <span>Highlight</span>
        <small>Phím (H)</small>
      </button>
      {highlightsCount > 0 && <button type="button" className="rw-tool rw-tool-quiet" onClick={onClearHighlights}>Bỏ Highlight</button>}
      <p className="rw-tools-help" role="status">{hint || (hasSelection ? 'Bấm Highlight hoặc phím H.' : 'Bôi đen đoạn trong bài đọc rồi bấm Highlight.')}</p>
    </aside>
  )
}

export interface QuestionNavGroup {
  /** Shown before the numbers when the test has more than one passage. */
  label: string
  numbers: number[]
}

/** Area E: every question number, grouped by passage. */
export function ReadingQuestionNav({ groups, currentQuestion, answeredNumbers, flaggedNumbers, onSelect }: {
  groups: QuestionNavGroup[]
  currentQuestion: number
  answeredNumbers: ReadonlySet<number>
  /** Questions the learner bookmarked to come back to. */
  flaggedNumbers?: ReadonlySet<number>
  onSelect: (questionNumber: number) => void
}) {
  return (
    <nav className="rw-qnav" aria-label="Điều hướng câu hỏi">
      {groups.map((group) => (
        <div className="rw-qnav-group" key={group.label}>
          {groups.length > 1 && <span className="rw-qnav-label">{group.label}</span>}
          {group.numbers.map((number) => {
            const answered = answeredNumbers.has(number)
            const flagged = flaggedNumbers?.has(number) ?? false
            return (
              <button
                key={number}
                type="button"
                className={`rw-qnum${number === currentQuestion ? ' is-current' : ''}${answered ? ' is-answered' : ''}${flagged ? ' is-flagged' : ''}`}
                aria-current={number === currentQuestion ? 'step' : undefined}
                aria-label={`Câu ${number}, ${answered ? 'đã trả lời' : 'chưa trả lời'}${flagged ? ', đã đánh dấu' : ''}`}
                onClick={() => onSelect(number)}
              >
                {number}
              </button>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
