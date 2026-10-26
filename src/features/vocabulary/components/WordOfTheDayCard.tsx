import { Sparkles, Volume2, ArrowRight } from 'lucide-react'
import type { NotebookEntryResponse } from '../api/notebookApi'
import { selectWordOfTheDay } from '../lib/word-of-day'
import { speak } from '@/features/flashcards/lib/speak'

interface WordOfTheDayCardProps {
  entries: readonly NotebookEntryResponse[]
  onSelectWord: (entry: NotebookEntryResponse) => void
}

export function WordOfTheDayCard({ entries, onSelectWord }: WordOfTheDayCardProps) {
  const wotd = selectWordOfTheDay(entries)
  if (!wotd) return null

  const handleAudio = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (wotd.pronunciationAudioReference && wotd.pronunciationAudioReference.startsWith('https://')) {
      const audio = new Audio(wotd.pronunciationAudioReference)
      audio.play().catch(() => speak(wotd.lemma))
    } else {
      speak(wotd.lemma)
    }
  }

  return (
    <div
      className="vocab-wotd-card"
      onClick={() => onSelectWord(wotd)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelectWord(wotd)
        }
      }}
      aria-label={`Từ của ngày: ${wotd.lemma}`}
      style={{ cursor: 'pointer' }}
    >
      <div>
        <div className="vocab-wotd-badge">
          <Sparkles size={13} aria-hidden="true" />
          Từ của ngày
        </div>
        <h3 className="vocab-wotd-lemma" lang="en">
          {wotd.lemma}
          {wotd.partOfSpeech && (
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#15803d',
                background: '#bbf7d0',
                padding: '0.15rem 0.5rem',
                borderRadius: '0.35rem',
              }}
            >
              {wotd.partOfSpeech}
            </span>
          )}
          <button
            type="button"
            onClick={handleAudio}
            aria-label={`Nghe phát âm từ ${wotd.lemma}`}
            style={{
              background: 'none',
              border: 'none',
              color: '#16a34a',
              cursor: 'pointer',
              padding: '0.2rem',
            }}
          >
            <Volume2 size={18} aria-hidden="true" />
          </button>
        </h3>
        <p className="vocab-wotd-meaning">
          {wotd.vietnameseMeaning || wotd.englishDefinition}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#15803d', fontWeight: 700, fontSize: '0.85rem' }}>
        <span>Xem chi tiết</span>
        <ArrowRight size={18} aria-hidden="true" />
      </div>
    </div>
  )
}

