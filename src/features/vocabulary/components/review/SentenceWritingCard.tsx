import { useState } from 'react'
import { Eye, ThumbsDown, ThumbsUp, Sparkles } from 'lucide-react'
import type { QuizQuestion } from '../../lib/quiz'

interface SentenceWritingCardProps {
  question: QuizQuestion
  onAnswer: (correct: boolean) => void
}

export function SentenceWritingCard({ question, onAnswer }: SentenceWritingCardProps) {
  const [writtenText, setWrittenText] = useState('')
  const [showSample, setShowSample] = useState(false)
  const entry = question.entry

  return (
    <div className="vocab-quiz-card" role="region" aria-label="Đặt câu với từ vựng">
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Tự đặt câu với từ vựng
        </span>

        <h2 style={{ fontSize: '2.25rem', fontWeight: 800, margin: '0.5rem 0', color: 'var(--classroom-text, #202633)' }} lang="en">
          {entry.lemma}
        </h2>

        <p style={{ fontSize: '0.95rem', color: '#475569', margin: 0 }}>
          {entry.vietnameseMeaning || entry.englishDefinition}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label htmlFor="user-sentence-input" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem' }}>
            Câu của bạn:
          </label>
          <textarea
            id="user-sentence-input"
            rows={3}
            value={writtenText}
            onChange={(e) => setWrittenText(e.target.value)}
            placeholder={`Viết ít nhất một câu hoàn chỉnh có chứa từ "${entry.lemma}"...`}
            style={{
              width: '100%',
              padding: '0.85rem 1rem',
              borderRadius: '0.75rem',
              border: '1px solid #cbd5e1',
              fontSize: '0.95rem',
              outline: 'none',
              resize: 'vertical',
            }}
          />
        </div>

        {!showSample ? (
          <button
            type="button"
            onClick={() => setShowSample(true)}
            style={{
              padding: '0.85rem',
              borderRadius: '0.75rem',
              background: 'var(--classroom-primary, #123ab5)',
              color: 'white',
              border: 'none',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <Eye size={18} aria-hidden="true" />
            Xem câu mẫu & Tự đánh giá
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', animation: 'fadeIn 0.25s ease-out' }}>
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--classroom-primary, #123ab5)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                <Sparkles size={14} aria-hidden="true" />
                CÂU MẪU TỪ ĐIỂN
              </div>
              <p style={{ margin: 0, fontSize: '0.95rem', fontStyle: 'italic', color: '#1e293b' }} lang="en">
                "{entry.exampleSentence || 'Chưa có câu mẫu trong kho.'}"
              </p>
            </div>

            <div>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', textAlign: 'center', margin: '0 0 0.75rem' }}>
                Bạn tự đánh giá câu vừa viết thế nào?
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => onAnswer(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.85rem',
                    borderRadius: '0.75rem',
                    border: '2px solid #fee2e2',
                    background: '#fef2f2',
                    color: '#dc2626',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <ThumbsDown size={18} aria-hidden="true" />
                  Chưa nhớ rõ
                </button>

                <button
                  type="button"
                  onClick={() => onAnswer(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.85rem',
                    borderRadius: '0.75rem',
                    border: '2px solid #bbf7d0',
                    background: '#f0fdf4',
                    color: '#16a34a',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <ThumbsUp size={18} aria-hidden="true" />
                  Đã nhớ & Dùng đúng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

