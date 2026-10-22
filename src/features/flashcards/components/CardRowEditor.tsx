import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import type { EditorRow } from '../lib/deckEditor'
import { ImagePicker } from './ImagePicker'

interface CardRowEditorProps {
  row: EditorRow
  index: number
  total: number
  error?: string
  onChange: (patch: Partial<EditorRow>) => void
  onRemove: () => void
  onMove: (offset: -1 | 1) => void
  onBusyChange: (busy: boolean) => void
  /** Tab out of the last field of the last row appends a new row, so typing a whole deck needs no mouse. */
  onTabFromLast?: () => void
}

export function CardRowEditor({ row, index, total, error, onChange, onRemove, onMove, onBusyChange, onTabFromLast }: CardRowEditorProps) {
  const number = index + 1
  return (
    <li className={`deck-editor-row${error ? ' has-error' : ''}`} aria-label={`Thẻ ${number}`}>
      <header>
        <strong>{number}</strong>
        <div className="deck-editor-row-tools">
          <button type="button" aria-label={`Đưa thẻ ${number} lên`} disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp /></button>
          <button type="button" aria-label={`Đưa thẻ ${number} xuống`} disabled={index === total - 1} onClick={() => onMove(1)}><ArrowDown /></button>
          <button type="button" aria-label={`Xóa thẻ ${number}`} disabled={total <= 1} onClick={onRemove}><Trash2 /></button>
        </div>
      </header>
      <div className="deck-editor-row-body">
        <label className="deck-editor-field">
          <textarea rows={1} value={row.front} maxLength={4000} placeholder="Nhập thuật ngữ" onChange={(event) => onChange({ front: event.target.value })} />
          <span>Thuật ngữ</span>
        </label>
        <div className="deck-editor-definition">
          <label className="deck-editor-field">
            <textarea rows={1} value={row.back} maxLength={4000} placeholder="Nhập định nghĩa" onChange={(event) => onChange({ back: event.target.value })} />
            <span>Định nghĩa</span>
          </label>
          <label className="deck-editor-field deck-editor-example">
            <textarea rows={1} value={row.example} maxLength={1000} placeholder="Câu ví dụ (không bắt buộc)"
              onChange={(event) => onChange({ example: event.target.value })}
              onKeyDown={(event) => { if (event.key === 'Tab' && !event.shiftKey && onTabFromLast) onTabFromLast() }} />
            <span>Ví dụ</span>
          </label>
        </div>
        <ImagePicker compact label="Hình ảnh" value={row.image} onChange={(image) => onChange({ image })} onBusyChange={onBusyChange} />
      </div>
      {error && <p role="alert" className="deck-editor-row-error">{error}</p>}
    </li>
  )
}
