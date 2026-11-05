import { VocabularyShell } from '../components/VocabularyShell'
import { useEffect, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { X, RefreshCw, AlertCircle, Sparkles } from 'lucide-react'
import { CorrectBurst } from '@/features/flashcards/components/CorrectBurst'
import { StudyHero } from '@/features/flashcards/components/StudyHero'
import {
  notebookApi,
  type NotebookEntryResponse,
  type VocabularySetDetail,
} from '../api/notebookApi'
import {
  buildMixedModeQuestions,
  type QuizQuestion,
} from '../lib/quiz'
import { FlashcardReviewCard } from '../components/review/FlashcardReviewCard'
import { MeaningGuessCard } from '../components/review/MeaningGuessCard'
import { TypingReviewCard } from '../components/review/TypingReviewCard'
import { FillInBlankReviewCard } from '../components/review/FillInBlankReviewCard'
import { SentenceWritingCard } from '../components/review/SentenceWritingCard'
import { ReviewSummaryView } from '../components/review/ReviewSummaryView'
import { SkipConfirmDialog } from '../components/review/SkipConfirmDialog'
import '../vocabulary-notebook.css'

function SetStudyContent() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [setDetail, setSetDetail] = useState<VocabularySetDetail | null>(null)
  const [sessionId] = useState(() =>
    typeof crypto !== 'undefined' ? crypto.randomUUID() : `session-set-${Date.now()}`
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [combo, setCombo] = useState(0)
  const [wrongEntries, setWrongEntries] = useState<NotebookEntryResponse[]>([])
  const [isFinished, setIsFinished] = useState(false)
  const [isSkipDialogOpen, setIsSkipDialogOpen] = useState(false)

  const requestIdMapRef = useRef<Map<number, string>>(new Map())

  const getOrCreateRequestId = (qIndex: number) => {
    let rid = requestIdMapRef.current.get(qIndex)
    if (!rid) {
      rid = typeof crypto !== 'undefined' ? crypto.randomUUID() : `req-${Date.now()}-${qIndex}`
      requestIdMapRef.current.set(qIndex, rid)
    }
    return rid
  }

  // Load set detail and set words
  useEffect(() => {
    if (!id) return
    const controller = new AbortController()

    Promise.all([
      notebookApi.getSetDetail(id, controller.signal),
      notebookApi.getSetWords(id, { size: 50 }, controller.signal),
    ])
      .then(([detail, wordsPage]) => {
        setSetDetail(detail)
        const items = wordsPage.items || []

        if (items.length === 0) {
          setError('Bộ từ này hiện chưa có từ vựng nào để học.')
          return
        }

        // Convert catalog items into NotebookEntryResponse format for quiz engine
        const entries: NotebookEntryResponse[] = items.map((item, idx) => {
          const sense = item.senses[0]
          return {
            flashcardId: `set-card-${item.id}-${idx}`,
            vocabularySenseId: sense?.id || '',
            vocabularyItemId: item.id,
            lemma: item.lemma,
            ipa: item.ipa || item.ipaUk || item.ipaUs || null,
            pronunciationAudioReference: item.pronunciationAudioReference || null,
            partOfSpeech: sense?.partOfSpeech || null,
            vietnameseMeaning: sense?.vietnameseMeaning || null,
            englishDefinition: sense?.englishDefinition || null,
            exampleSentence: sense?.exampleSentence || null,
            imageUrl: null,
            level: 'LEARNING',
            leitnerBox: 2,
            reviewCount: 0,
            lastReviewedAt: null,
            nextReviewAt: null,
            createdAt: new Date().toISOString(),
            note: null,
            cefrLevel: sense?.cefrLevel || null,
            topicName: sense?.topicName || null,
          }
        })

        const generatedQuestions = buildMixedModeQuestions(entries)
        setQuestions(generatedQuestions)
        setCurrentIndex(0)
        setCorrectCount(0)
        setCombo(0)
        setWrongEntries([])
        setIsFinished(false)
        setError(null)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setError('Không tải được bài học cho bộ từ này. Vui lòng thử lại.')
        }
      })
      .finally(() => {
        setIsLoading(false)
      })

    return () => controller.abort()
  }, [id])

  // Process user answer
  const handleAnswer = async (correct: boolean) => {
    const currentQ = questions[currentIndex]
    if (!currentQ) return

    const reqId = getOrCreateRequestId(currentIndex)

    if (correct) {
      setCorrectCount((prev) => prev + 1)
      setCombo((prev) => prev + 1)
    } else {
      setCombo(0)
      setWrongEntries((prev) => {
        if (prev.some((e) => e.flashcardId === currentQ.entry.flashcardId)) return prev
        return [...prev, currentQ.entry]
      })
    }

    // Best-effort flashcard review submission
    if (currentQ.entry.flashcardId && !currentQ.entry.flashcardId.startsWith('set-card-')) {
      try {
        await notebookApi.reviewFlashcard(currentQ.entry.flashcardId, correct, reqId, sessionId)
      } catch {
        // ignore offline review error
      }
    }

    // Advance to next question
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1)
    } else {
      setIsFinished(true)
    }
  }

  const handleRestartWrong = () => {
    if (wrongEntries.length === 0) return
    const reQuiz = buildMixedModeQuestions(wrongEntries)
    setQuestions(reQuiz)
    setCurrentIndex(0)
    setCorrectCount(0)
    setCombo(0)
    setWrongEntries([])
    setIsFinished(false)
    requestIdMapRef.current.clear()
  }

  if (isLoading) {
    return (
      <div className="vocab-quiz-layout">
        <div style={{ textAlign: 'center', color: '#64748b', padding: '4rem 1rem' }}>
          <RefreshCw size={36} className="animate-spin" style={{ color: '#2563eb', margin: '0 auto 1rem' }} />
          <p style={{ fontWeight: 600 }}>Đang khởi tạo lộ trình học bộ từ…</p>
        </div>
      </div>
    )
  }

  if (error || questions.length === 0) {
    return (
      <div className="vocab-quiz-layout">
        <div
          style={{
            maxWidth: '460px',
            margin: '4rem auto',
            padding: '2rem',
            background: '#ffffff',
            borderRadius: '1.25rem',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          }}
        >
          <AlertCircle size={48} style={{ color: '#dc2626', margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem', color: '#0f172a' }}>
            {error || 'Chưa có từ vựng'}
          </h2>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.5rem' }}>
            <Link
              to={`/vocabulary/sets/${id}`}
              style={{
                background: '#2563eb',
                color: 'white',
                padding: '0.6rem 1.25rem',
                borderRadius: '0.5rem',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Quay lại bộ từ
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (isFinished) {
    return (
      <div className="vocab-quiz-layout">
        <ReviewSummaryView
          totalQuestions={questions.length}
          correctCount={correctCount}
          wrongEntries={wrongEntries}
          onRetryWrong={handleRestartWrong}
        />
      </div>
    )
  }

  const currentQ = questions[currentIndex]
  const modeUpper = String(currentQ.mode).toUpperCase()

  return (
    <div className="vocab-quiz-layout">
      <StudyHero
        eyebrow="Học bộ từ"
        title={setDetail?.title || 'Học bộ từ'}
        progress={{ label: 'Câu', value: currentIndex + 1, max: questions.length }}
        owlPose={combo >= 3 ? 'party' : 'confident'}
        badge={combo >= 2 ? <span key={combo} className="study-streak"><Sparkles size={16} aria-hidden="true" />Chuỗi {combo} đúng!</span> : undefined}
        action={<button type="button" onClick={() => setIsSkipDialogOpen(true)} aria-label="Thoát phiên học"><X size={18} aria-hidden="true" />Thoát</button>}
      />

      <div className="review-stage">
        {correctCount > 0 && <CorrectBurst key={correctCount} streak={combo} />}
        {modeUpper === 'FLASHCARD' && (
          <FlashcardReviewCard key={currentQ.id} question={currentQ} onAnswer={handleAnswer} />
        )}
        {(modeUpper === 'MEANING' || modeUpper === 'MEANING_GUESS' || modeUpper === 'MEANING-GUESS') && (
          <MeaningGuessCard key={currentQ.id} question={currentQ} onAnswer={handleAnswer} />
        )}
        {modeUpper === 'TYPING' && (
          <TypingReviewCard key={currentQ.id} question={currentQ} onAnswer={handleAnswer} isDictation={false} />
        )}
        {modeUpper === 'DICTATION' && (
          <TypingReviewCard key={currentQ.id} question={currentQ} onAnswer={handleAnswer} isDictation={true} />
        )}
        {(modeUpper === 'FILL-IN-BLANK' || modeUpper === 'FILL_IN_BLANK' || modeUpper === 'FILL-BLANK') && (
          <FillInBlankReviewCard key={currentQ.id} question={currentQ} onAnswer={handleAnswer} />
        )}
        {(modeUpper === 'SENTENCE' || modeUpper === 'SENTENCE_WRITING' || modeUpper === 'SENTENCE-WRITING') && (
          <SentenceWritingCard key={currentQ.id} question={currentQ} onAnswer={handleAnswer} />
        )}
      </div>

      {/* Skip Confirmation Dialog */}
      <SkipConfirmDialog
        isOpen={isSkipDialogOpen}
        onCancel={() => setIsSkipDialogOpen(false)}
        onConfirm={() => {
          setIsSkipDialogOpen(false)
          navigate(`/vocabulary/sets/${id}`)
        }}
      />
    </div>
  )
}

/** Same frame as the rest of the vocabulary area, so the site navbar stays available on every screen. */
export function SetStudyPage() {
  return (
    <VocabularyShell>
      <SetStudyContent />
    </VocabularyShell>
  )
}
