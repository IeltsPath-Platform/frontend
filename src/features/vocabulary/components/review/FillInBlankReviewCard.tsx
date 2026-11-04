import { useEffect, useRef, useState } from 'react'
import { ArrowRight, CheckCircle2, XCircle } from 'lucide-react'
import type { QuizQuestion } from '../../lib/quiz'
import { isLemmaCorrect } from '../../lib/quiz'

interface FillInBlankReviewCardProps {
  question: QuizQuestion
  onAnswer: (correct: boolean) => void
}

export function FillInBlankReviewCard({ question, onAnswer }: FillInBlankReviewCardProps) {
  const [typed, setTyped] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const entry = question.entry

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

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

  const maskedSentence = question.maskedSentence || '______'

  return (
    <div className="vocab-quiz-card" role="region" aria-label="Điền từ vào câu ví dụ">
      <div className="review-head">
        <span className="review-kicker">Điền từ thích hợp vào chỗ trống</span>
        <div className="review-sentence" lang="en">{maskedSentence}</div>
        <p className="review-meaning-hint">Gợi ý nghĩa: <strong>{entry.vietnameseMeaning || entry.englishDefinition}</strong></p>
      </div>

      <form onSubmit={handleSubmit} className="review-form">
        <input
          ref={inputRef}
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          disabled={isSubmitted && isCorrect}
          placeholder="Nhập từ cần điền..."
          autoCapitalize="none"
          autoComplete="off"
          spellCheck="false"
          className={`review-input${isSubmitted ? (isCorrect ? ' is-correct' : ' is-wrong') : ''}`}
        />

        {isSubmitted && !isCorrect && (
          <div className="review-feedback is-wrong">
            <p><small>Từ chính xác:</small><b lang="en">{entry.lemma}</b></p>
            <XCircle size={32} color="#dc2626" aria-hidden="true" />
          </div>
        )}

        {isSubmitted && isCorrect && (
          <div className="review-feedback is-correct">
            <CheckCircle2 size={24} aria-hidden="true" />
            Tuyệt vời!
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
