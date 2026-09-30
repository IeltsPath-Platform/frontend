import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Clock, Settings, StickyNote } from 'lucide-react'
import { SiteNavbar } from '@/components/SiteNavbar'
import { PracticeSettingsPopover } from '../components/PracticeSettingsPopover'
import { PracticeAnswers } from '../components/PracticeAnswers'
import { PracticePassage } from '../components/PracticePassage'
import { PassageTools } from '../components/PassageTools'
import { PracticeProgressBar } from '../components/PracticeProgressBar'
import { QuestionMap } from '../components/QuestionMap'
import { QuestionNavigation } from '../components/QuestionNavigation'
import { FloatingNotes } from '../components/FloatingNotes'
import { FlashcardDialog } from '../components/FlashcardDialog'
import { FlashcardLibrary } from '../components/FlashcardLibrary'
import { DictionaryDialog } from '../components/DictionaryDialog'
import { canUsePassageAction, mergeHighlights } from '../lib/passageTools'
import { MOCK_QUESTIONS } from '@/mocks/practiceData'
import type { PassageAction, PassageSelection, PracticeMode, PracticeNote, TextHighlight } from '@/types/practice'
import '../workspace.css'

export interface PracticeTestPageProps {
  testId?: string
  mode?: PracticeMode
  onExit: () => void
}

const QUESTION_NUMBERS = MOCK_QUESTIONS.map(({ questionNumber }) => questionNumber)
type QuestionTransitionDirection = 'forward' | 'backward'

