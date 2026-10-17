import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, MessageSquareText, X } from 'lucide-react'
import type { TestSection } from '@/features/learning-path/lib/attemptSnapshot'
import type { ReadingResultItem, ReadingResultView } from '../lib/readingResultView'
import type { SkillType } from '@/types/practice'
import { ListeningAudioBar } from '../listening/ListeningAudioBar'
import '../listening/listening-workspace.css'
import { PRACTICE_SKILL_CONFIG } from '../lib/practiceSkillConfig'
import { formatClockTime } from '../lib/practiceAnalysis'
import { parseExplanation } from '../lib/explanationSteps'
import './reading-practice.css'
import './reading-workspace.css'
import './reading-review.css'

type Verdict = 'correct' | 'wrong' | 'blank'

function verdictOf(item: ReadingResultItem): Verdict {
  if (item.yourAnswer === null) return 'blank'
  return item.correct === true ? 'correct' : 'wrong'
}

const VERDICT_LABEL: Record<Verdict, string> = { correct: 'đúng', wrong: 'sai', blank: 'bỏ trống' }

const sameAnswer = (a: string | null | undefined, b: string | null | undefined) =>
  a != null && b != null && a.trim().toLowerCase() === b.trim().toLowerCase()

/** What the learner answered against the key, then the explanation step by step. */
function ExplanationPanel({ item, verdict }: { item: ReadingResultItem; verdict: Verdict }) {
  const parsed = parseExplanation(item.explanation)
  return (
    <div className="rv-explanation" role="region" aria-label={`Giải thích câu ${item.number}`}>
      <p className={`rv-verdict rv-verdict-${verdict}`}>
        {verdict === 'blank' ? 'Bạn đã bỏ trống câu này.' : <>Bạn chọn: <b className="rv-yours">{item.yourAnswer}</b></>}
        {item.correctAnswer !== undefined && <> · Đáp án đúng: <b className="rv-key">{item.correctAnswer}</b></>}
      </p>
      {parsed.steps.map((step) => (
        <section className={`rv-step${step.title.toLowerCase().includes('đáp án') ? ' rv-step-answer' : ''}`} key={step.number}>
          <h4>Bước {step.number} · {step.title}</h4>
          {step.lines.some((line) => line.kind === 'bullet') && (
            <ul>{step.lines.filter((line) => line.kind === 'bullet').map((line) => <li key={line.text}>{line.text}</li>)}</ul>
          )}
          {step.lines.filter((line) => line.kind !== 'bullet').map((line) => (
            <p key={line.text} className={line.kind === 'evidence' ? 'rv-evidence' : undefined}>{line.text}</p>
          ))}
        </section>
      ))}
      {!parsed.steps.length && <p>{parsed.plain || 'Câu này chưa có phần giải thích.'}</p>}
    </div>
  )
}

