import { useEffect, useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import type { QuizQuestion } from '../../lib/quiz'
import { PronunciationButton } from '@/components/PronunciationButton'

interface FlashcardReviewCardProps {
  question: QuizQuestion
  onAnswer: (correct: boolean) => void
}

export function FlashcardReviewCard({ question, onAnswer }: FlashcardReviewCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const entry = question.entry

  // Keyboard navigation: Space to flip, 1 Forgot, 2 Remembered
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        setIsFlipped((prev) => !prev)
      } else if (e.key === '1') {
        e.preventDefault()
        onAnswer(false)
      } else if (e.key === '2') {
        e.preventDefault()
        onAnswer(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onAnswer])

  return (
    <div className="vocab-quiz-card" style={{ padding: 0 }} role="region" aria-label="Thẻ flashcard ôn tập">
      <div
        className={`review-flip${isFlipped ? ' is-flipped' : ''}`}
        onClick={() => setIsFlipped(!isFlipped)}
        role="button"
        tabIndex={0}
        aria-label={isFlipped ? 'Mặt sau thẻ' : 'Mặt trước thẻ, bấm để lật'}
      >
        <div className="review-flip__inner">
          <div className="review-flip__face">
            <span className="review-kicker">Mặt trước · Bấm hoặc nhấn Space để lật</span>
            <h2 className="review-word" lang="en">{entry.lemma}</h2>
            <div className="review-word-meta">
              {entry.ipa && <span className="review-ipa">{entry.ipa}</span>}
              {entry.partOfSpeech && <span className="vocab-card__pos">{entry.partOfSpeech}</span>}
              <PronunciationButton
                lemma={entry.lemma}
                src={entry.pronunciationAudioReference}
                iconSize={24}
                className="review-speak"
                aria-label={`Nghe phát âm từ ${entry.lemma}`}
              />
            </div>
          </div>

          <div className="review-flip__face is-back">
            <span className="review-kicker">Nghĩa & Ngữ cảnh</span>
            <p className="review-back-meaning">{entry.vietnameseMeaning || entry.englishDefinition || 'Chưa có nghĩa'}</p>
            {entry.englishDefinition && entry.vietnameseMeaning && (
              <p className="review-back-definition" lang="en">{entry.englishDefinition}</p>
            )}
            {entry.exampleSentence && (
              <blockquote className="review-back-example" lang="en">"{entry.exampleSentence}"</blockquote>
            )}
          </div>
        </div>
      </div>

      <div className="review-grades is-footer">
        <button type="button" className="review-grade is-forgot" onClick={() => onAnswer(false)} aria-label="Quên rồi, bấm hoặc nhấn phím 1">
          <ThumbsDown size={22} aria-hidden="true" />
          <span>Quên rồi [1]</span>
        </button>
        <button type="button" className="review-grade is-remembered" onClick={() => onAnswer(true)} aria-label="Đã nhớ, bấm hoặc nhấn phím 2">
          <ThumbsUp size={22} aria-hidden="true" />
          <span>Đã nhớ [2]</span>
        </button>
      </div>
    </div>
  )
}
