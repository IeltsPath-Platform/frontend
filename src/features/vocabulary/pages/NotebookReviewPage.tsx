import { VocabularyShell } from '../components/VocabularyShell'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { X, RefreshCw, AlertCircle, Flame } from 'lucide-react'
import {
  notebookApi,
  type NotebookEntryResponse,
} from '../api/notebookApi'
import {
  buildQuizQuestions,
  buildMixedModeQuestions,
  type QuizMode,
  type QuizQuestion,
} from '../lib/quiz'
import { type UnderstandingLevel } from '../lib/understanding'
import { FlashcardReviewCard } from '../components/review/FlashcardReviewCard'
import { MeaningGuessCard } from '../components/review/MeaningGuessCard'
import { TypingReviewCard } from '../components/review/TypingReviewCard'
import { FillInBlankReviewCard } from '../components/review/FillInBlankReviewCard'
import { SentenceWritingCard } from '../components/review/SentenceWritingCard'
import { ReviewSummaryView } from '../components/review/ReviewSummaryView'
import { SkipConfirmDialog } from '../components/review/SkipConfirmDialog'
import '../vocabulary-notebook.css'

function NotebookReviewContent() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const levelParam = searchParams.get('level') as UnderstandingLevel | null
  const modeParam = (searchParams.get('mode') as QuizMode) || 'mixed'
  const senseIdParam = searchParams.get('senseId')

  // Review session state
  const [sessionId] = useState(() =>
    typeof crypto !== 'undefined' ? crypto.randomUUID() : `session-${Date.now()}`
  )
  const [reloadKey, setReloadKey] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Questions and progress
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [combo, setCombo] = useState(0)
  const [wrongEntries, setWrongEntries] = useState<NotebookEntryResponse[]>([])
  const [isFinished, setIsFinished] = useState(false)

  // Skip modal
  const [isSkipDialogOpen, setIsSkipDialogOpen] = useState(false)

  // Stable request ID per question
  const requestIdMapRef = useRef<Map<number, string>>(new Map())

  const getOrCreateRequestId = (qIndex: number) => {
    let rid = requestIdMapRef.current.get(qIndex)
    if (!rid) {
      rid = typeof crypto !== 'undefined' ? crypto.randomUUID() : `req-${Date.now()}-${qIndex}`
      requestIdMapRef.current.set(qIndex, rid)
    }
    return rid
  }

  // Load cards for review
  useEffect(() => {
    let ignore = false
    const controller = new AbortController()

    const fetchCards = async () => {
      try {
        let rawEntries: NotebookEntryResponse[] = []

        if (levelParam) {
          const res = await notebookApi.getNotebookEntries({ level: [levelParam], size: 50 }, controller.signal)
          rawEntries = res.items
        } else {
          const dueRes = await notebookApi.getDueFlashcards({ limit: 50 }, controller.signal)
          if (dueRes.items && dueRes.items.length > 0) {
            rawEntries = dueRes.items.map((item) => ({
              flashcardId: item.id,
              vocabularySenseId: item.vocabularySenseId ?? '',
              vocabularyItemId: '',
              lemma: item.front,
              ipa: item.ipa,
              pronunciationAudioReference: item.pronunciationAudioReference,
              partOfSpeech: null,
              vietnameseMeaning: item.back,
              englishDefinition: null,
              exampleSentence: item.exampleSentence,
              imageUrl: item.imageUrl,
              level: (item.leitnerBox >= 4 ? 'MASTERED' : item.leitnerBox >= 3 ? 'LEARNING' : item.leitnerBox >= 2 ? 'FAMILIAR' : 'UNKNOWN') as UnderstandingLevel,
              leitnerBox: item.leitnerBox,
              reviewCount: 0,
              lastReviewedAt: null,
              nextReviewAt: item.nextReviewAt,
              createdAt: new Date().toISOString(),
              note: null,
            }))
          } else {
            const recentRes = await notebookApi.getNotebookEntries({ size: 30 }, controller.signal)
            rawEntries = recentRes.items
          }
        }

        if (senseIdParam) {
          rawEntries = rawEntries.filter((e) => e.vocabularySenseId === senseIdParam)
        }

        if (ignore) return

        if (rawEntries.length === 0) {
          setQuestions([])
          setIsLoading(false)
          return
        }

        let generatedQuestions: QuizQuestion[] = []
        if (modeParam === 'mixed') {
          generatedQuestions = buildMixedModeQuestions(rawEntries)
        } else {
          generatedQuestions = buildQuizQuestions(rawEntries, modeParam)
        }

        setQuestions(generatedQuestions)
        setIsLoading(false)
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Không thể tải phiên ôn tập.')
          setIsLoading(false)
        }
      }
    }

    fetchCards()

    return () => {
      ignore = true
      controller.abort()
    }
  }, [levelParam, modeParam, senseIdParam, reloadKey])

  // Answer handler
  const handleAnswer = async (correct: boolean) => {
    if (currentIndex >= questions.length) return
    const currentQ = questions[currentIndex]
    const reqId = getOrCreateRequestId(currentIndex)

    // Call review API in background with stable requestId
    try {
      await notebookApi.reviewFlashcard(currentQ.entry.flashcardId, correct, reqId, sessionId)
    } catch {
      // Non-blocking for quiz flow
    }

    if (correct) {
      setCorrectCount((prev) => prev + 1)
      setCombo((prev) => prev + 1)
    } else {
      setCombo(0)
      setWrongEntries((prev) => [...prev, currentQ.entry])
    }

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1)
    } else {
      setIsFinished(true)
    }
  }

  // Restart with only wrong words
  const handleRetryWrong = () => {
    if (wrongEntries.length === 0) return
    const retryQs = buildQuizQuestions(wrongEntries, 'flashcard')
    setQuestions(retryQs)
    setCurrentIndex(0)
    setCorrectCount(0)
    setCombo(0)
    setWrongEntries([])
    setIsFinished(false)
    requestIdMapRef.current.clear()
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="vocab-quiz-layout" style={{ textAlign: 'center', padding: '5rem 1rem' }}>
        <RefreshCw size={36} className="vocab-spin" style={{ color: 'var(--classroom-primary, #123ab5)', margin: '0 auto 1rem' }} />
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>Đang chuẩn bị phiên ôn tập...</h3>
        <p style={{ color: '#64748b' }}>Hệ thống đang sắp xếp các câu hỏi dựa trên tiến độ của bạn.</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="vocab-quiz-layout" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <AlertCircle size={44} style={{ color: '#ef4444', margin: '0 auto 1rem' }} />
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
          Lỗi khởi tạo phiên ôn
        </h3>
        <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>{error}</p>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          style={{
            padding: '0.65rem 1.5rem',
            borderRadius: '0.75rem',
            background: 'var(--classroom-primary, #123ab5)',
            color: 'white',
            border: 'none',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Thử lại
        </button>
      </div>
    )
  }

  // Empty state: No cards due
  if (questions.length === 0) {
    return (
      <div className="vocab-quiz-layout" style={{ textAlign: 'center', padding: '5rem 1.5rem' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎉</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem' }}>
          Tuyệt vời! Bạn đã hoàn thành các từ đến hạn
        </h2>
        <p style={{ color: '#64748b', marginBottom: '2rem', maxWidth: '440px', marginInline: 'auto' }}>
          Hiện tại không còn từ vựng nào cần ôn gấp. Bạn có thể tra thêm từ mới hoặc duyệt qua toàn bộ sổ tay.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            to="/vocabulary/notebook"
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.75rem',
              background: 'var(--classroom-primary, #123ab5)',
              color: 'white',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Về Sổ tay từ vựng
          </Link>
          <Link
            to="/vocabulary"
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.75rem',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Khám phá Từ điển
          </Link>
        </div>
      </div>
    )
  }

  // Finished state: Summary View
  if (isFinished) {
    return (
      <ReviewSummaryView
        totalQuestions={questions.length}
        correctCount={correctCount}
        wrongEntries={wrongEntries}
        onRetryWrong={handleRetryWrong}
      />
    )
  }

  const currentQ = questions[currentIndex]
  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100)

  return (
    <div className="vocab-quiz-layout">
      {/* Top Header: Exit CTA, Progress Bar, Combo */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setIsSkipDialogOpen(true)}
            aria-label="Thoát phiên ôn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              border: 'none',
              background: 'none',
              color: '#64748b',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              padding: '0.25rem 0.5rem',
            }}
          >
            <X size={18} /> Thoát
          </button>

          {/* Question Counter */}
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>
            {currentIndex + 1} / {questions.length}
          </span>

          {/* Streak Combo Badge */}
          {combo >= 2 ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.8rem',
                fontWeight: 800,
                color: '#ea580c',
                background: '#fff7ed',
                border: '1px solid #fed7aa',
                padding: '0.2rem 0.6rem',
                borderRadius: '999px',
                animation: 'pulse 1s infinite ease-in-out',
              }}
            >
              <Flame size={14} /> Combo x{combo}
            </div>
          ) : (
            <div style={{ width: '60px' }} />
          )}
        </div>

        {/* Progress Bar */}
        <div className="vocab-quiz-progress">
          <div className="vocab-quiz-progress__bar" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {/* Mode Dispatcher */}
      {String(currentQ.mode).toUpperCase() === 'FLASHCARD' && (
        <FlashcardReviewCard key={currentQ.id} question={currentQ} onAnswer={handleAnswer} />
      )}

      {(String(currentQ.mode).toUpperCase() === 'MEANING' || String(currentQ.mode).toUpperCase() === 'MEANING_GUESS') && (
        <MeaningGuessCard key={currentQ.id} question={currentQ} onAnswer={handleAnswer} />
      )}

      {String(currentQ.mode).toUpperCase() === 'TYPING' && (
        <TypingReviewCard key={currentQ.id} question={currentQ} onAnswer={handleAnswer} isDictation={false} />
      )}

      {String(currentQ.mode).toUpperCase() === 'DICTATION' && (
        <TypingReviewCard key={currentQ.id} question={currentQ} onAnswer={handleAnswer} isDictation={true} />
      )}

      {(String(currentQ.mode).toUpperCase() === 'FILL-IN-BLANK' || String(currentQ.mode).toUpperCase() === 'FILL_IN_BLANK') && (
        <FillInBlankReviewCard key={currentQ.id} question={currentQ} onAnswer={handleAnswer} />
      )}

      {(String(currentQ.mode).toUpperCase() === 'SENTENCE' || String(currentQ.mode).toUpperCase() === 'SENTENCE_WRITING') && (
        <SentenceWritingCard key={currentQ.id} question={currentQ} onAnswer={handleAnswer} />
      )}

      {/* Skip / Abandon Modal */}
      <SkipConfirmDialog
        isOpen={isSkipDialogOpen}
        onConfirm={() => {
          setIsSkipDialogOpen(false)
          navigate('/vocabulary/notebook')
        }}
        onCancel={() => setIsSkipDialogOpen(false)}
      />
    </div>
  )
}

/** Same frame as the rest of the vocabulary area, so the site navbar stays available on every screen. */
export function NotebookReviewPage() {
  return (
    <VocabularyShell>
      <NotebookReviewContent />
    </VocabularyShell>
  )
}