/** One question as the learner answered it: their choice, the right answer and the explanation. */
function ReviewQuestion({ item, question, open, onToggle }: {
  item: ReadingResultItem
  question: NonNullable<TestSection['items'][number]['question']>
  open: boolean
  onToggle: () => void
}) {
  const verdict = verdictOf(item)
  const hasKey = item.correctAnswer !== undefined
  return (
    <div id={`review-question-${item.itemId}`} className={`rv-question rv-${verdict}`}>
      <div className="rv-prompt">
        <span className="rv-num" aria-label={`Câu ${item.number}, ${VERDICT_LABEL[verdict]}`}>{item.number}</span>
        <p>{question.prompt}</p>
        {(item.explanation || hasKey) && (
          <button type="button" className="rv-explain-button" aria-expanded={open} aria-label={`Giải thích câu ${item.number}`} onClick={onToggle}>
            <MessageSquareText size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      {question.options ? (
        <ul className="rv-options">
          {question.options.map((option) => {
            const chosen = sameAnswer(item.yourAnswer, option.value)
            const right = sameAnswer(item.correctAnswer, option.value)
            const state = right ? 'right' : chosen ? 'chosen-wrong' : 'plain'
            return (
              <li key={option.value} className={`rv-option rv-option-${state}${chosen ? ' is-chosen' : ''}`}>
                <span className="rv-radio" aria-hidden="true">{chosen ? <i /> : null}</span>
                {option.label !== option.value && option.value.length <= 2 ? <b>{option.value}</b> : null}
                <span>{option.label}</span>
                {chosen && <small>{right ? <><Check size={13} aria-hidden="true" /> Bạn chọn</> : <><X size={13} aria-hidden="true" /> Bạn chọn</>}</small>}
                {right && !chosen && <small>Đáp án đúng</small>}
              </li>
            )
          })}
        </ul>
      ) : (
        <dl className="rv-fill">
          <div><dt>Bạn điền</dt><dd className={verdict === 'correct' ? 'rv-text-right' : 'rv-text-wrong'}>{item.yourAnswer ?? '(bỏ trống)'}</dd></div>
          {hasKey && verdict !== 'correct' && <div><dt>Đáp án đúng</dt><dd className="rv-text-right">{item.correctAnswer}</dd></div>}
        </dl>
      )}

      {open && <ExplanationPanel item={item} verdict={verdict} />}
    </div>
  )
}

/** The review screen: the passage on the left, the questions with their keys on the right, and every number below. */
export function ReadingReview({ attemptId, sections, view, skill = 'reading', transcripts }: {
  attemptId: string
  sections: TestSection[]
  view: ReadingResultView
  skill?: SkillType
  /** Listening only: the script of each section, keyed by the attempt section id. */
  transcripts?: ReadonlyMap<string, string>
}) {
  const config = PRACTICE_SKILL_CONFIG[skill]
  const catalogPath = `/practice-tests?skill=${skill}`
  const [activeIndex, setActiveIndex] = useState(0)
  const [openItem, setOpenItem] = useState<string | null>(null)
  const itemById = useMemo(() => new Map(view.items.map((item) => [item.itemId, item])), [view.items])
  const section = sections[activeIndex]
  const resultTo = `/practice/${skill}/attempts/${attemptId}/result`

  const navGroups = sections.map((candidate, index) => ({
    label: `${config.partLabel} ${candidate.partNo ?? index + 1}`,
    items: candidate.items.flatMap((entry) => { const item = itemById.get(entry.id); return item ? [item] : [] }),
  }))

  function goTo(item: ReadingResultItem) {
    const target = sections.findIndex((candidate) => candidate.items.some((entry) => entry.id === item.itemId))
    if (target >= 0) setActiveIndex(target)
    setOpenItem(item.itemId)
    window.setTimeout(() => document.getElementById(`review-question-${item.itemId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0)
  }

  if (!section) return <main className="reading-state reading-empty"><h1>Chưa có nội dung để xem lại</h1><Link to={resultTo}>Về kết quả</Link></main>

  const groups = section.snapshot?.groups ?? []
  const items = section.items.filter((entry) => entry.question !== null)
  const groupIds = new Set(groups.map((group) => group.groupId))
  const ungrouped = items.filter((entry) => !entry.question?.groupId || !groupIds.has(entry.question.groupId))

  const renderItem = (entry: TestSection['items'][number]) => {
    const item = itemById.get(entry.id)
    if (!item || !entry.question) return null
    return <ReviewQuestion key={entry.id} item={item} question={entry.question} open={openItem === entry.id} onToggle={() => setOpenItem((current) => (current === entry.id ? null : entry.id))} />
  }

  return (
    <div className="rw-root lp-tokens rv-root">
      <header className="rw-topbar">
        <Link className="rw-exit" to={resultTo} aria-label="Quay lại kết quả"><X size={16} aria-hidden="true" /></Link>
        <p className="rw-timer" aria-label="Điểm của bạn">{view.counts.correct}/{view.items.length} câu đúng · {formatClockTime(view.durationSeconds)}</p>
        <span />
      </header>

      <div className="rw-body rw-body-exam">
        <section className="rw-passage" aria-label={skill === 'listening' ? 'Bài nghe' : 'Bài đọc'}>
          <h1 className="rw-passage-title">{section.snapshot?.title ?? `${config.partLabel} ${section.partNo ?? activeIndex + 1}`}</h1>
          {skill === 'listening' && section.snapshot?.audio && <ListeningAudioBar key={section.id} src={section.snapshot.audio.mediaUrl} durationHint={section.snapshot.audio.durationSeconds} exam={false} />}
          <div className="rw-passage-scroll" aria-label={skill === 'listening' ? 'Transcript' : 'Nội dung bài đọc'}>
            {skill === 'listening'
              ? (transcripts?.get(section.id) ?? 'Section này chưa có transcript.').split('\n').filter(Boolean).map((line, index) => <p key={index}>{line}</p>)
              : section.snapshot?.passage?.paragraphs.map((paragraph, index) => (
                <p key={`${paragraph.label ?? 'P'}-${index}`}>{paragraph.label ? <strong>{paragraph.label}. </strong> : null}{paragraph.text}</p>
              ))}
          </div>
        </section>

        <section className="rw-questions" aria-label="Câu hỏi và đáp án">
          <div className="rw-questions-scroll">
            {groups.map((group) => {
              const groupItems = items.filter((entry) => entry.question?.groupId === group.groupId)
              if (!groupItems.length) return null
              const numbers = groupItems.map((entry) => itemById.get(entry.id)?.number ?? 0)
              return (
                <div className="rw-group" key={group.groupId}>
                  <h2 className="rw-group-title">{Math.min(...numbers) === Math.max(...numbers) ? `Question ${numbers[0]}` : `Questions ${Math.min(...numbers)} - ${Math.max(...numbers)}`}</h2>
                  {groupItems.map(renderItem)}
                </div>
              )
            })}
            {ungrouped.length > 0 && <div className="rw-group">{ungrouped.map(renderItem)}</div>}
          </div>
        </section>
      </div>

      <footer className="rw-footer rv-footer">
        <nav className="rv-nav" aria-label="Điều hướng câu hỏi">
          {navGroups.map((group) => (
            <div className="rw-qnav-group" key={group.label}>
              {navGroups.length > 1 && <span className="rw-qnav-label">{group.label}</span>}
              {group.items.map((item) => {
                const verdict = verdictOf(item)
                return (
                  <button key={item.itemId} type="button" className={`rv-qnum rv-qnum-${verdict}`} aria-label={`Câu ${item.number}, ${VERDICT_LABEL[verdict]}`} onClick={() => goTo(item)}>
                    {item.number}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>
        <div className="rw-footer-actions">
          <Link className="rv-primary" to={resultTo}>Xem kết quả</Link>
          <Link className="rv-secondary" to={catalogPath}>Làm bài khác</Link>
        </div>
      </footer>
    </div>
  )
}
