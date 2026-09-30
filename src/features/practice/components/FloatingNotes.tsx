import { useEffect, useRef, useState } from 'react'
import { ArrowLeftToLine, ArrowRightToLine, GripHorizontal, Maximize2, Minus, StickyNote, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { PassageSelection, PracticeNote } from '@/types/practice'
import { useFloatingPosition } from '../hooks/useFloatingPosition'

interface FloatingNotesProps {
  open: boolean
  minimized: boolean
  onMinimize: (minimized: boolean) => void
  selection: PassageSelection | null
  notes: PracticeNote[]
  onClose: () => void
  onAdd: (text: string) => void
  onDelete: (id: string) => void
}

export function FloatingNotes({ open, minimized, onMinimize, selection, notes, onClose, onAdd, onDelete }: FloatingNotesProps) {
  const [draft, setDraft] = useState('')
  const [message, setMessage] = useState('')
  const input = useRef<HTMLTextAreaElement>(null)
  const { ref: widgetRef, position, dock, handlePointerDown, handlePointerMove, handlePointerEnd, handleKeyDown } = useFloatingPosition()

  useEffect(() => {
    if (!open || minimized) return
    const frame = requestAnimationFrame(() => input.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [open, minimized, selection])

  function save() {
    if (!draft.trim()) return
    onAdd(draft.trim())
    setDraft('')
    setMessage('Đã lưu ghi chú trong phiên làm bài này.')
  }

  return (
    <aside ref={widgetRef} className={`floating-notes ${minimized ? 'is-minimized' : ''}`} hidden={!open}
      style={{ left: position.x, top: position.y }} aria-label="Ghi chú nổi"
      onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); onClose() } }}>
      <header className="floating-notes-header">
        <button type="button" className="note-drag-handle" aria-label="Di chuyển ghi chú: kéo hoặc dùng phím mũi tên"
          onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd} onLostPointerCapture={handlePointerEnd} onKeyDown={handleKeyDown}>
          <GripHorizontal aria-hidden="true" size={18} /><StickyNote aria-hidden="true" size={17} /><span>Ghi chú ({notes.length})</span>
        </button>
        <Button variant="ghost" size="icon" aria-label={minimized ? 'Mở rộng ghi chú' : 'Thu nhỏ ghi chú'} onClick={() => onMinimize(!minimized)}>{minimized ? <Maximize2 /> : <Minus />}</Button>
        <Button variant="ghost" size="icon" aria-label="Ẩn ghi chú" onClick={onClose}><X /></Button>
      </header>
      <div hidden={minimized} className="floating-notes-body">
        <div className="note-position-controls"><span>Kéo thanh tiêu đề để di chuyển</span><Button variant="ghost" size="icon" aria-label="Đưa ghi chú sang trái" onClick={() => dock('left')}><ArrowLeftToLine /></Button><Button variant="ghost" size="icon" aria-label="Đưa ghi chú sang phải" onClick={() => dock('right')}><ArrowRightToLine /></Button></div>
        {selection && <blockquote className="note-selection">{selection.text}</blockquote>}
        <form onSubmit={(event) => { event.preventDefault(); save() }} className="note-form">
          <label htmlFor="note-draft">Nội dung ghi chú</label>
          <Textarea id="note-draft" ref={input} value={draft} maxLength={3000} rows={3} onChange={(event) => setDraft(event.target.value)} placeholder="Điều bạn muốn ghi nhớ…" />
          <Button type="submit" disabled={!draft.trim()} className="practice-primary-button">Lưu ghi chú</Button>
        </form>
        <p className="note-session-hint">Ghi chú giữ trong phiên làm bài; tải lại trang sẽ xóa.</p>
        <p className="sr-only" role="status">{message}</p>
        <div className="floating-note-list">
          {notes.length === 0 && <p className="note-session-hint">Chưa có ghi chú. Chọn một đoạn văn và viết điều cần nhớ.</p>}
          {notes.map((note) => <article key={note.id}><div className="flex items-start justify-between gap-2"><strong>{note.paragraphLabel}</strong><Button variant="ghost" size="icon" aria-label={`Xóa ghi chú ${note.createdAt}`} onClick={() => onDelete(note.id)}><Trash2 /></Button></div>{note.selectedText && <blockquote>{note.selectedText}</blockquote>}<p>{note.noteText}</p><time>{note.createdAt}</time></article>)}
        </div>
      </div>
    </aside>
  )
}
