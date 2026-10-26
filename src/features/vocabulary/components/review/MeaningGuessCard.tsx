import { useCallback, useEffect, useState } from 'react'
import { Volume2, CheckCircle, XCircle } from 'lucide-react'
import type { QuizQuestion } from '../../lib/quiz'
import { speak } from '@/features/flashcards/lib/speak'

interface MeaningGuessCardProps {
  question: QuizQuestion
  onAnswer: (correct: boolean) => void
}

export function MeaningGuessCard({ question, onAnswer }: MeaningGuessCardProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)

  const choices = question.choices ?? []
  const correctIndex = question.correctChoiceIndex ?? 0
  const entry = question.entry

  const handleSelect = useCallback(
    (idx: number) => {
      if (isAnswered) return
      setSelectedIndex(idx)
      setIsAnswered(true)

      const isCorrect = idx === correctIndex
      // Short delay to show the feedback before advancing
      setTimeout(() => {
        onAnswer(isCorrect)
      }, 900)
    },
    [isAnswered, correctIndex, onAnswer]
  )

  // Handle keyboard 1-4
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnswered) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          const isCorrect = selectedIndex === correctIndex
          onAnswer(isCorrect)
        }
        return
      }

      const num = parseInt(e.key, 10)
      if (num >= 1 && num <= choices.length) {
        e.preventDefault()
        handleSelect(num - 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isAnswered, selectedIndex, choices.length, correctIndex, onAnswer, handleSelect])

  const handleAudio = () => {
    if (entry.pronunciationAudioReference && entry.pronunciationAudioReference.startsWith('https://')) {
      new Audio(entry.pronunciationAudioReference).play().catch(() => speak(entry.lemma))
    } else {
      speak(entry.lemma)
    }
  }

  return (
    <div className="vocab-quiz-card" role="region" aria-label="Đoán nghĩa của từ">
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Chọn nghĩa tiếng Việt chính xác
        </span>

        <h2 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0.5rem 0', color: 'var(--classroom-text, #202633)' }} lang="en">
          {entry.lemma}
        </h2>

        {entry.partOfSpeech && (
          <span
            style={{
              fontSize: '0.85rem',
              fontStyle: 'italic',
              color: '#64748b',
              display: 'block',
              marginBottom: '0.5rem',
            }}
          >
            ({entry.partOfSpeech})
          </span>
        )}

        <button
          type="button"
          onClick={handleAudio}
          aria-label={`Nghe phát âm từ ${entry.lemma}`}
          style={{
            border: 'none',
            background: '#eef3ff',
            color: 'var(--classroom-primary, #123ab5)',
            cursor: 'pointer',
            padding: '0.4rem',
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Volume2 size={20} />
        </button>
      </div>

      {/* 4 Choices Grid */}
      <div className="vocab-choices-grid" role="radiogroup" aria-label="Các lựa chọn nghĩa">
        {choices.map((choice, idx) => {
          let stateClass = ''
          if (isAnswered) {
            if (idx === correctIndex) stateClass = 'is-correct'
            else if (idx === selectedIndex) stateClass = 'is-wrong'
          }

          return (
            <button
              key={idx}
              type="button"
              className={`vocab-choice-btn ${stateClass}`}
              onClick={() => handleSelect(idx)}
              disabled={isAnswered}
              aria-checked={selectedIndex === idx}
              role="radio"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '1.6rem',
                    height: '1.6rem',
                    borderRadius: '50%',
                    background: '#f1f5f9',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#475569',
                  }}
                >
                  {idx + 1}
                </span>
                <span>{choice}</span>
              </div>

              {isAnswered && idx === correctIndex && (
                <CheckCircle size={20} style={{ color: '#16a34a', flexShrink: 0 }} />
              )}
              {isAnswered && idx === selectedIndex && idx !== correctIndex && (
                <XCircle size={20} style={{ color: '#dc2626', flexShrink: 0 }} />
              )}
            </button>
          )
        })}
      </div>

      {/* Helpful Hint on Keyboard Shortcuts */}
      <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
        <span>Phím tắt: bấm số <strong>1–{choices.length}</strong> trên bàn phím để chọn đáp án</span>
      </div>
    </div>
  )
}
