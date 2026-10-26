import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, RotateCcw, ArrowRight, XCircle } from 'lucide-react'
import type { NotebookEntryResponse } from '../../api/notebookApi'

interface ReviewSummaryViewProps {
  totalQuestions: number
  correctCount: number
  wrongEntries: NotebookEntryResponse[]
  onRetryWrong: () => void
}

export function ReviewSummaryView({
  totalQuestions,
  correctCount,
  wrongEntries,
  onRetryWrong,
}: ReviewSummaryViewProps) {
  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0
  const [displayPercent, setDisplayPercent] = useState(0)

  useEffect(() => {
    const durationMs = 800
    const start = performance.now()
    let frameId: number

    const step = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1)
      setDisplayPercent(Math.round(progress * percentage))
      if (progress < 1) frameId = requestAnimationFrame(step)
    }

    frameId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameId)
  }, [percentage])

  return (
    <div className="vocab-quiz-layout">
      <div className="vocab-quiz-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: percentage >= 70 ? '#f0fdf4' : '#fffbeb',
            color: percentage >= 70 ? '#16a34a' : '#d97706',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}
        >
          <Trophy size={40} aria-hidden="true" />
        </div>

        <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.5rem', color: '#0f172a' }}>
          Hoàn thành phiên ôn tập!
        </h2>
        <p style={{ color: '#64748b', fontSize: '1rem', margin: '0 0 2rem' }}>
          Bạn đã hoàn thành {totalQuestions} lượt ôn từ vựng.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', margin: '2rem 0' }}>
          <div>
            <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--classroom-primary, #123ab5)', lineHeight: 1 }}>
              {displayPercent}%
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, marginTop: '0.5rem' }}>
              Tỉ lệ chính xác
            </div>
          </div>
          <div>
            <div style={{ fontSize: '3rem', fontWeight: 800, color: '#16a34a', lineHeight: 1 }}>
              {correctCount}/{totalQuestions}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, marginTop: '0.5rem' }}>
              Từ ghi nhớ tốt
            </div>
          </div>
        </div>

        {wrongEntries.length > 0 && (
          <div style={{ margin: '2rem 0', textAlign: 'left', background: '#f8fafc', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155', margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <XCircle size={16} color="#dc2626" aria-hidden="true" />
              Các từ cần ôn lại ({wrongEntries.length}):
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {wrongEntries.map((w) => (
                <span
                  key={w.flashcardId}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '0.5rem',
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#0f172a',
                  }}
                  lang="en"
                >
                  {w.lemma}
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem', marginTop: '2.5rem' }}>
          {wrongEntries.length > 0 && (
            <button
              type="button"
              onClick={onRetryWrong}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'var(--classroom-warning, #ff7624)',
                color: 'white',
                border: 'none',
                padding: '0.85rem 1.5rem',
                borderRadius: '0.75rem',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={18} aria-hidden="true" />
              Ôn lại {wrongEntries.length} từ sai
            </button>
          )}

          <Link
            to="/vocabulary/notebook"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--classroom-primary, #123ab5)',
              color: 'white',
              padding: '0.85rem 1.75rem',
              borderRadius: '0.75rem',
              fontWeight: 700,
              fontSize: '0.95rem',
              textDecoration: 'none',
            }}
          >
            Quay về Sổ tay
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  )
}
