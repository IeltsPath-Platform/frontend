import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import type { AttemptItemResponse } from '~types/learningPath'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { ReadingQuestionNav, ReadingToolRail, ReadingTopBar } from './ReadingWorkspaceParts'
import type { QuestionNavGroup, WorkspaceFontSize } from './ReadingWorkspaceParts'
import { ReadingQuestionsPanel } from './ReadingQuestionsPanel'
import { readPassageSelection, mergeHighlights } from '../lib/passageTools'
import type { PassageSelection, TextHighlight } from '@/types/practice'
import { LoadingState, ApiErrorState } from '@/features/learning-path/components/PageState'
import { useApiResource } from '@/features/learning-path/lib/useApiResource'
import type { TestSection } from '@/features/learning-path/lib/attemptSnapshot'
import { useAttemptAnswers } from '@/features/learning-path/lib/useAttemptAnswers'
import { getAttemptResponses, getAttemptStructure, getReadingAttempt, saveAttemptAnswer, startAttemptSection, submitReadingAttempt } from './readingPracticeApi'
import type { ReadingAttempt } from './readingPracticeApi'
import { clockSeconds, isTypingTarget, toSavedResponses } from './workspace-support'
import '@/features/learning-path/learning-path.css'
import { parseSections } from './readingSections'
import './reading-practice.css'
import './reading-workspace.css'

const CATALOG_PATH = '/practice-tests?skill=reading'

export function ReadingPracticePage() {
  const { attemptId = '' } = useParams()
  const navigate = useNavigate()
  const resource = useApiResource(`reading-attempt:${attemptId}`, async () => {
    const [attempt, structure, responses] = await Promise.all([
      getReadingAttempt(attemptId), getAttemptStructure(attemptId), getAttemptResponses(attemptId),
    ])
    return { attempt, sections: parseSections(structure), saved: toSavedResponses(responses) }
  })

  if (!attemptId) return <Navigate replace to={CATALOG_PATH} />
  if (resource.status === 'loading') return <LoadingState label="Đang tải bài Reading…" />
  if (resource.status === 'error' && resource.error) return <ApiErrorState error={resource.error} onRetry={resource.reload} />
  if (!resource.data) return null
  if (resource.data.attempt.status === 'SUBMITTED') return <NavigateResult attemptId={attemptId} navigate={navigate} />
  if (resource.data.attempt.status && resource.data.attempt.status !== 'IN_PROGRESS') return <Navigate replace to={CATALOG_PATH} />
  return <ReadingRunner key={attemptId} attemptId={attemptId} attempt={resource.data.attempt} sections={resource.data.sections} saved={resource.data.saved} />
}

function NavigateResult({ attemptId, navigate }: { attemptId: string; navigate: ReturnType<typeof useNavigate> }) {
  useEffect(() => { void navigate(`/practice/reading/attempts/${attemptId}/result`, { replace: true }) }, [attemptId, navigate])
  return <LoadingState label="Đang mở kết quả…" />
}

