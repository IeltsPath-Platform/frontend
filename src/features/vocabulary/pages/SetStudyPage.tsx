import { useEffect, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { X, RefreshCw, AlertCircle, Sparkles } from 'lucide-react'
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

export function SetStudyPage() {
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
      <div className="review-page">
        <div style={{ textAlign: 'center', color: '#64748b', padding: '4rem 1rem' }}>
          <RefreshCw size={36} className="animate-spin" style={{ color: '#2563eb', margin: '0 auto 1rem' }} />
          <p style={{ fontWeight: 600 }}>Đang khởi tạo lộ trình học bộ từ…</p>
        </div>
      </div>
    )
  }

  if (error || questions.length === 0) {
    return (
      <div className="review-page">
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
      <div className="review-page">
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
  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100)
  const modeUpper = String(currentQ.mode).toUpperCase()

  return (
    <div className="review-page">
      {/* Top Header */}
      <header className="review-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setIsSkipDialogOpen(true)}
            className="review-header__close-btn"
            aria-label="Thoát phiên học"
          >
            <X size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              {setDetail?.title || 'Học bộ từ'}
            </h1>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Câu {currentIndex + 1} / {questions.length}
            </span>
          </div>
        </div>

        {combo >= 2 && (
          <div className="review-combo-badge animate-bounce">
            <Sparkles size={14} /> Chuỗi {combo} đúng!
          </div>
        )}
      </header>

      {/* Progress Bar */}
      <div className="review-progress-track">
        <div className="review-progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>

      {/* Question Card Container */}
      <main className="review-main-area">
        {modeUpper === 'FLASHCARD' && (
          <FlashcardReviewCard question={currentQ} onAnswer={handleAnswer} />
        )}
        {(modeUpper === 'MEANING' || modeUpper === 'MEANING_GUESS' || modeUpper === 'MEANING-GUESS') && (
          <MeaningGuessCard question={currentQ} onAnswer={handleAnswer} />
        )}
        {modeUpper === 'TYPING' && (
          <TypingReviewCard question={currentQ} onAnswer={handleAnswer} isDictation={false} />
        )}
        {modeUpper === 'DICTATION' && (
          <TypingReviewCard question={currentQ} onAnswer={handleAnswer} isDictation={true} />
        )}
        {(modeUpper === 'FILL-IN-BLANK' || modeUpper === 'FILL_IN_BLANK' || modeUpper === 'FILL-BLANK') && (
          <FillInBlankReviewCard question={currentQ} onAnswer={handleAnswer} />
        )}
        {(modeUpper === 'SENTENCE' || modeUpper === 'SENTENCE_WRITING' || modeUpper === 'SENTENCE-WRITING') && (
          <SentenceWritingCard question={currentQ} onAnswer={handleAnswer} />
        )}
      </main>

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
