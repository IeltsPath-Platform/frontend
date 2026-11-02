import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, LoaderCircle } from 'lucide-react'
import type { AttemptItemResponse } from '~types/learningPath'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { LoadingState, ApiErrorState } from '@/features/learning-path/components/PageState'
import { useApiResource } from '@/features/learning-path/lib/useApiResource'
import type { TestSection } from '@/features/learning-path/lib/attemptSnapshot'
import { useAttemptAnswers } from '@/features/learning-path/lib/useAttemptAnswers'
import '@/features/learning-path/learning-path.css'
import { ReadingQuestionNav, ReadingTopBar } from '../reading/ReadingWorkspaceParts'
import type { QuestionNavGroup, WorkspaceFontSize } from '../reading/ReadingWorkspaceParts'
import { ReadingQuestionsPanel } from '../reading/ReadingQuestionsPanel'
import { ExamNotesPanel, ExamSelectionPopup } from '../reading/ExamAnnotationUi'
import { useExamAnnotations } from '../reading/useExamAnnotations'
import { parseSections } from '../reading/readingSections'
import { clockSeconds, isTypingTarget, toSavedResponses } from '../reading/workspace-support'
import { getAttemptResponses, getAttemptStructure, getReadingAttempt, saveAttemptAnswer, startAttemptSection, submitReadingAttempt } from '../reading/readingPracticeApi'
import type { ReadingAttempt } from '../reading/readingPracticeApi'
import { ListeningAudioBar } from './ListeningAudioBar'
import { ListeningExamAudio } from './ListeningExamAudio'
import { ListeningSectionHeader } from './ListeningSectionHeader'
import { ListeningToolRail } from './ListeningToolRail'
import { readPlayedSections, writePlayedSections } from './examPlayback'
import '../reading/reading-practice.css'
import '../reading/reading-workspace.css'
import '../reading/reading-exam-annotations.css'
import '../reading/reading-workspace-practice.css'
import './listening-workspace.css'
import './listening-practice.css'

const CATALOG_PATH = '/practice-tests?skill=listening'

export function ListeningPracticePage() {
  const { attemptId = '' } = useParams()
  const resource = useApiResource(`listening-attempt:${attemptId}`, async () => {
    const [attempt, structure, responses] = await Promise.all([
      getReadingAttempt(attemptId), getAttemptStructure(attemptId), getAttemptResponses(attemptId),
    ])
    return { attempt, sections: parseSections(structure), saved: toSavedResponses(responses) }
  })

  if (!attemptId) return <Navigate replace to={CATALOG_PATH} />
  if (resource.status === 'loading') return <LoadingState label="Đang tải bài Listening…" />
  if (resource.status === 'error' && resource.error) return <ApiErrorState error={resource.error} onRetry={resource.reload} />
  if (!resource.data) return null
  if (resource.data.attempt.status === 'SUBMITTED') return <Navigate replace to={`/practice/listening/attempts/${attemptId}/result`} />
  if (resource.data.attempt.status && resource.data.attempt.status !== 'IN_PROGRESS') return <Navigate replace to={CATALOG_PATH} />
  return <ListeningRunner key={attemptId} attemptId={attemptId} attempt={resource.data.attempt} sections={resource.data.sections} saved={resource.data.saved} />
}

