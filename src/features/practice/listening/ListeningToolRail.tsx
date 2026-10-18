import { Bookmark } from 'lucide-react'

/** Area B: the practice tool. The real exam interface has none. */
export function ListeningToolRail({ currentQuestion, flagged, onToggleFlag }: {
  currentQuestion: number
  flagged: boolean
  onToggleFlag: () => void
}) {
  return (
    <aside className="rw-tools" aria-label="Công cụ hỗ trợ">
      <p className="rw-tools-title">Công cụ</p>
      <button type="button" className={`rw-tool${flagged ? ' lw-tool-on' : ''}`} aria-pressed={flagged} onClick={onToggleFlag}>
        <Bookmark size={16} aria-hidden="true" fill={flagged ? 'currentColor' : 'none'} />
        <span>Đánh dấu</span>
        <small>Câu {currentQuestion}</small>
      </button>
      <p className="rw-tools-help">Đánh dấu câu muốn xem lại, chấm vàng hiện ở thanh số câu.</p>
    </aside>
  )
}
