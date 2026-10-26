import { useEffect, useRef, useState } from 'react'
import { ArrowRight, CheckCircle2, XCircle, Lightbulb } from 'lucide-react'
import type { QuizQuestion } from '../../lib/quiz'
import { isLemmaCorrect } from '../../lib/quiz'
import { speak } from '@/features/flashcards/lib/speak'

interface TypingReviewCardProps {
  question: QuizQuestion
  onAnswer: (correct: boolean) => void
  isDictation?: boolean
}

export function TypingReviewCard({ question, onAnswer, isDictation = false }: TypingReviewCardProps) {
  const [typed, setTyped] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const entry = question.entry

  useEffect(() => {
    inputRef.current?.focus()
    if (isDictation) {
      if (entry.pronunciationAudioReference && entry.pronunciationAudioReference.startsWith('https://')) {
        new Audio(entry.pronunciationAudioReference).play().catch(() => speak(entry.lemma))
      } else {
        speak(entry.lemma)
      }
    }
  }, [isDictation, entry.lemma, entry.pronunciationAudioReference])

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (isSubmitted) {
      onAnswer(isCorrect)
      return
    }

    if (!typed.trim()) return

    const correct = isLemmaCorrect(typed, entry.lemma)
    setIsCorrect(correct)
    setIsSubmitted(true)

    if (correct) {
      setTimeout(() => onAnswer(true), 900)
    }
  }

  const handleAudio = () => {
    if (entry.pronunciationAudioReference && entry.pronunciationAudioReference.startsWith('https://')) {
      new Audio(entry.pronunciationAudioReference).play().catch(() => speak(entry.lemma))
    } else {
      speak(entry.lemma)
    }
  }

  return (
    <div className="vocab-quiz-card" role="region" aria-label={isDictation ? 'Nghe chép từ vựng' : 'Kiểm tra gõ từ'}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {isDictation ? 'Nghe và gõ lại từ vựng' : 'Nhìn nghĩa và gõ lại từ tiếng Anh'}
        </span>

        {isDictation ? (
          <div style={{ margin: '1.5rem 0' }}>
            <button
              type="button"
              onClick={handleAudio}
              style={{
                background: 'var(--classroom-primary, #123ab5)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '64px',
                height: '64px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(18, 58, 181, 0.3)',
              }}
              aria-label="Phát lại phát âm"
            >
              <ArrowRight size={24} style={{ transform: 'rotate(90deg)' }} aria-hidden="true" />
            </button>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>Bấm nút để nghe lại</p>
          </div>
        ) : (
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, margin: '1rem 0 0.5rem', color: '#0f172a' }}>
            {entry.vietnameseMeaning || entry.englishDefinition}
          </h2>
        )}

        {entry.partOfSpeech && (
          <span className="vocab-card__pos">{entry.partOfSpeech}</span>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ position: 'relative' }}>
          <input
            ref={inputRef}
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={isSubmitted && isCorrect}
            placeholder={showHint ? `Gợi ý: ${entry.lemma[0]}...` : 'Gõ từ tiếng Anh tại đây...'}
            autoCapitalize="none"
            autoComplete="off"
            spellCheck="false"
            style={{
              width: '100%',
              padding: '1rem 1.25rem',
              borderRadius: '0.85rem',
              border: `2px solid ${isSubmitted ? (isCorrect ? '#16a34a' : '#dc2626') : '#cbd5e1'}`,
              background: isSubmitted ? (isCorrect ? '#f0fdf4' : '#fef2f2') : '#ffffff',
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#0f172a',
              outline: 'none',
              textAlign: 'center',
            }}
          />

          {!isSubmitted && !showHint && (
            <button
              type="button"
              onClick={() => setShowHint(true)}
              style={{
                position: 'absolute',
                right: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#f59e0b',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
              aria-label="Xem chữ cái đầu tiên"
            >
              <Lightbulb size={16} aria-hidden="true" />
              Gợi ý
            </button>
          )}
        </div>

        {isSubmitted && !isCorrect && (
          <div
            style={{
              padding: '1rem',
              borderRadius: '0.75rem',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#b91c1c', fontWeight: 600 }}>
                Đáp án chính xác là:
              </p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '1.2rem', fontWeight: 800, color: '#dc2626' }} lang="en">
                {entry.lemma}
              </p>
            </div>
            <XCircle size={28} color="#dc2626" aria-hidden="true" />
          </div>
        )}

        {isSubmitted && isCorrect && (
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '0.75rem',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              color: '#15803d',
              fontWeight: 700,
            }}
          >
            <CheckCircle2 size={20} aria-hidden="true" />
            Chính xác!
          </div>
        )}

        <button
          type="submit"
          style={{
            padding: '0.85rem',
            borderRadius: '0.75rem',
            background: isSubmitted ? '#0f172a' : 'var(--classroom-primary, #123ab5)',
            color: 'white',
            border: 'none',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            marginTop: '0.5rem',
          }}
        >
          <span>{isSubmitted ? 'Tiếp tục [Enter]' : 'Kiểm tra [Enter]'}</span>
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </form>
    </div>
  )
}

