import { useEffect, useState } from 'react'
import { Volume2, ThumbsUp, ThumbsDown } from 'lucide-react'
import type { QuizQuestion } from '../../lib/quiz'
import { speak } from '@/features/flashcards/lib/speak'

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

  const handleAudio = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (entry.pronunciationAudioReference && entry.pronunciationAudioReference.startsWith('https://')) {
      new Audio(entry.pronunciationAudioReference).play().catch(() => speak(entry.lemma))
    } else {
      speak(entry.lemma)
    }
  }

  return (
    <div className="vocab-quiz-card" style={{ padding: 0 }} role="region" aria-label="Thẻ flashcard ôn tập">
      {/* 3D Flip Card Container */}
      <div
        style={{
          perspective: '1200px',
          minHeight: '340px',
          cursor: 'pointer',
        }}
        onClick={() => setIsFlipped(!isFlipped)}
        role="button"
        tabIndex={0}
        aria-label={isFlipped ? 'Mặt sau thẻ' : 'Mặt trước thẻ, bấm để lật'}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            minHeight: '340px',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.55s cubic-bezier(0.2, 0.8, 0.2, 1)',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Front Face */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backfaceVisibility: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2.5rem 2rem',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '1rem' }}>
              Mặt trước · Bấm hoặc nhấn Space để lật
            </span>

            <h2 style={{ fontSize: '2.75rem', fontWeight: 800, margin: '0.5rem 0', color: 'var(--classroom-text, #202633)' }} lang="en">
              {entry.lemma}
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.5rem' }}>
              {entry.ipa && <span style={{ fontSize: '1.1rem', color: '#64748b' }}>{entry.ipa}</span>}
              {entry.partOfSpeech && <span className="vocab-card__pos">{entry.partOfSpeech}</span>}
              <button
                type="button"
                onClick={handleAudio}
                aria-label={`Nghe phát âm từ ${entry.lemma}`}
                style={{
                  background: '#eef3ff',
                  border: 'none',
                  borderRadius: '50%',
                  padding: '0.4rem',
                  color: 'var(--classroom-primary, #123ab5)',
                  cursor: 'pointer',
                }}
              >
                <Volume2 size={18} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Back Face */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2.5rem 2rem',
              textAlign: 'center',
              background: '#f8fafc',
              borderRadius: '1.5rem',
            }}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              Nghĩa & Ngữ cảnh
            </span>

            <p style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem' }}>
              {entry.vietnameseMeaning || entry.englishDefinition || 'Chưa có nghĩa'}
            </p>

            {entry.englishDefinition && entry.vietnameseMeaning && (
              <p style={{ fontSize: '0.95rem', color: '#475569', margin: '0 0 1rem' }} lang="en">
                {entry.englishDefinition}
              </p>
            )}

            {entry.exampleSentence && (
              <blockquote
                style={{
                  margin: '0.5rem 0 0',
                  padding: '0.75rem 1rem',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  color: '#334155',
                  fontStyle: 'italic',
                }}
                lang="en"
              >
                "{entry.exampleSentence}"
              </blockquote>
            )}
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
          padding: '1.25rem 2rem',
          borderTop: '1px solid #f1f5f9',
          background: '#ffffff',
        }}
      >
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
            fontSize: '0.95rem',
            cursor: 'pointer',
          }}
          aria-label="Quên rồi, bấm hoặc nhấn phím 1"
        >
          <ThumbsDown size={18} aria-hidden="true" />
          <span>Quên rồi [1]</span>
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
            fontSize: '0.95rem',
            cursor: 'pointer',
          }}
          aria-label="Đã nhớ, bấm hoặc nhấn phím 2"
        >
          <ThumbsUp size={18} aria-hidden="true" />
          <span>Đã nhớ [2]</span>
        </button>
      </div>
    </div>
  )
}