function ListeningRunner({ attemptId, attempt, sections, saved }: {
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
  // The learner can close the notes panel; adding or reopening a note shows it again.
  const [notesClosed, setNotesClosed] = useState(false)
  const [hint, setHint] = useState('')
  // Exam only: the parts whose recording has started. Each plays once.
  const [played, setPlayed] = useState<ReadonlySet<string>>(() => readPlayedSections(attemptId))
  // Highlights and notes go on the questions; the recording has no text to mark, so the passage pane stays empty.
  const passageRef = useRef<HTMLElement | null>(null)
  const questionsRef = useRef<HTMLDivElement>(null)
  const activeSectionRef = useRef<string | undefined>(sections[0]?.id)
  const spentRef = useRef<Record<string, number>>({})
  const submittingRef = useRef(false)
  const autoSubmitRef = useRef<() => void>(() => undefined)
  const timed = attempt.mode === 'TIMED'
  const answers = useAttemptAnswers(attemptId, saved, async (id, itemId, answer, revision) => saveAttemptAnswer(id, itemId, answer, revision))
  const section = sections[activeIndex]
  const annotations = useExamAnnotations({ enabled: true, sectionId: section?.id, passageRef, questionsRef })
  // A fresh selection (not a click on a mark) is waiting for Highlight or Notes.
  const hasSelection = annotations.popup !== null && annotations.popup.annotationId === null
  const hasNotes = !notesClosed && annotations.notes.length > 0
  const allItems = useMemo(() => sections.flatMap((item) => item.items.filter((question) => question.question !== null)), [sections])
  // One continuous numbering across every section, in the order the learner sees the questions.
  const numberByItem = useMemo(() => new Map(allItems.map((item, index) => [item.id, index + 1])), [allItems])
  // Both layouts show only the open section's numbers; the others fold to "Section 2  0 of 10". The exam says "Part N".
  const navGroups = useMemo<QuestionNavGroup[]>(() => sections.map((candidate, index) => ({
    label: `${timed ? 'Part' : 'Section'} ${candidate.partNo ?? index + 1}`,
    numbers: candidate.items.flatMap((item) => (item.question ? [numberByItem.get(item.id) ?? 0] : [])),
    active: index === activeIndex,
  })), [sections, numberByItem, timed, activeIndex])
  const answeredNumbers = useMemo(() => new Set(allItems.filter((item) => Boolean(answers.answers[item.id]?.trim())).map((item) => numberByItem.get(item.id) ?? 0)), [allItems, answers.answers, numberByItem])
  const unanswered = allItems.length - answeredNumbers.size

  useEffect(() => {
    const firstSection = sections[0]
    if (firstSection) void startAttemptSection(attemptId, firstSection.id).catch(() => undefined)
  }, [attemptId, sections])

  useEffect(() => {
    const id = window.setInterval(() => {
      setSeconds(clockSeconds(attempt, timed))
      // Time only counts while the page is in view and a section is open.
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
      navigate(`/practice/listening/attempts/${attemptId}/result`, { replace: true })
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

  function markPlayed(sectionId: string) {
    setPlayed((current) => {
      if (current.has(sectionId)) return current
      const next = new Set(current).add(sectionId)
      writePlayedSections(attemptId, next)
      return next
    })
  }

  /** The recording of a part is over: after a short pause the next part opens, and its recording starts. */
  function audioEnded(endedSectionId: string, endedIndex: number) {
    const nextNumber = navGroups[endedIndex + 1]?.numbers[0]
    if (nextNumber === undefined) return
    window.setTimeout(() => {
      // The learner may have moved on already; then nothing is left to do.
      if (activeSectionRef.current === endedSectionId) goToQuestion(nextNumber)
    }, 2000)
  }

  function highlightSelection() {
    if (!hasSelection) { setHint('Bôi đen chữ trong câu hỏi, rồi bấm Highlight.'); return }
    setHint('')
    annotations.highlight()
  }

  /** With text selected, Notes starts a note on it; otherwise it shows or hides the panel of the notes already written. */
  function openNotes() {
    if (hasSelection) { setHint(''); setNotesClosed(false); annotations.note(); return }
    if (annotations.notes.length === 0) { setHint('Bôi đen chữ trong câu hỏi, rồi bấm Notes.'); return }
    setHint('')
    setNotesClosed((closed) => !closed)
  }

  const shortcutsRef = useRef({ highlight: highlightSelection, notes: openNotes })
  useEffect(() => { shortcutsRef.current = { highlight: highlightSelection, notes: openNotes } })
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey || isTypingTarget(event.target)) return
      if (event.key === 'h' || event.key === 'H') shortcutsRef.current.highlight()
      else if (event.key === 'n' || event.key === 'N') shortcutsRef.current.notes()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  if (!section || sections.length === 0) return <main className="reading-state reading-empty"><h1>Đề chưa có câu hỏi</h1><Link to={CATALOG_PATH}>Về danh mục Listening</Link></main>

  const audio = section.snapshot?.audio
  const title = section.snapshot?.title ?? `Section ${section.partNo ?? activeIndex + 1}`
  const partLabel = `Part ${section.partNo ?? activeIndex + 1}`
  const sectionNumbers = navGroups[activeIndex]?.numbers ?? []

  return <div className={`rw-root lw-root lp-tokens${timed ? ' rw-exam' : ` rw-practice${eyeComfort ? ' rw-eye-comfort' : ''}`}${hasNotes ? ' rw-has-notes' : ''} rw-text-${fontSize}`}>
    <ReadingTopBar
      seconds={seconds}
      timed={timed}
      exitTo={CATALOG_PATH}
      eyeComfort={eyeComfort}
      onToggleEyeComfort={setEyeComfort}
      fontSize={fontSize}
      onChangeFontSize={setFontSize}
    />

    {timed ? (
      <div className="rw-exam-banner lw-exam-banner">
        <div>
          <strong>{partLabel}</strong>
          {sectionNumbers.length > 0 && <p>Listen and answer questions {sectionNumbers[0]}–{sectionNumbers[sectionNumbers.length - 1]}.</p>}
        </div>
        {audio
          ? (
            <ListeningExamAudio
              key={section.id}
              src={audio.mediaUrl}
              alreadyPlayed={played.has(section.id)}
              onStarted={() => markPlayed(section.id)}
              onEnded={() => audioEnded(section.id, activeIndex)}
            />
          )
          : <p className="lw-audio-error" role="alert">Phần này chưa có bài nghe.</p>}
      </div>
    ) : null}

    <div className={`rw-body lw-body${timed ? ' rw-body-exam' : ''}`}>
      {!timed && <ListeningToolRail hasSelection={hasSelection} hint={hint} notesCount={annotations.notes.length} onHighlight={highlightSelection} onNotes={openNotes} />}

      <div className="lw-main">
        {!timed && (
          <ListeningSectionHeader
            sectionLabel={`Section ${section.partNo ?? activeIndex + 1}`}
            title={title}
            instructions={section.snapshot?.instructions ?? null}
            numbers={sectionNumbers}
            answeredNumbers={answeredNumbers}
          />
        )}
        <ReadingQuestionsPanel
          section={section}
          label="Câu hỏi Listening"
          scrollRef={questionsRef}
          matchingBoard
          numberByItem={numberByItem}
          answers={answers.answers}
          disabled={submitting || section.completedAt !== null}
          onChange={(itemId, value) => { answers.setAnswer(itemId, value); void answers.saveAnswer(itemId, value) }}
          onBlur={(itemId) => void answers.saveAnswer(itemId, answers.answers[itemId] ?? '')}
          onFocusQuestion={setCurrentQuestion}
        />
      </div>

      {timed && (
        <div className="rw-exam-arrows">
          <button type="button" className="rw-arrow rw-arrow-prev" aria-label="Câu trước" disabled={currentQuestion <= 1} onClick={() => goToQuestion(currentQuestion - 1)}>
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
          <button type="button" className="rw-arrow rw-arrow-next" aria-label="Câu tiếp theo" disabled={currentQuestion >= allItems.length} onClick={() => goToQuestion(currentQuestion + 1)}>
            <ArrowRight size={20} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>

    {!timed && (audio
      ? <ListeningAudioBar key={section.id} src={audio.mediaUrl} durationHint={audio.durationSeconds} layout="dock" />
      : <p className="lw-audio lw-audio-error" role="alert">Section này chưa có bài nghe.</p>)}

    <footer className="rw-footer">
      <ReadingQuestionNav groups={navGroups} alwaysLabel collapseInactive currentQuestion={currentQuestion} answeredNumbers={answeredNumbers} onSelect={goToQuestion} />
      <div className="rw-footer-actions">
        {error && <p className="rw-error" role="alert">{error}</p>}
        <button type="button" className={`rw-finish${unanswered === 0 ? ' is-ready' : ''}`} disabled={submitting} aria-label={timed ? 'Hoàn thành bài làm' : undefined} onClick={() => void submit()}>
          {submitting ? <LoaderCircle className="animate-spin" size={timed ? 20 : 16} aria-hidden="true" /> : timed ? <Check size={22} aria-hidden="true" /> : null}{timed ? '' : ' Hoàn thành'}
        </button>
      </div>
    </footer>

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
        partLabel={timed ? partLabel : `Section ${section.partNo ?? activeIndex + 1}`}
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