function ReadingRunner({ attemptId, attempt, sections, saved }: {
  attemptId: string
  attempt: ReadingAttempt
  sections: TestSection[]
  saved: AttemptItemResponse[]
}) {
  const navigate = useNavigate()
  const [activeIndex, setActiveIndex] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState(1)
  const [seconds, setSeconds] = useState(() => clockSeconds(attempt, attempt.mode === 'TIMED'))
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState('')
  const [eyeComfort, setEyeComfort] = useState(false)
  const [fontSize, setFontSize] = useState<WorkspaceFontSize>('medium')
  const [selection, setSelection] = useState<PassageSelection | null>(null)
  const [hint, setHint] = useState('')
  const [highlightsBySection, setHighlightsBySection] = useState<Record<string, TextHighlight[]>>({})
  const passageRef = useRef<HTMLDivElement>(null)
  const activeSectionRef = useRef<string | undefined>(sections[0]?.id)
  const spentRef = useRef<Record<string, number>>({})
  const submittingRef = useRef(false)
  const autoSubmitRef = useRef<() => void>(() => undefined)
  const timed = attempt.mode === 'TIMED'
  const answers = useAttemptAnswers(attemptId, saved, async (id, itemId, answer, revision) => saveAttemptAnswer(id, itemId, answer, revision))
  const section = sections[activeIndex]
  const allItems = useMemo(() => sections.flatMap((item) => item.items.filter((question) => question.question !== null)), [sections])
  // One continuous numbering across every passage, in the order the learner sees the questions.
  const numberByItem = useMemo(() => new Map(allItems.map((item, index) => [item.id, index + 1])), [allItems])
  const navGroups = useMemo<QuestionNavGroup[]>(() => sections.map((candidate, index) => ({
    label: `Passage ${candidate.partNo ?? index + 1}`,
    numbers: candidate.items.flatMap((item) => (item.question ? [numberByItem.get(item.id) ?? 0] : [])),
  })), [sections, numberByItem])
  const answeredNumbers = useMemo(() => new Set(allItems.filter((item) => Boolean(answers.answers[item.id]?.trim())).map((item) => numberByItem.get(item.id) ?? 0)), [allItems, answers.answers, numberByItem])
  const unanswered = allItems.length - answeredNumbers.size
  const activeHighlights = section ? highlightsBySection[section.id] ?? [] : []

  useEffect(() => {
    const firstSection = sections[0]
    if (firstSection) void startAttemptSection(attemptId, firstSection.id).catch(() => undefined)
  }, [attemptId, sections])

  useEffect(() => {
    const id = window.setInterval(() => {
      setSeconds(clockSeconds(attempt, timed))
      // Time only counts while the page is in view and a passage is open.
      const open = activeSectionRef.current
      if (open && !document.hidden) spentRef.current[open] = (spentRef.current[open] ?? 0) + 1
    }, 1000)
    return () => window.clearInterval(id)
  }, [attempt, timed])

  async function submit(force = false) {
    if (submittingRef.current) return
    if (unanswered > 0 && !force) { setConfirmOpen(true); return }
    setConfirmOpen(false)
    submittingRef.current = true
    setSubmitting(true)
    setError('')
    const savedAll = await Promise.all(allItems.map((item) => answers.saveAnswer(item.id, answers.answers[item.id] ?? '')))
    if (savedAll.some((value) => !value)) {
      setError('Một số câu chưa lưu được. Hãy thử lại trước khi nộp bài.')
      setSubmitting(false)
      submittingRef.current = false
      return
    }
    try {
      await submitReadingAttempt(attemptId, spentRef.current)
      navigate(`/practice/reading/attempts/${attemptId}/result`, { replace: true })
    } catch {
      setError('Chưa nộp được bài. Hãy thử lại.')
      setSubmitting(false)
      submittingRef.current = false
    }
  }

  useEffect(() => {
    autoSubmitRef.current = () => { void submit(true) }
  })

  useEffect(() => {
    if (timed && attempt.expiresAt && Date.parse(attempt.expiresAt) <= Date.now()) window.setTimeout(() => autoSubmitRef.current(), 0)
  }, [seconds, timed, attempt.expiresAt])

  async function selectSection(index: number) {
    if (index === activeIndex || !sections[index]) return
    try { await startAttemptSection(attemptId, sections[index]!.id) } catch { /* Re-entering a section is idempotent; answers remain available. */ }
    setActiveIndex(index)
    activeSectionRef.current = sections[index]!.id
    setSelection(null)
  }

  function goToQuestion(questionNumber: number) {
    const target = allItems[questionNumber - 1]
    if (!target) return
    setCurrentQuestion(questionNumber)
    const targetSection = sections.findIndex((candidate) => candidate.items.some((item) => item.id === target.id))
    const reveal = () => window.setTimeout(() => document.getElementById(`reading-question-${target.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0)
    if (targetSection >= 0 && targetSection !== activeIndex) void selectSection(targetSection).then(reveal)
    else reveal()
  }

  function highlightSelection() {
    if (timed || !section) return
    // The live browser selection wins; the remembered one covers a selection the browser dropped meanwhile.
    const target = readPassageSelection(passageRef.current) ?? selection
    if (!target) { setHint('Bôi đen đoạn trong bài đọc, rồi bấm Highlight.'); return }
    setHighlightsBySection((current) => ({ ...current, [section.id]: mergeHighlights([...(current[section.id] ?? []), ...target.ranges]) }))
    setSelection(null)
    setHint('')
    window.getSelection()?.removeAllRanges()
  }

  useEffect(() => {
    if (timed) return
    function onSelectionChange() {
      const next = readPassageSelection(passageRef.current)
      if (next) { setSelection(next); setHint(''); return }
      const live = window.getSelection()
      // Only a click inside the passage forgets the selection; moving focus to a tool button must keep it.
      if (live?.isCollapsed && live.anchorNode && passageRef.current?.contains(live.anchorNode)) setSelection(null)
    }
    document.addEventListener('selectionchange', onSelectionChange)
    return () => document.removeEventListener('selectionchange', onSelectionChange)
  }, [timed])

  const highlightRef = useRef(highlightSelection)
  useEffect(() => { highlightRef.current = highlightSelection })
  useEffect(() => {
    if (timed) return
    function onKeyDown(event: KeyboardEvent) {
      if ((event.key === 'h' || event.key === 'H') && !event.ctrlKey && !event.metaKey && !event.altKey && !isTypingTarget(event.target)) {
        highlightRef.current()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [timed])

  function renderPassageText(text: string, label: string) {
    const ranges = activeHighlights.filter((item) => item.paragraph === label).sort((a, b) => a.start - b.start)
    const pieces: ReactNode[] = []
    let cursor = 0
    for (const range of ranges) {
      if (range.start < cursor || range.end > text.length) continue
      pieces.push(text.slice(cursor, range.start))
      pieces.push(<mark key={`${label}-${range.start}`}>{text.slice(range.start, range.end)}</mark>)
      cursor = range.end
    }
    pieces.push(text.slice(cursor))
    return pieces
  }

  if (!section || sections.length === 0) return <main className="reading-state reading-empty"><h1>Đề chưa có câu hỏi</h1><Link to={CATALOG_PATH}>Về danh mục Reading</Link></main>

  const title = section.snapshot?.title ?? `Passage ${section.partNo ?? activeIndex + 1}`

  return <div className={`rw-root lp-tokens${eyeComfort ? ' rw-eye-comfort' : ''} rw-text-${fontSize}`}>
    <ReadingTopBar
      seconds={seconds}
      timed={timed}
      exitTo={CATALOG_PATH}
      eyeComfort={eyeComfort}
      onToggleEyeComfort={setEyeComfort}
      fontSize={fontSize}
      onChangeFontSize={setFontSize}
    />

    <div className={`rw-body${timed ? ' rw-body-exam' : ''}`}>
      {!timed && (
        <ReadingToolRail
          hasSelection={selection !== null}
          hint={hint}
          highlightsCount={activeHighlights.length}
          onHighlight={highlightSelection}
          onClearHighlights={() => setHighlightsBySection((current) => ({ ...current, [section.id]: [] }))}
        />
      )}

      <section className="rw-passage" aria-label="Bài đọc">
        <h1 className="rw-passage-title">{title}</h1>
        <div ref={passageRef} className="rw-passage-scroll" aria-label="Nội dung bài đọc">
          {section.snapshot?.passage?.paragraphs.map((paragraph, index) => {
            const label = paragraph.label ?? `P${index + 1}`
            return <p key={`${label}-${index}`}>{paragraph.label ? <strong>{paragraph.label}. </strong> : null}<span data-passage-text={label}>{renderPassageText(paragraph.text, label)}</span></p>
          })}
        </div>
      </section>

      <ReadingQuestionsPanel
        section={section}
        numberByItem={numberByItem}
        answers={answers.answers}
        disabled={submitting || section.completedAt !== null}
        onChange={(itemId, value) => { answers.setAnswer(itemId, value); void answers.saveAnswer(itemId, value) }}
        onBlur={(itemId) => void answers.saveAnswer(itemId, answers.answers[itemId] ?? '')}
        onFocusQuestion={setCurrentQuestion}
      />
    </div>

    <footer className="rw-footer">
      <ReadingQuestionNav groups={navGroups} currentQuestion={currentQuestion} answeredNumbers={answeredNumbers} onSelect={goToQuestion} />
      <div className="rw-footer-actions">
        {error && <p className="rw-error" role="alert">{error}</p>}
        <button type="button" className={`rw-finish${unanswered === 0 ? ' is-ready' : ''}`} disabled={submitting} onClick={() => void submit()}>
          {submitting ? <LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> : null} Hoàn thành
        </button>
      </div>
    </footer>

    <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <DialogContent className="rw-confirm">
        <DialogTitle>Nộp bài?</DialogTitle>
        <DialogDescription>Bạn còn {unanswered} câu chưa trả lời. Sau khi nộp bạn sẽ không sửa được đáp án.</DialogDescription>
        <div className="rw-confirm-actions">
          <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>Làm tiếp</Button>
          <Button type="button" onClick={() => void submit(true)}>Nộp bài</Button>
        </div>
      </DialogContent>
    </Dialog>

  </div>
}
