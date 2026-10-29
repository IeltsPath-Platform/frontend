import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { Check, ChevronLeft, ChevronRight, ExternalLink, Sparkles, Trash2, Volume2, X } from 'lucide-react'
import { speak } from '@/features/flashcards/lib/speak'
import { notebookApi, type NotebookEntryResponse } from '../api/notebookApi'
import { ALL_LEVELS, UNDERSTANDING_LEVELS, formatRelativeDue, getLevelConfig, type UnderstandingLevel } from '../lib/understanding'
import { playPronunciation, splitHighlight } from '../lib/dictionary-search'

/** Header gradients per understanding level, matching the level colours used on the cards. */
const LEVEL_GRADIENT: Record<UnderstandingLevel, string> = {
  UNKNOWN: 'linear-gradient(135deg, #e0464a, #ff8a5b)',
  FAMILIAR: 'linear-gradient(135deg, #f59e0b, #ffcf5c)',
  LEARNING: 'linear-gradient(135deg, #1647d6, #5b8cff)',
  MASTERED: 'linear-gradient(135deg, #16a34a, #4ade80)',
}
const LEVEL_EMOJI: Record<UnderstandingLevel, string> = { UNKNOWN: '🌱', FAMILIAR: '🌿', LEARNING: '🌳', MASTERED: '🏆' }

interface WordDetailDialogProps {
  entry: NotebookEntryResponse | null
  onClose: () => void
  onLevelChange: (flashcardId: string, newLevel: UnderstandingLevel) => Promise<void>
  onDelete: (flashcardId: string) => Promise<void>
  /** Called after the note autosaves so the list shows the note marker. */
  onNoteSaved?: (flashcardId: string, note: string | null) => void
  onNavigatePrev?: () => void
  onNavigateNext?: () => void
  hasPrev?: boolean
  hasNext?: boolean
}

