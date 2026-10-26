import { useEffect, useRef, useState } from 'react'
import {
  X,
  Volume2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Check,
  Sparkles,
  ExternalLink,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { NotebookEntryResponse } from '../api/notebookApi'
import { notebookApi } from '../api/notebookApi'
import {
  ALL_LEVELS,
  UNDERSTANDING_LEVELS,
  type UnderstandingLevel,
  formatRelativeDue,
} from '../lib/understanding'
import { speak } from '@/features/flashcards/lib/speak'

interface WordDetailSheetProps {
  entry: NotebookEntryResponse | null
  isOpen: boolean
  onClose: () => void
  onLevelChange: (flashcardId: string, newLevel: UnderstandingLevel) => Promise<void>
  onDelete: (flashcardId: string) => Promise<void>
  onNavigatePrev?: () => void
  onNavigateNext?: () => void
  hasPrev?: boolean
  hasNext?: boolean
}

export function WordDetailSheet({
  entry,
  isOpen,
  onClose,
  onLevelChange,
  onDelete,
  onNavigatePrev,
  onNavigateNext,
  hasPrev,
  hasNext,
}: WordDetailSheetProps) {
  const [noteBody, setNoteBody] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [noteSavedFeedback, setNoteSavedFeedback] = useState(false)
  const [isUpdatingLevel, setIsUpdatingLevel] = useState(false)
  const noteDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      if (entry) {
        setNoteBody(entry.note ?? '')
        setNoteSavedFeedback(false)
      }
    })
    return () => cancelAnimationFrame(frameId)
  }, [entry])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrev && onNavigatePrev) onNavigatePrev()
      if (e.key === 'ArrowRight' && hasNext && onNavigateNext) onNavigateNext()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, hasPrev, hasNext, onNavigatePrev, onNavigateNext])

  if (!isOpen || !entry) return null

  const handleAudio = () => {
    if (entry.pronunciationAudioReference && entry.pronunciationAudioReference.startsWith('https://')) {
      const audio = new Audio(entry.pronunciationAudioReference)
      audio.play().catch(() => speak(entry.lemma))
    } else {
      speak(entry.lemma)
    }
  }

  const handleLevelSelect = async (level: UnderstandingLevel) => {
    if (level === entry.level || isUpdatingLevel) return
    setIsUpdatingLevel(true)
    try {
      await onLevelChange(entry.flashcardId, level)
    } finally {
      setIsUpdatingLevel(false)
    }
  }

  const handleNoteChange = (text: string) => {
    const trimmed = text.slice(0, 300)
    setNoteBody(trimmed)
    setNoteSavedFeedback(false)

    if (noteDebounceTimer.current) {
      clearTimeout(noteDebounceTimer.current)
    }

    noteDebounceTimer.current = setTimeout(async () => {
      setIsSavingNote(true)
      try {
        await notebookApi.saveSenseNote(entry.vocabularySenseId, trimmed)
        setNoteSavedFeedback(true)
      } catch {
        // failed silently or log
      } finally {
        setIsSavingNote(false)
      }
    }, 800)
  }

  const relativeDue = formatRelativeDue(entry.nextReviewAt)

  return (
    <>
      <div
        className="vocab-drawer-overlay"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="vocab-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`Chi tiết từ ${entry.lemma}`}
      >
        <div className="vocab-drawer__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {onNavigatePrev && (
              <button
                type="button"
                onClick={onNavigatePrev}
                disabled={!hasPrev}
                aria-label="Từ trước đó"
                style={{
                  background: 'none',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.4rem',
                  padding: '0.35rem',
                  cursor: hasPrev ? 'pointer' : 'default',
                  opacity: hasPrev ? 1 : 0.35,
                }}
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
            )}
            {onNavigateNext && (
              <button
                type="button"
                onClick={onNavigateNext}
                disabled={!hasNext}
                aria-label="Từ tiếp theo"
                style={{
                  background: 'none',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.4rem',
                  padding: '0.35rem',
                  cursor: hasNext ? 'pointer' : 'default',
                  opacity: hasNext ? 1 : 0.35,
                }}
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            )}
            <span style={{ fontSize: '0.85rem', color: '#64748b', marginLeft: '0.5rem' }}>
              Chi tiết mục từ
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng ngăn chi tiết"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: '0.4rem',
            }}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="vocab-drawer__body">
          {/* Main word banner */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--classroom-text, #202633)' }} lang="en">
                  {entry.lemma}
                </h2>
                {entry.partOfSpeech && (
                  <span className="vocab-card__pos">{entry.partOfSpeech}</span>
                )}
              </div>

              <button
                type="button"
                onClick={handleAudio}
                aria-label={`Nghe phát âm từ ${entry.lemma}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: '#eef3ff',
                  border: 'none',
                  color: 'var(--classroom-primary, #123ab5)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                }}
              >
                <Volume2 size={16} aria-hidden="true" />
                Nghe
              </button>
            </div>

            {entry.ipa && (
              <p style={{ color: '#64748b', margin: '0 0 0.85rem', fontSize: '0.95rem' }}>
                {entry.ipa}
              </p>
            )}

            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.4rem' }}>
                {entry.vietnameseMeaning || 'Chưa có nghĩa tiếng Việt'}
              </p>
              {entry.englishDefinition && (
                <p style={{ fontSize: '0.875rem', color: '#475569', margin: 0 }} lang="en">
                  {entry.englishDefinition}
                </p>
              )}
            </div>
          </div>

          {/* Example Sentence */}
          {entry.exampleSentence && (
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                Ví dụ ngữ cảnh
              </h4>
              <blockquote
                style={{
                  margin: 0,
                  padding: '0.75rem 1rem',
                  borderLeft: '3px solid var(--classroom-primary, #123ab5)',
                  background: '#f8faff',
                  borderRadius: '0 0.5rem 0.5rem 0',
                  fontSize: '0.9rem',
                  fontStyle: 'italic',
                  color: '#1e293b',
                  lineHeight: 1.5,
                }}
                lang="en"
              >
                "{entry.exampleSentence}"
              </blockquote>
            </div>
          )}

          {/* Understanding Level Segmented Control */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', margin: 0 }}>
                Mức độ hiểu (Hộp Leitner)
              </h4>
              <span style={{ fontSize: '0.8rem', color: relativeDue.isDue ? '#c0362c' : '#64748b', fontWeight: 600 }}>
                {relativeDue.text}
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '0.4rem',
                background: '#f1f5f9',
                padding: '0.35rem',
                borderRadius: '0.75rem',
              }}
            >
              {ALL_LEVELS.map((lvl) => {
                const config = UNDERSTANDING_LEVELS[lvl]
                const isActive = entry.level === lvl
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => handleLevelSelect(lvl)}
                    disabled={isUpdatingLevel}
                    style={{
                      padding: '0.55rem 0.25rem',
                      border: 'none',
                      borderRadius: '0.5rem',
                      background: isActive ? config.bgColor : 'transparent',
                      color: isActive ? config.color : '#475569',
                      fontWeight: isActive ? 800 : 600,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s ease',
                      textAlign: 'center',
                    }}
                  >
                    {config.shortLabel}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Personal Note Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <label htmlFor="word-personal-note" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                Ghi chú cá nhân
              </label>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                {noteSavedFeedback ? (
                  <span style={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Check size={12} aria-hidden="true" /> Đã lưu
                  </span>
                ) : isSavingNote ? (
                  'Đang lưu…'
                ) : (
                  `${noteBody.length}/300 ký tự`
                )}
              </span>
            </div>

            <textarea
              id="word-personal-note"
              className="vocab-drawer__note-input"
              placeholder="Thêm cách nhớ, cụm từ đi kèm, hoặc câu riêng của bạn (tối đa 300 ký tự)..."
              value={noteBody}
              onChange={(e) => handleNoteChange(e.target.value)}
              maxLength={300}
            />
          </div>

          {/* Actions & Navigation */}
          <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link
              to={`/vocabulary/notebook/review?singleCardId=${entry.flashcardId}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                background: 'var(--classroom-primary, #123ab5)',
                color: 'white',
                padding: '0.75rem',
                borderRadius: '0.65rem',
                fontWeight: 700,
                fontSize: '0.9rem',
                textDecoration: 'none',
              }}
            >
              <Sparkles size={18} aria-hidden="true" />
              Ôn từ này ngay
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Link
                to={`/vocabulary/${entry.vocabularyItemId}`}
                style={{
                  fontSize: '0.825rem',
                  color: 'var(--classroom-primary, #123ab5)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                Xem chi tiết từ điển <ExternalLink size={14} aria-hidden="true" />
              </Link>

              <button
                type="button"
                onClick={() => onDelete(entry.flashcardId)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#dc2626',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.35rem 0.5rem',
                  borderRadius: '0.4rem',
                }}
              >
                <Trash2 size={15} aria-hidden="true" />
                Xóa khỏi sổ tay
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
