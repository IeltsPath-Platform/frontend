import { useEffect, useRef } from 'react'
import { Layers, LoaderCircle, Volume2, X } from 'lucide-react'
import { speak } from '@/features/flashcards/lib/speak'
import type { WordLookupState } from './useWordLookup'
import './reading-word-lookup.css'

const POPOVER_WIDTH = 328
const POPOVER_HEIGHT_ESTIMATE = 260

const PART_OF_SPEECH: Record<string, string> = {
  NOUN: 'danh từ', VERB: 'động từ', ADJECTIVE: 'tính từ', ADVERB: 'trạng từ', PREPOSITION: 'giới từ',
  CONJUNCTION: 'liên từ', IDIOM: 'thành ngữ', PHRASAL_VERB: 'cụm động từ',
}

/**
 * The card next to a clicked word: its meaning and pronunciation from the vocabulary library, and a "save to flashcards"
 * button (not wired yet).
 */
export function WordLookupPopover({ state, onClose, onRetry }: { state: WordLookupState; onClose: () => void; onRetry: () => void }) {
  const card = useRef<HTMLDivElement>(null)
  const playing = useRef<HTMLAudioElement | null>(null)

  // Closing the card, or clicking the next word, cuts the recording short.
  useEffect(() => () => playing.current?.pause(), [])

  // A click anywhere outside the card (the next click on the passage opens the next word) closes it.
  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (card.current && !card.current.contains(event.target as Node)) onClose()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [onClose])

  const { rect } = state
  const left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - POPOVER_WIDTH - 8))
  const above = rect.bottom + POPOVER_HEIGHT_ESTIMATE > window.innerHeight && rect.top > POPOVER_HEIGHT_ESTIMATE
  const style = above ? { left, bottom: window.innerHeight - rect.top + 8 } : { left, top: rect.bottom + 8 }
  const entry = state.status === 'found' ? state.entry : null

  /** Plays the recording of one accent; without one (or when it cannot load) the browser reads the word aloud. */
  function pronounce(url: string | null) {
    playing.current?.pause()
    if (!entry) return
    if (!url) return speak(entry.lemma)
    const recording = new Audio(url)
    playing.current = recording
    recording.play().catch(() => speak(entry.lemma))
  }

  return (
    <div ref={card} className="rw-word-card" style={style} role="dialog" aria-label={`Nghĩa của từ ${state.word}`}>
      <header className="rw-word-head">
        <div>
          <strong className="rw-word-title">{entry?.lemma ?? state.word}</strong>
          {entry?.ipa && <span className="rw-word-ipa">{entry.ipa}</span>}
        </div>
        <button type="button" className="rw-word-close" aria-label="Đóng" onClick={onClose}><X size={16} aria-hidden="true" /></button>
      </header>

      {entry && (
        <div className="rw-word-audio">
          {entry.audioUk && <PronounceButton label="UK" title="Nghe giọng Anh" onClick={() => pronounce(entry.audioUk)} />}
          {entry.audioUs && <PronounceButton label="US" title="Nghe giọng Mỹ" onClick={() => pronounce(entry.audioUs)} />}
          {!entry.audioUk && !entry.audioUs && <PronounceButton label="Nghe" title="Nghe phát âm" onClick={() => pronounce(null)} />}
        </div>
      )}

      {state.status === 'loading' && <p className="rw-word-note"><LoaderCircle className="animate-spin" size={14} aria-hidden="true" /> Đang tra từ…</p>}
      {state.status === 'missing' && <p className="rw-word-note">Từ này chưa có trong từ điển.</p>}
      {state.status === 'error' && (
        <p className="rw-word-note">Không tra được từ lúc này. <button type="button" className="rw-word-retry" onClick={onRetry}>Thử lại</button></p>
      )}

      {entry && entry.senses.length === 0 && <p className="rw-word-note">Từ này mới có phiên âm, chưa có nghĩa trong từ điển.</p>}

      {entry && entry.senses.length > 0 && (
        <ul className="rw-word-senses">
          {entry.senses.slice(0, 3).map((sense, index) => (
            <li key={index}>
              {/* A meaning that opens with its own grammar note, "(đại từ) …", already says what kind of word it is. */}
              {sense.partOfSpeech && !sense.vietnameseMeaning?.startsWith('(') && <span className="rw-word-pos">{PART_OF_SPEECH[sense.partOfSpeech] ?? sense.partOfSpeech.toLowerCase()}</span>}
              {sense.vietnameseMeaning && <p className="rw-word-vi">{sense.vietnameseMeaning}</p>}
              {sense.englishDefinition && <p className="rw-word-en">{sense.englishDefinition}</p>}
              {sense.exampleSentence && <p className="rw-word-example">“{sense.exampleSentence}”</p>}
            </li>
          ))}
        </ul>
      )}

      {/* Saving to flashcards comes later; the button is only shown for now. */}
      <button type="button" className="rw-word-save" disabled title="Tính năng đang phát triển">
        <Layers size={15} aria-hidden="true" /> Lưu vào Flashcard
      </button>
    </div>
  )
}

function PronounceButton({ label, title, onClick }: { label: string; title: string; onClick: () => void }) {
  return (
    <button type="button" className="rw-word-speak" title={title} aria-label={title} onClick={onClick}>
      <Volume2 size={14} aria-hidden="true" /> {label}
    </button>
  )
}
