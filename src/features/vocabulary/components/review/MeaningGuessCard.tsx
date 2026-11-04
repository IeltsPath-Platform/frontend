import { useCallback, useEffect, useState } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'
import type { QuizQuestion } from '../../lib/quiz'
import { PronunciationButton } from '@/components/PronunciationButton'

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

  return (
    <div className="vocab-quiz-card" role="region" aria-label="Đoán nghĩa của từ">
      <div className="review-head">
        <span className="review-kicker">Chọn nghĩa tiếng Việt chính xác</span>
        <h2 className="review-word" lang="en">{entry.lemma}</h2>
        {entry.partOfSpeech && <span className="review-pos">({entry.partOfSpeech})</span>}
        <PronunciationButton
          lemma={entry.lemma}
          src={entry.pronunciationAudioReference}
          iconSize={24}
          className="review-speak"
          aria-label={`Nghe phát âm từ ${entry.lemma}`}
        />
      </div>

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
              <span className="vocab-choice-text">
                <span className="vocab-choice-key">{idx + 1}</span>
                <span>{choice}</span>
              </span>

              {isAnswered && idx === correctIndex && <CheckCircle size={24} style={{ color: '#16a34a', flexShrink: 0 }} />}
              {isAnswered && idx === selectedIndex && idx !== correctIndex && <XCircle size={24} style={{ color: '#dc2626', flexShrink: 0 }} />}
            </button>
          )
        })}
      </div>

      <p className="review-keys">Phím tắt: bấm số <strong>1–{choices.length}</strong> trên bàn phím để chọn đáp án</p>
    </div>
  )
}
