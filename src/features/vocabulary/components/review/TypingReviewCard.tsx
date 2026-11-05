import { useEffect, useRef, useState } from 'react'
import { ArrowRight, CheckCircle2, XCircle, Lightbulb } from 'lucide-react'
import type { QuizQuestion } from '../../lib/quiz'
import { isLemmaCorrect } from '../../lib/quiz'
import { PronunciationButton } from '@/components/PronunciationButton'
import { playPronunciationAudio } from '@/lib/pronunciation'

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
      playPronunciationAudio(entry.pronunciationAudioReference)
    }
  }, [isDictation, entry.pronunciationAudioReference])

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

  return (
    <div className="vocab-quiz-card" role="region" aria-label={isDictation ? 'Nghe chép từ vựng' : 'Kiểm tra gõ từ'}>
      <div className="review-head">
        <span className="review-kicker">{isDictation ? 'Nghe và gõ lại từ vựng' : 'Nhìn nghĩa và gõ lại từ tiếng Anh'}</span>

        {isDictation ? (
          <div className="review-listen">
            <PronunciationButton
              lemma={entry.lemma}
              src={entry.pronunciationAudioReference}
              iconSize={38}
              className="review-speak is-large"
              aria-label="Phát lại phát âm"
            />
            <p>Bấm nút để nghe lại</p>
          </div>
        ) : (
          <h2 className="review-prompt">{entry.vietnameseMeaning || entry.englishDefinition}</h2>
        )}

        {entry.partOfSpeech && <span className="vocab-card__pos">{entry.partOfSpeech}</span>}
      </div>

      <form onSubmit={handleSubmit} className="review-form">
        <div className="review-input-wrap">
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
            className={`review-input${isSubmitted ? (isCorrect ? ' is-correct' : ' is-wrong') : ''}`}
          />

          {!isSubmitted && !showHint && (
            <button type="button" className="review-hint" onClick={() => setShowHint(true)} aria-label="Xem chữ cái đầu tiên">
              <Lightbulb size={18} aria-hidden="true" />
              Gợi ý
            </button>
          )}
        </div>

        {isSubmitted && !isCorrect && (
          <div className="review-feedback is-wrong">
            <p><small>Đáp án chính xác là:</small><b lang="en">{entry.lemma}</b></p>
            <XCircle size={32} color="#dc2626" aria-hidden="true" />
          </div>
        )}

        {isSubmitted && isCorrect && (
          <div className="review-feedback is-correct">
            <CheckCircle2 size={24} aria-hidden="true" />
            Chính xác!
          </div>
        )}

        <button type="submit" className={`review-submit${isSubmitted ? ' is-next' : ''}`}>
          <span>{isSubmitted ? 'Tiếp tục [Enter]' : 'Kiểm tra [Enter]'}</span>
          <ArrowRight size={22} aria-hidden="true" />
        </button>
      </form>
    </div>
  )
}
