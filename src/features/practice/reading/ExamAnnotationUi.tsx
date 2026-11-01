import { useEffect, useRef, useState } from 'react'
import { Eraser, Highlighter, Quote, X } from 'lucide-react'
import type { Annotation, AnnotationPopup } from './useExamAnnotations'
import './reading-exam-annotations.css'

/** The small card next to selected text: Note and Highlight; on an existing mark, Clear (and Note when the mark is a note). */
export function ExamSelectionPopup({ popup, onNote, onOpenNote, onHighlight, onClear }: {
  popup: AnnotationPopup | null
  onNote: () => void
  onOpenNote: () => void
  onHighlight: () => void
  onClear: () => void
}) {
  if (!popup) return null
  return (
    <div
      className={`rw-annot-popup${popup.below ? ' is-below' : ''}`}
      style={{ left: popup.x, top: popup.y }}
      role="toolbar"
      aria-label="Công cụ trên đoạn đã chọn"
      // mousedown is cancelled so pressing a button never drops the text selection
      onMouseDown={(event) => event.preventDefault()}
    >
      {popup.annotationId ? (
        <>
          {popup.kind === 'note' && <button type="button" onClick={onOpenNote}><Quote size={20} aria-hidden="true" /><span>Note</span></button>}
          <button type="button" onClick={onClear}><Eraser size={20} aria-hidden="true" /><span>Clear</span></button>
        </>
      ) : (
        <>
          <button type="button" onClick={onNote}><Quote size={20} aria-hidden="true" /><span>Note</span></button>
          <button type="button" onClick={onHighlight}><Highlighter size={20} aria-hidden="true" /><span>Highlight</span></button>
        </>
      )}
    </div>
  )
}

/** Notes of the open part, on the right edge: the quoted text, a box to write in, and Delete. The note being written is blue. */
export function ExamNotesPanel({ notes, partLabel, focusId, onChange, onDelete, onFocused, onClose }: {
  notes: Annotation[]
  partLabel: string
  focusId: string | null
  onChange: (id: string, note: string) => void
  onDelete: (id: string) => void
  onFocused: () => void
  onClose: () => void
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  return (
    <aside className="rw-notes-panel" aria-label="Ghi chú">
      <header className="rw-notes-header">
        <h2>Notes</h2>
        <button type="button" className="rw-notes-close" aria-label="Đóng ghi chú" onClick={onClose}><X size={18} aria-hidden="true" /></button>
      </header>
      <div className="rw-notes-list">
        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            partLabel={partLabel}
            active={note.id === (focusId ?? activeId)}
            autoFocus={note.id === focusId}
            onActivate={() => setActiveId(note.id)}
            onChange={onChange}
            onDelete={onDelete}
            onFocused={onFocused}
          />
        ))}
      </div>
    </aside>
  )
}

function NoteCard({ note, partLabel, active, autoFocus, onActivate, onChange, onDelete, onFocused }: {
  note: Annotation
  partLabel: string
  active: boolean
  autoFocus: boolean
  onActivate: () => void
  onChange: (id: string, note: string) => void
  onDelete: (id: string) => void
  onFocused: () => void
}) {
  const field = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (!autoFocus) return
    field.current?.focus()
    onActivate()
    onFocused()
  }, [autoFocus, onActivate, onFocused])

  return (
    <div className={`rw-note${active ? ' is-active' : ''}`}>
      <p className="rw-note-quote"><strong>{partLabel}</strong> <em>{note.text}</em></p>
      <textarea
        ref={field}
        className="rw-note-field"
        rows={3}
        maxLength={2000}
        placeholder="Start typing your note"
        aria-label={`Ghi chú cho: ${note.text}`}
        value={note.note}
        onFocus={onActivate}
        onChange={(event) => onChange(note.id, event.target.value)}
      />
      <button type="button" className="rw-note-delete" onClick={() => onDelete(note.id)}>Delete</button>
    </div>
  )
}
