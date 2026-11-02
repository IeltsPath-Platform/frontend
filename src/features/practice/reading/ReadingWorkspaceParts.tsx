import { useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftRight, Clock3, Highlighter, Quote, Settings, X } from 'lucide-react'
import { PracticeSettingsPopover } from '../components/PracticeSettingsPopover'

export type WorkspaceFontSize = 'small' | 'medium' | 'large'

/** hh:mm:ss, the way the computer-delivered test shows its clock. */
function formatWorkspaceClock(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds))
  return [Math.floor(safe / 3600), Math.floor((safe % 3600) / 60), safe % 60]
    .map((value) => String(value).padStart(2, '0')).join(':')
}

/** Area A: exit, the clock and the display settings. */
export function ReadingTopBar({ seconds, timed, showClock = true, exitTo, eyeComfort, onToggleEyeComfort, fontSize, onChangeFontSize }: {
  seconds: number
  timed: boolean
  /** The exam's finish screen has no clock. */
  showClock?: boolean
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
      {showClock ? (
        <p className="rw-timer" role="timer" aria-live="off" aria-label={timed ? 'Thời gian còn lại' : 'Thời gian đã làm'}>
          <Clock3 size={14} aria-hidden="true" /> {formatWorkspaceClock(seconds)}
        </p>
      ) : <span />}
      <div className="rw-settings">
        <button type="button" className="rw-settings-button" aria-expanded={settingsOpen} onClick={() => setSettingsOpen((open) => !open)}>
          <Settings size={14} aria-hidden="true" /> Cài đặt
        </button>
        <PracticeSettingsPopover
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          eyeComfort={eyeComfort}
          onToggleEyeComfort={onToggleEyeComfort}
          showEyeComfort={!timed}
          fontSize={fontSize}
          onChangeFontSize={onChangeFontSize}
        />
      </div>
    </header>
  )
}

/** Area B: the practice tool. The real exam interface has none. */
export function ReadingToolRail({ onHighlight, onNote }: {
  onHighlight: () => void
  onNote: () => void
}) {
  return (
    <aside className="rw-tools" aria-label="Công cụ hỗ trợ">
      <p className="rw-tools-title">Công cụ</p>
      {/* mousedown is cancelled so pressing a button never drops the text selection */}
      <button type="button" className="rw-tool" onMouseDown={(event) => event.preventDefault()} onClick={onHighlight} aria-keyshortcuts="H">
        <Highlighter size={16} aria-hidden="true" />
        <span>Highlight</span>
        <small>Phím (H)</small>
      </button>
      <button type="button" className="rw-tool" onMouseDown={(event) => event.preventDefault()} onClick={onNote}>
        <Quote size={16} aria-hidden="true" />
        <span>Note</span>
      </button>
      <p className="rw-tools-help">Bôi đen đoạn trong bài rồi bấm Highlight hoặc Note.</p>
      <p className="rw-tools-help">Bấm vào chữ đã đánh dấu rồi chọn Clear để bỏ.</p>
      <p className="rw-tools-help">Bấm vào một từ để xem nghĩa.</p>
    </aside>
  )
}

/** Share of the width (in percent) the passage may take in the exam layout. */
export const SPLIT_MIN = 25
export const SPLIT_MAX = 75
const SPLIT_KEY_STEP = 2

/** Exam layout: the bar between passage and questions. Drag it, or use the arrow keys, to give either side more room. */
export function ReadingSplitHandle({ value, onChange, label = 'Kéo để đổi độ rộng bài đọc và câu hỏi' }: {
  value: number
  onChange: (percent: number) => void
  /** What the bar tells a screen reader it resizes. */
  label?: string
}) {
  const clamp = (percent: number) => Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, percent))

  function drag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    const frame = event.currentTarget.parentElement?.getBoundingClientRect()
    if (frame && frame.width > 0) onChange(clamp(((event.clientX - frame.left) / frame.width) * 100))
  }

  return (
    <div
      className="rw-divider"
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuemin={SPLIT_MIN}
      aria-valuemax={SPLIT_MAX}
      aria-valuenow={Math.round(value)}
      tabIndex={0}
      onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId) }}
      onPointerMove={drag}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') { event.preventDefault(); onChange(clamp(value - SPLIT_KEY_STEP)) }
        if (event.key === 'ArrowRight') { event.preventDefault(); onChange(clamp(value + SPLIT_KEY_STEP)) }
      }}
    >
      <span className="rw-divider-grip"><ArrowLeftRight size={14} aria-hidden="true" /></span>
    </div>
  )
}

export interface QuestionNavGroup {
  /** Shown before the numbers when the test has more than one passage. */
  label: string
  numbers: number[]
  /** The passage that is open now; only the exam layout reads it. */
  active?: boolean
}

/** Area E: every question number, grouped by passage. */
export function ReadingQuestionNav({ groups, currentQuestion, answeredNumbers, flaggedNumbers, onSelect, alwaysLabel = false, collapseInactive = false }: {
  groups: QuestionNavGroup[]
  /** Names the part even when the test has only one (the exam layout always does). */
  alwaysLabel?: boolean
  /** Exam layout: parts that are not open show "Part 2 0 of 13" instead of their numbers; clicking one opens it. */
  collapseInactive?: boolean
  currentQuestion: number
  answeredNumbers: ReadonlySet<number>
  /** Questions the learner bookmarked to come back to. */
  flaggedNumbers?: ReadonlySet<number>
  onSelect: (questionNumber: number) => void
}) {
  return (
    <nav className="rw-qnav" aria-label="Điều hướng câu hỏi">
      {groups.map((group) => {
        if (collapseInactive && group.active === false && group.numbers.length > 0) {
          const done = group.numbers.filter((number) => answeredNumbers.has(number)).length
          return (
            <button key={group.label} type="button" className="rw-qnav-part" aria-label={`${group.label}, đã trả lời ${done} trên ${group.numbers.length} câu`} onClick={() => onSelect(group.numbers[0]!)}>
              <span className="rw-qnav-label">{group.label}</span>
              <span className="rw-qnav-count">{done} of {group.numbers.length}</span>
            </button>
          )
        }
        return <QuestionNavNumbers key={group.label} group={group} showLabel={alwaysLabel || groups.length > 1} currentQuestion={currentQuestion} answeredNumbers={answeredNumbers} flaggedNumbers={flaggedNumbers} onSelect={onSelect} />
      })}
    </nav>
  )
}

function QuestionNavNumbers({ group, showLabel, currentQuestion, answeredNumbers, flaggedNumbers, onSelect }: {
  group: QuestionNavGroup
  showLabel: boolean
  currentQuestion: number
  answeredNumbers: ReadonlySet<number>
  flaggedNumbers?: ReadonlySet<number>
  onSelect: (questionNumber: number) => void
}) {
  return (
    <div className="rw-qnav-group">
      {showLabel && <span className="rw-qnav-label">{group.label}</span>}
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
  )
}
