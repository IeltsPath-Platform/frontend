import { Highlighter, NotebookPen } from 'lucide-react'

/**
 * Area B: the practice tools, on the left of the questions, the same two the Reading exam has. Select words in a question, then
 * press Highlight (H) to colour them or Notes (N) to write a note on them. Pressing a button never drops the selection.
 */
export function ListeningToolRail({ hasSelection, hint, notesCount, onHighlight, onNotes }: {
  hasSelection: boolean
  hint: string
  /** Notes written in this section; Notes shows or hides their panel when nothing is selected. */
  notesCount: number
  onHighlight: () => void
  onNotes: () => void
}) {
  return (
    <aside className="rw-tools" aria-label="Công cụ hỗ trợ">
      <p className="rw-tools-title">Công cụ</p>
      {/* mousedown is cancelled so pressing the button never drops the text selection */}
      <button type="button" className="rw-tool" onMouseDown={(event) => event.preventDefault()} onClick={onHighlight} aria-keyshortcuts="H">
        <Highlighter size={16} aria-hidden="true" />
        <span>Highlight</span>
        <small>Phím (H)</small>
      </button>
      <button type="button" className="rw-tool" onMouseDown={(event) => event.preventDefault()} onClick={onNotes} aria-keyshortcuts="N">
        <NotebookPen size={16} aria-hidden="true" />
        <span>Notes{notesCount > 0 ? ` (${notesCount})` : ''}</span>
        <small>Phím (N)</small>
      </button>
      <p className="rw-tools-help" role="status">{hint || (hasSelection ? 'Bấm Highlight (H) hoặc Notes (N).' : 'Bôi đen chữ trong câu hỏi rồi chọn công cụ.')}</p>
    </aside>
  )
}