export function PracticeTestPage({ testId = 'snow-makers', mode = 'practice', onExit }: PracticeTestPageProps) {
  const [secondsElapsed, setSecondsElapsed] = useState(0)
  const [eyeComfort, setEyeComfort] = useState(false)
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [noteView, setNoteView] = useState<'closed' | 'expanded' | 'minimized'>('closed')
  const [notes, setNotes] = useState<PracticeNote[]>([])
  const [noteSelection, setNoteSelection] = useState<PassageSelection | null>(null)
  const [selection, setSelection] = useState<PassageSelection | null>(null)
  const [highlights, setHighlights] = useState<TextHighlight[]>([])
  const [flashcardText, setFlashcardText] = useState<string | null>(null)
  const [dictionaryText, setDictionaryText] = useState<string | null>(null)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [flagged, setFlagged] = useState<Record<number, boolean>>({})
  const [currentQuestion, setCurrentQuestion] = useState(QUESTION_NUMBERS[0])
  const [questionTransitionDirection, setQuestionTransitionDirection] = useState<QuestionTransitionDirection>('forward')
  const [message, setMessage] = useState('')
  const noteToggle = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const start = Date.now()
    const timer = setInterval(() => setSecondsElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => clearInterval(timer)
  }, [])

  function runAction(action: PassageAction, selected = selection) {
    if (!canUsePassageAction(mode, action)) return
    if (!selected) { setMessage('Hãy bôi đen một đoạn trong bài đọc trước khi chọn công cụ.'); return }
    setSelection(selected)
    if (action === 'highlight') {
      setHighlights((current) => mergeHighlights([...current, ...selected.ranges]))
      setMessage('Đã Highlight đoạn được chọn.')
    } else if (action === 'note') {
      setNoteSelection(selected)
      setNoteView('expanded')
    } else if (action === 'flashcard') setFlashcardText(selected.text)
    else setDictionaryText(selected.text)
  }

  const selectQuestion = useCallback((questionNumber: number) => {
    const currentIndex = QUESTION_NUMBERS.indexOf(currentQuestion)
    const nextIndex = QUESTION_NUMBERS.indexOf(questionNumber)
    if (nextIndex !== -1 && currentIndex !== -1 && nextIndex !== currentIndex) {
      setQuestionTransitionDirection(nextIndex > currentIndex ? 'forward' : 'backward')
    }
    setCurrentQuestion(questionNumber)
    window.requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      window.setTimeout(() => {
        const target = document.getElementById(`question-${questionNumber}`)
        target?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' })
        target?.focus({ preventScroll: true })
      }, reduceMotion ? 0 : 150)
    })
  }, [currentQuestion])

  function moveQuestion(direction: -1 | 1) {
    const currentIndex = QUESTION_NUMBERS.indexOf(currentQuestion)
    const nextQuestion = QUESTION_NUMBERS[currentIndex + direction]
    if (nextQuestion !== undefined) selectQuestion(nextQuestion)
  }

  function toggleFlag(questionNumber: number) {
    setFlagged((current) => ({ ...current, [questionNumber]: !current[questionNumber] }))
  }

  const timer = [Math.floor(secondsElapsed / 3600), Math.floor((secondsElapsed % 3600) / 60), secondsElapsed % 60]
    .map((value) => String(value).padStart(2, '0')).join(':')
  const completedCount = QUESTION_NUMBERS.filter((questionNumber) => Boolean(answers[questionNumber])).length

  return (
    <div className={`practice-workspace-root ${eyeComfort ? 'eye-comfort-active' : ''} text-scale-${fontSize}`}>
      <SiteNavbar />
      <a className="workspace-skip-link" href="#practice-workspace">Bỏ qua thanh điều khiển để đến bài đọc</a>
      <div className="screen3-sub-topbar">
        <button type="button" className="subbar-exit-btn" aria-label="Thoát bài làm" onClick={onExit}><ArrowLeft size={16} /><span>Thoát</span></button>
        <div className="practice-workspace-status">
          <div className="practice-mode-timer"><span className="practice-mode-badge">{mode === 'exam' ? 'Thi thử' : 'Luyện tập'}</span><div className="subbar-timer-pill" aria-label={`Thời gian làm bài ${timer}`}><Clock size={16} /><span className="subbar-timer-digits">{timer}</span></div></div>
          <PracticeProgressBar completed={completedCount} total={QUESTION_NUMBERS.length} />
        </div>
        <div className="subbar-right-controls">
          {mode === 'practice' && <button ref={noteToggle} type="button" className="subbar-note-btn" aria-label={`Mở ghi chú, ${notes.length} ghi chú`} aria-expanded={noteView !== 'closed'} onClick={() => setNoteView(noteView === 'expanded' ? 'closed' : 'expanded')}><StickyNote size={16} /><span>Ghi chú ({notes.length})</span></button>}
          <div className="relative"><button type="button" className="subbar-gear-btn" aria-label="Cài đặt giao diện" aria-expanded={isSettingsOpen} onClick={() => setIsSettingsOpen(!isSettingsOpen)}><Settings size={18} /></button><PracticeSettingsPopover isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} eyeComfort={eyeComfort} onToggleEyeComfort={setEyeComfort} fontSize={fontSize} onChangeFontSize={setFontSize} /></div>
        </div>
      </div>
      <main id="practice-workspace" className="screen3-body-layout" tabIndex={-1}>
          <div className="workspace-left-column">
            <QuestionMap questionNumbers={QUESTION_NUMBERS} answers={answers} flagged={flagged} currentQuestion={currentQuestion} onSelectQuestion={selectQuestion}
              navigation={<QuestionNavigation questionNumbers={QUESTION_NUMBERS} currentQuestion={currentQuestion} onPrevious={() => moveQuestion(-1)} onNext={() => moveQuestion(1)} />} />
          </div>
          <div className="screen3-center-column">
            {mode === 'practice' && <PassageTools selection={selection} highlightsCount={highlights.length} onAction={runAction} onClearHighlights={() => { setHighlights([]); setMessage('Đã bỏ Highlight.') }} onOpenLibrary={() => setLibraryOpen(true)} />}
            <PracticePassage mode={mode} highlights={highlights} onSelection={setSelection} onAction={runAction} />
            <p className="practice-feedback" role="status" aria-live="polite">{message}</p>
          </div>
          <PracticeAnswers answers={answers} flagged={flagged} currentQuestion={currentQuestion}
            transitionDirection={questionTransitionDirection}
            onAnswer={(number, value) => { setCurrentQuestion(number); setAnswers((current) => ({ ...current, [number]: value })) }}
            onToggleFlag={toggleFlag} />
      </main>
      {mode === 'practice' && <>
        <FloatingNotes open={noteView !== 'closed'} minimized={noteView === 'minimized'} onMinimize={(minimized) => setNoteView(minimized ? 'minimized' : 'expanded')} notes={notes} selection={noteSelection}
          onClose={() => { setNoteView('closed'); noteToggle.current?.focus() }}
          onAdd={(noteText) => setNotes((current) => [{
            id: crypto.randomUUID(), testId, noteText, selectedText: noteSelection?.text || '',
            paragraphLabel: noteSelection ? `Đoạn ${noteSelection.ranges.map((range) => range.paragraph).join(', ')}` : 'Ghi chú chung',
            createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          }, ...current])}
          onDelete={(id) => setNotes((current) => current.filter((note) => note.id !== id))} />
        {flashcardText !== null && <FlashcardDialog text={flashcardText} testId={testId} onClose={() => setFlashcardText(null)} onSaved={() => setMessage('Đã lưu Flashcard trên trình duyệt này. Mở “Thẻ đã lưu” để xem.')} />}
        {dictionaryText !== null && <DictionaryDialog text={dictionaryText} onClose={() => setDictionaryText(null)} />}
        {libraryOpen && <FlashcardLibrary onClose={() => setLibraryOpen(false)} />}
      </>}
    </div>
  )
}
