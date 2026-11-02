import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, LoaderCircle } from 'lucide-react'
import type { AttemptItemResponse } from '~types/learningPath'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { ReadingQuestionNav, ReadingSplitHandle, ReadingToolRail, ReadingTopBar } from './ReadingWorkspaceParts'
import type { QuestionNavGroup, WorkspaceFontSize } from './ReadingWorkspaceParts'
import { ReadingQuestionsPanel } from './ReadingQuestionsPanel'
import { ExamNotesPanel, ExamSelectionPopup } from './ExamAnnotationUi'
import { ExamFinishBar } from './ExamFinishBar'
import { useExamAnnotations } from './useExamAnnotations'
import { useWordLookup } from './useWordLookup'
import { WordLookupPopover } from './WordLookupPopover'
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
import './reading-workspace-practice.css'

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
  // Exam layout: the screen the tick opens, before the learner confirms the submission.
  const [finishing, setFinishing] = useState(false)
  // The learner can close the notes panel; adding or reopening a note shows it again.
  const [notesClosed, setNotesClosed] = useState(false)
  // Share of the width the passage takes in the exam layout; the learner drags the divider to change it.
  const [split, setSplit] = useState(50)
  const passageRef = useRef<HTMLDivElement>(null)
  const questionsRef = useRef<HTMLDivElement>(null)
  const activeSectionRef = useRef<string | undefined>(sections[0]?.id)
  const spentRef = useRef<Record<string, number>>({})
  const submittingRef = useRef(false)
  const autoSubmitRef = useRef<() => void>(() => undefined)
  const timed = attempt.mode === 'TIMED'
  const answers = useAttemptAnswers(attemptId, saved, async (id, itemId, answer, revision) => saveAttemptAnswer(id, itemId, answer, revision))
  const section = sections[activeIndex]
  // Highlights and notes work the same in both layouts.
  const annotations = useExamAnnotations({ enabled: true, sectionId: section?.id, passageRef, questionsRef })
  // Practice layout only: clicking a word of the passage looks it up in the vocabulary library.
  const wordLookup = useWordLookup(!timed)
  const allItems = useMemo(() => sections.flatMap((item) => item.items.filter((question) => question.question !== null)), [sections])
  // One continuous numbering across every passage, in the order the learner sees the questions.
  const numberByItem = useMemo(() => new Map(allItems.map((item, index) => [item.id, index + 1])), [allItems])
  const navGroups = useMemo<QuestionNavGroup[]>(() => sections.map((candidate, index) => ({
    label: `${timed ? 'Part' : 'Passage'} ${candidate.partNo ?? index + 1}`,
    numbers: candidate.items.flatMap((item) => (item.question ? [numberByItem.get(item.id) ?? 0] : [])),
    active: index === activeIndex && !finishing,
  })), [sections, numberByItem, timed, activeIndex, finishing])
  const answeredNumbers = useMemo(() => new Set(allItems.filter((item) => Boolean(answers.answers[item.id]?.trim())).map((item) => numberByItem.get(item.id) ?? 0)), [allItems, answers.answers, numberByItem])
  const unanswered = allItems.length - answeredNumbers.size

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
    wordLookup.close()
  }

  function goToQuestion(questionNumber: number) {
    const target = allItems[questionNumber - 1]
    if (!target) return
    setFinishing(false)
    setCurrentQuestion(questionNumber)
    const targetSection = sections.findIndex((candidate) => candidate.items.some((item) => item.id === target.id))
    const reveal = () => window.setTimeout(() => document.getElementById(`reading-question-${target.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0)
    if (targetSection >= 0 && targetSection !== activeIndex) void selectSection(targetSection).then(reveal)
    else reveal()
  }

  // Practice layout: the H key highlights the selected text, as the tool rail says.
  const highlightRef = useRef(annotations.highlight)
  useEffect(() => { highlightRef.current = annotations.highlight })
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

  // A click on marked text opens its Clear card, so it does not also look the word up.
  function onPassageClick(event: ReactMouseEvent<HTMLElement>) {
    if (annotations.popup?.annotationId) { wordLookup.close(); return }
    wordLookup.onClick(event)
  }

  if (!section || sections.length === 0) return <main className="reading-state reading-empty"><h1>Đề chưa có câu hỏi</h1><Link to={CATALOG_PATH}>Về danh mục Reading</Link></main>

  const title = section.snapshot?.title ?? `Passage ${section.partNo ?? activeIndex + 1}`
  const partLabel = `${timed ? 'Part' : 'Passage'} ${section.partNo ?? activeIndex + 1}`
  const sectionNumbers = navGroups[activeIndex]?.numbers ?? []
  const hasNotes = !notesClosed && annotations.notes.length > 0

  return <div className={`rw-root lp-tokens${timed ? ' rw-exam' : ' rw-practice'}${hasNotes ? ' rw-has-notes' : ''}${eyeComfort ? ' rw-eye-comfort' : ''} rw-text-${fontSize}`}>
    <ReadingTopBar
      seconds={seconds}
      timed={timed}
      showClock={!finishing}
      exitTo={CATALOG_PATH}
      eyeComfort={eyeComfort}
      onToggleEyeComfort={setEyeComfort}
      fontSize={fontSize}
      onChangeFontSize={setFontSize}
    />

    {timed && finishing && <ExamFinishBar onNext={() => void submit(true)} />}
    {timed && !finishing && sectionNumbers.length > 0 && (
      <div className="rw-exam-banner">
        <strong>{partLabel}</strong>
        <p>Read the text and answer questions {sectionNumbers[0]}–{sectionNumbers[sectionNumbers.length - 1]}.</p>
      </div>
    )}

    <div className={`rw-body${timed ? ' rw-body-exam' : ''}${finishing ? ' rw-body-finish' : ''}`} style={timed ? ({ '--rw-split': split } as CSSProperties) : undefined}>
      {!timed && (
        <ReadingToolRail onHighlight={annotations.highlight} onNote={() => { setNotesClosed(false); annotations.note() }} />
      )}

      <section className="rw-passage" aria-label="Bài đọc">
        <h1 className="rw-passage-title">{title}</h1>
        <div ref={passageRef} className="rw-passage-scroll" aria-label="Nội dung bài đọc" onClick={onPassageClick} onMouseMove={wordLookup.onMouseMove} onMouseLeave={wordLookup.onMouseLeave} onScroll={() => { if (wordLookup.state) wordLookup.close() }}>
          {section.snapshot?.passage?.paragraphs.map((paragraph, index) => {
            const label = paragraph.label ?? `P${index + 1}`
            return <p key={`${label}-${index}`}>{paragraph.label ? <strong>{paragraph.label}. </strong> : null}<span data-passage-text={label}>{paragraph.text}</span></p>
          })}
        </div>
      </section>

      {timed && <ReadingSplitHandle value={split} onChange={setSplit} />}

      <ReadingQuestionsPanel
        section={section}
        scrollRef={questionsRef}
        numberByItem={numberByItem}
        answers={answers.answers}
        disabled={submitting || section.completedAt !== null}
        onChange={(itemId, value) => { answers.setAnswer(itemId, value); void answers.saveAnswer(itemId, value) }}
        onBlur={(itemId) => void answers.saveAnswer(itemId, answers.answers[itemId] ?? '')}
        onFocusQuestion={setCurrentQuestion}
      />

      {timed && (
        <div className="rw-exam-arrows">
          <button type="button" className="rw-arrow rw-arrow-prev" aria-label={finishing ? 'Quay lại bài làm' : 'Câu trước'} disabled={!finishing && currentQuestion <= 1} onClick={() => (finishing ? setFinishing(false) : goToQuestion(currentQuestion - 1))}>
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
          <button type="button" className="rw-arrow rw-arrow-next" aria-label="Câu tiếp theo" disabled={finishing || currentQuestion >= allItems.length} onClick={() => goToQuestion(currentQuestion + 1)}>
            <ArrowRight size={20} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>

    <footer className="rw-footer">
      <ReadingQuestionNav groups={navGroups} alwaysLabel={timed} collapseInactive={timed} currentQuestion={currentQuestion} answeredNumbers={answeredNumbers} onSelect={goToQuestion} />
      <div className="rw-footer-actions">
        {error && <p className="rw-error" role="alert">{error}</p>}
        <button type="button" className={`rw-finish${unanswered === 0 ? ' is-ready' : ''}${finishing ? ' is-finishing' : ''}`} disabled={submitting} aria-label={timed ? 'Hoàn thành bài làm' : undefined} onClick={() => (timed && !finishing ? setFinishing(true) : void submit(timed))}>
          {submitting ? <LoaderCircle className="animate-spin" size={timed ? 20 : 16} aria-hidden="true" /> : timed ? <Check size={22} aria-hidden="true" /> : null}{timed ? '' : ' Hoàn thành'}
        </button>
      </div>
    </footer>

    {wordLookup.state && <WordLookupPopover state={wordLookup.state} onClose={wordLookup.close} onRetry={wordLookup.retry} />}
    <ExamSelectionPopup
      popup={annotations.popup}
      onNote={() => { setNotesClosed(false); annotations.note() }}
      onOpenNote={() => { setNotesClosed(false); annotations.openNote() }}
      onHighlight={annotations.highlight}
      onClear={annotations.clear}
    />
    {hasNotes && (
      <ExamNotesPanel
        notes={annotations.notes}
        partLabel={partLabel}
        focusId={annotations.focusNoteId}
        onChange={annotations.setNoteText}
        onDelete={annotations.remove}
        onDeleteAll={annotations.removeNotes}
        onFocused={annotations.noteFocused}
        onClose={() => setNotesClosed(true)}
      />
    )}

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
