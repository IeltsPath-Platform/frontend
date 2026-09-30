import { Highlighter, Languages, Layers, StickyNote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PassageAction, PassageSelection } from '@/types/practice'

interface PassageToolsProps {
  selection: PassageSelection | null
  highlightsCount: number
  onAction: (action: PassageAction) => void
  onClearHighlights: () => void
  onOpenLibrary: () => void
}

const PASSAGE_TOOLS = [
  { action: 'highlight', label: 'Highlight', icon: Highlighter },
  { action: 'note', label: 'Note', icon: StickyNote },
  { action: 'dictionary', label: 'Tra từ vựng', icon: Languages },
  { action: 'flashcard', label: 'Tạo Flashcard', icon: Layers },
] as const

export function PassageTools({ selection, highlightsCount, onAction, onClearHighlights, onOpenLibrary }: PassageToolsProps) {
  return (
    <section className="passage-tools" aria-labelledby="passage-tools-heading">
      <div className="passage-tools-heading">
        <div>
          <p className="workspace-eyebrow">PRACTICE TOOLS</p>
          <h2 id="passage-tools-heading">Công cụ hỗ trợ</h2>
        </div>
        <p>{selection ? 'Đoạn văn đã sẵn sàng để thao tác.' : 'Bôi đen một đoạn trong bài đọc để bắt đầu.'}</p>
      </div>
      <div className="passage-tools-actions">
        {PASSAGE_TOOLS.map(({ action, label, icon: Icon }) => (
          <Button key={action} type="button" variant="outline" className="passage-tool-button" disabled={!selection} onClick={() => onAction(action)}>
            <Icon aria-hidden="true" size={17} />
            <span>{label}</span>
          </Button>
        ))}
        {highlightsCount > 0 && <Button type="button" variant="ghost" className="passage-tool-button" onClick={onClearHighlights}>Bỏ Highlight</Button>}
        <Button type="button" variant="ghost" className="passage-tool-button" onClick={onOpenLibrary}>
          <Layers aria-hidden="true" size={17} />
          <span>Thẻ đã lưu</span>
        </Button>
      </div>
    </section>
  )
}