/** A notebook word in a centred, colourful popup; ←/→ move between words and Esc closes. */
export function WordDetailDialog({ entry, onClose, ...rest }: WordDetailDialogProps) {
  return (
    <DialogPrimitive.Root open={entry !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="nb-dialog-overlay" />
        {/* Keyed by word so switching words replays the entrance and resets the note box. */}
        {entry && <WordDialogBody key={entry.flashcardId} entry={entry} {...rest} />}
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function WordDialogBody({ entry, onLevelChange, onDelete, onNoteSaved, onNavigatePrev, onNavigateNext, hasPrev, hasNext }: Omit<WordDetailDialogProps, 'entry' | 'onClose'> & { entry: NotebookEntryResponse }) {
  const [note, setNote] = useState(entry.note ?? '')
  const [noteState, setNoteState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [updatingLevel, setUpdatingLevel] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  // The note id is learned on the first save, so later autosaves update that note.
  const noteId = useRef<string | null | undefined>(undefined)
  const level = getLevelConfig(entry.level)
  const due = formatRelativeDue(entry.nextReviewAt)

  // Text typed but not yet saved; closing or moving to another word saves it right away instead of dropping it.
  const pending = useRef<string | null>(null)
  const latest = useRef({ senseId: entry.vocabularySenseId, flashcardId: entry.flashcardId, onNoteSaved })
  useEffect(() => {
    latest.current = { senseId: entry.vocabularySenseId, flashcardId: entry.flashcardId, onNoteSaved }
  })
  useEffect(() => () => {
    window.clearTimeout(timer.current)
    if (pending.current === null) return
    const { senseId, flashcardId, onNoteSaved: saved } = latest.current
    const value = pending.current
    void notebookApi.saveSenseNote(senseId, value, noteId.current).then(() => saved?.(flashcardId, value.trim() ? value : null), () => undefined)
  }, [])

  function changeNote(text: string) {
    const value = text.slice(0, 300)
    setNote(value)
    setNoteState('idle')
    pending.current = value
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(async () => {
      pending.current = null
      setNoteState('saving')
      try {
        noteId.current = await notebookApi.saveSenseNote(entry.vocabularySenseId, value, noteId.current)
        setNoteState('saved')
        onNoteSaved?.(entry.flashcardId, value.trim() ? value : null)
      } catch {
        setNoteState('error')
      }
    }, 800)
  }

  async function chooseLevel(next: UnderstandingLevel) {
    if (next === entry.level || updatingLevel) return
    setUpdatingLevel(true)
    try {
      await onLevelChange(entry.flashcardId, next)
    } finally {
      setUpdatingLevel(false)
    }
  }

  const sentence = entry.exampleSentence

  return (
    <DialogPrimitive.Content
      className="nb-dialog"
      aria-describedby={undefined}
      style={{ '--nb-level': level.color, '--nb-level-bg': level.bgColor } as CSSProperties}
      onKeyDown={(event) => {
        if ((event.target as HTMLElement).closest('textarea, input')) return
        if (event.key === 'ArrowLeft' && hasPrev) onNavigatePrev?.()
        if (event.key === 'ArrowRight' && hasNext) onNavigateNext?.()
      }}
    >
      <header className="nb-dialog__hero" style={{ background: LEVEL_GRADIENT[entry.level] ?? LEVEL_GRADIENT.UNKNOWN }}>
        <span className="nb-dialog__bubble nb-dialog__bubble--a" aria-hidden="true" />
        <span className="nb-dialog__bubble nb-dialog__bubble--b" aria-hidden="true" />
        <div className="nb-dialog__bar">
          <div className="nb-dialog__nav">
            {onNavigatePrev && <button type="button" onClick={onNavigatePrev} disabled={!hasPrev} aria-label="Từ trước đó"><ChevronLeft size={18} /></button>}
            {onNavigateNext && <button type="button" onClick={onNavigateNext} disabled={!hasNext} aria-label="Từ tiếp theo"><ChevronRight size={18} /></button>}
          </div>
          <span className="nb-dialog__level">{LEVEL_EMOJI[entry.level]} {level.label}</span>
          <DialogPrimitive.Close className="nb-dialog__close" aria-label="Đóng"><X size={18} /></DialogPrimitive.Close>
        </div>
        <div className="nb-dialog__word">
          <DialogPrimitive.Title asChild>
            <h2><span className="sr-only">Chi tiết từ </span><span lang="en">{entry.lemma}</span></h2>
          </DialogPrimitive.Title>
          <button type="button" className="nb-dialog__audio" onClick={() => playPronunciation(entry.lemma, entry.pronunciationAudioReference, speak)} aria-label={`Nghe phát âm từ ${entry.lemma}`}>
            <Volume2 size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="nb-dialog__sub">
          {entry.ipa && <span>{entry.ipa}</span>}
          {entry.partOfSpeech && <i>{entry.partOfSpeech}</i>}
          {entry.cefrLevel && <i>{entry.cefrLevel}</i>}
          {entry.topicName && <i>{entry.topicName}</i>}
        </div>
      </header>

      <div className="nb-dialog__body">
        <section className="nb-dialog__meaning">
          <p>{entry.vietnameseMeaning || 'Chưa có nghĩa tiếng Việt'}</p>
          {entry.englishDefinition && <small lang="en">{entry.englishDefinition}</small>}
        </section>

        {sentence && (
          <section>
            <h3 className="nb-dialog__label">Ví dụ ngữ cảnh</h3>
            <blockquote className="nb-dialog__example" lang="en">
              “{splitHighlight(sentence, entry.lemma).map((part, i) => (part.match ? <mark key={i}>{part.text}</mark> : part.text))}”
            </blockquote>
          </section>
        )}

        <section>
          <div className="nb-dialog__row">
            <h3 className="nb-dialog__label">Mức độ hiểu</h3>
            <span className={`nb-dialog__due${due.isDue ? ' is-due' : ''}`}>{due.text}</span>
          </div>
          <div className="nb-levels" role="radiogroup" aria-label="Chọn mức độ hiểu">
            {ALL_LEVELS.map((key) => {
              const config = UNDERSTANDING_LEVELS[key]
              const active = entry.level === key
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={updatingLevel}
                  onClick={() => void chooseLevel(key)}
                  className={active ? 'is-active' : undefined}
                  style={{ '--lv': config.color, '--lv-bg': config.bgColor, '--lv-border': config.borderColor } as CSSProperties}
                >
                  <span aria-hidden="true">{LEVEL_EMOJI[key]}</span>
                  {config.shortLabel}
                </button>
              )
            })}
          </div>
        </section>

        <section>
          <div className="nb-dialog__row">
            <label htmlFor="nb-note" className="nb-dialog__label">Ghi chú cá nhân</label>
            <span className={`nb-dialog__note-state is-${noteState}`}>
              {noteState === 'saving' ? 'Đang lưu…' : noteState === 'saved' ? <><Check size={12} aria-hidden="true" />Đã lưu</> : noteState === 'error' ? 'Lưu thất bại' : `${note.length}/300`}
            </span>
          </div>
          <textarea
            id="nb-note"
            className="nb-dialog__note"
            value={note}
            onChange={(event) => changeNote(event.target.value)}
            maxLength={300}
            placeholder="Mẹo nhớ, cụm từ đi kèm hoặc câu của riêng bạn…"
          />
        </section>

        <footer className="nb-dialog__actions">
          <Link to={`/vocabulary/notebook/review?singleCardId=${entry.flashcardId}`} className="nb-dialog__primary">
            <Sparkles size={17} aria-hidden="true" />Ôn từ này ngay
          </Link>
          <Link to={`/vocabulary/${entry.vocabularyItemId}`} className="nb-dialog__secondary">
            Chi tiết từ điển<ExternalLink size={14} aria-hidden="true" />
          </Link>
          <button
            type="button"
            className={`nb-dialog__delete${confirmDelete ? ' is-confirm' : ''}`}
            onClick={() => (confirmDelete ? void onDelete(entry.flashcardId) : setConfirmDelete(true))}
            onBlur={() => setConfirmDelete(false)}
          >
            <Trash2 size={15} aria-hidden="true" />
            {confirmDelete ? 'Bấm lần nữa để xóa' : 'Xóa khỏi sổ tay'}
          </button>
        </footer>
        {(onNavigatePrev || onNavigateNext) && <p className="nb-dialog__hint">Mẹo: dùng phím ← → để chuyển từ, Esc để đóng.</p>}
      </div>
    </DialogPrimitive.Content>
  )
}
