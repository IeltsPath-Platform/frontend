import { Volume2, FileText, Clock } from 'lucide-react'
import type { NotebookEntryResponse } from '../api/notebookApi'
import { getLevelConfig, formatRelativeDue } from '../lib/understanding'
import { speak } from '@/features/flashcards/lib/speak'

interface WordCardProps {
  entry: NotebookEntryResponse
  viewMode?: 'grid' | 'list'
  onClick: (entry: NotebookEntryResponse) => void
}

function highlightLemma(sentence: string | null | undefined, lemma: string) {
  if (!sentence) return null
  const escaped = lemma.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
  const parts = sentence.split(new RegExp(`(\\b${escaped}\\b)`, 'gi'))

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === lemma.toLowerCase() ? (
          <mark key={i}>{part}</mark>
        ) : (
          part
        )
      )}
    </>
  )
}

export function WordCard({ entry, viewMode = 'grid', onClick }: WordCardProps) {
  const levelConfig = getLevelConfig(entry.level)
  const relativeDue = formatRelativeDue(entry.nextReviewAt)

  const handleAudio = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (entry.pronunciationAudioReference && entry.pronunciationAudioReference.startsWith('https://')) {
      const audio = new Audio(entry.pronunciationAudioReference)
      audio.play().catch(() => speak(entry.lemma))
    } else {
      speak(entry.lemma)
    }
  }

  const isList = viewMode === 'list'

  return (
    <article
      className="vocab-card"
      onClick={() => onClick(entry)}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick(entry)
        }
      }}
      aria-label={`Chi tiết từ ${entry.lemma}`}
      style={
        isList
          ? {
              display: 'grid',
              gridTemplateColumns: 'minmax(180px, 1fr) 2fr auto',
              alignItems: 'center',
              gap: '1.25rem',
              padding: '1rem 1.25rem',
            }
          : undefined
      }
    >
      <div>
        <div className="vocab-card__top">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h3 className="vocab-card__lemma" lang="en">
              {entry.lemma}
            </h3>
            {entry.partOfSpeech && (
              <span className="vocab-card__pos">{entry.partOfSpeech}</span>
            )}
          </div>
          <button
            type="button"
            className="vocab-audio-btn"
            onClick={handleAudio}
            aria-label={`Nghe phát âm từ ${entry.lemma}`}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--classroom-primary, #123ab5)',
              padding: '0.25rem',
              borderRadius: '0.4rem',
            }}
          >
            <Volume2 size={18} aria-hidden="true" />
          </button>
        </div>

        {entry.ipa && <p className="vocab-card__ipa-row">{entry.ipa}</p>}
      </div>

      <div>
        <p className="vocab-card__meaning">
          {entry.vietnameseMeaning || entry.englishDefinition || 'Chưa có nghĩa'}
        </p>

        {entry.exampleSentence && (
          <p className="vocab-card__example" lang="en">
            "{highlightLemma(entry.exampleSentence, entry.lemma)}"
          </p>
        )}
      </div>

      <div
        className="vocab-card__bottom"
        style={isList ? { borderTop: 'none', paddingTop: 0, flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' } : undefined}
      >
        <span
          className="vocab-level-badge"
          style={{
            background: levelConfig.bgColor,
            color: levelConfig.color,
            border: `1px solid ${levelConfig.borderColor}`,
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: levelConfig.color,
            }}
            aria-hidden="true"
          />
          {levelConfig.label}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#64748b' }}>
          {entry.note && (
            <span
              title="Có ghi chú cá nhân"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: '#0284c7' }}
            >
              <FileText size={14} aria-hidden="true" />
            </span>
          )}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              color: relativeDue.isDue ? '#c0362c' : '#64748b',
              fontWeight: relativeDue.isDue ? 700 : 500,
            }}
          >
            <Clock size={13} aria-hidden="true" />
            {relativeDue.text}
          </span>
        </div>
      </div>
    </article>
  )
}
