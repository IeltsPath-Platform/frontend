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
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Điền từ thích hợp vào chỗ trống
        </span>

        <div
          style={{
            margin: '1.5rem 0',
            padding: '1.25rem 1.5rem',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '1rem',
            fontSize: '1.2rem',
            lineHeight: 1.6,
            color: '#1e293b',
          }}
          lang="en"
        >
          {maskedSentence}
        </div>

        <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0 }}>
          Gợi ý nghĩa: <strong>{entry.vietnameseMeaning || entry.englishDefinition}</strong>
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
          style={{
            width: '100%',
            padding: '1rem 1.25rem',
            borderRadius: '0.85rem',
            border: `2px solid ${isSubmitted ? (isCorrect ? '#16a34a' : '#dc2626') : '#cbd5e1'}`,
            background: isSubmitted ? (isCorrect ? '#f0fdf4' : '#fef2f2') : '#ffffff',
            fontSize: '1.2rem',
            fontWeight: 700,
            color: '#0f172a',
            outline: 'none',
            textAlign: 'center',
          }}
        />

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
                Từ chính xác:
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
            Tuyệt vời!
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

