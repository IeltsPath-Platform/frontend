import { useState } from 'react'
import { Check, Pencil, Trash2 } from 'lucide-react'
import type { QuestionDraftItem, SectionQuestionDetail, SectionQuestionItem } from '../types'
import { QuestionDraftItemEditor } from './QuestionDraftItemEditor'
import { QuestionDraftItems } from './QuestionDraftItems'
import { REJECTED_REASON_LABEL } from '../lib/aiDraftLabels'

function sourceText(draft: SectionQuestionDetail) {
  const source = draft.request.source
  if (source && typeof source === 'object' && 'text' in source && typeof source.text === 'string') return source.text
  return ''
}

export function DraftReview({ draft, busy, onEdit, onRemove, onApprove, onReject }: {
  draft: SectionQuestionDetail; busy: boolean
  onEdit: (itemId: string, body: Record<string, unknown>) => Promise<boolean>
  onRemove: (itemId: string) => Promise<boolean>
  onApprove: (itemIds: string[], acceptSourceChange: boolean) => Promise<void>
  onReject: () => Promise<void>
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [editing, setEditing] = useState<string | null>(null)
  const [acceptSourceChange, setAcceptSourceChange] = useState(false)
  const items = (draft.result?.items ?? []) as SectionQuestionItem[]
  const rejected = draft.result?.rejected ?? []
  const selectedItems = items.filter((item) => selected.has(item.itemId))
  return <div className="adm-section-ai-review">
    <div className="adm-section-ai-review__summary"><strong>Yêu cầu {draft.result?.requested ?? 0}, dùng được {items.length}</strong>
      {rejected.length ? <ul>{rejected.map((entry, index) => <li key={`${entry.index}-${index}`}>Câu {entry.index + 1}: {REJECTED_REASON_LABEL[entry.reason.split(':')[0]!] ?? 'Câu hỏi chưa đạt kiểm tra'}</li>)}</ul> : null}
    </div>
    {draft.sourceChanged ? <label className="adm-section-ai-review__warning"><input type="checkbox" checked={acceptSourceChange} onChange={(event) => setAcceptSourceChange(event.target.checked)} /> Nguồn đã thay đổi. Tôi đã đối chiếu câu hỏi với nguồn hiện tại.</label> : null}
    {draft.sectionState !== 'OK' ? <p className="adm-alert adm-alert--error" role="alert">Phần hoặc phiên bản đề đã thay đổi. Chỉ có thể từ chối lượt này.</p> : null}
    <div className="adm-section-ai-review__columns">
      <section className="adm-section-ai-review__source" aria-label="Nguồn dùng để tạo câu hỏi"><h3>Nguồn</h3><pre>{sourceText(draft) || 'Nguồn không còn khả dụng.'}</pre></section>
      <section className="adm-section-ai-review__items" aria-label="Câu hỏi được tạo"><h3>Câu hỏi</h3>
        {!items.length ? <p className="adm-muted">Không còn câu nào để duyệt.</p> : null}
        {items.map((item, index) => <article className="adm-section-ai-review__item" key={item.itemId}>
          {editing === item.itemId ? <QuestionDraftItemEditor item={item} index={index} disabled={busy} onCancel={() => setEditing(null)} onSave={async (patch) => { const saved = await onEdit(item.itemId, patch as Record<string, unknown>); if (saved) setEditing(null); return saved }} /> : <>
            <label className="adm-section-ai-review__pick"><input type="checkbox" checked={selected.has(item.itemId)} disabled={busy || draft.sectionState !== 'OK'} onChange={(event) => setSelected((current) => { const next = new Set(current); if (event.target.checked) next.add(item.itemId); else next.delete(item.itemId); return next })} /> Chọn câu {index + 1}</label>
            <p className="adm-package-question-stem">{item.stem}</p>
            {item.options.map((option) => <p className="adm-muted" key={option.optionKey}>{option.optionKey}. {option.content}{item.answerSpec.type === 'CHOICE' && item.answerSpec.correct === option.optionKey ? ' ✓' : ''}</p>)}
            {item.answerSpec.type === 'FILL' ? <p>Đáp án: {item.answerSpec.accepted.join(' · ')}</p> : null}
            <p className="adm-muted">{item.explanation}</p>
            <div className="adm-package-actions"><button className="adm-btn adm-btn--small" type="button" disabled={busy} onClick={() => setEditing(item.itemId)}><Pencil size={14} aria-hidden="true" /> Sửa</button><button className="adm-btn adm-btn--small adm-btn--danger" type="button" disabled={busy} aria-label={`Bỏ câu ${index + 1}`} onClick={() => void onRemove(item.itemId)}><Trash2 size={14} aria-hidden="true" /> Bỏ</button></div>
          </>}
        </article>)}
      </section>
    </div>
    <div className="adm-form-footer">
      <button className="adm-btn adm-btn--danger" type="button" disabled={busy} onClick={() => void onReject()}>Từ chối lượt này</button>
      <button className="adm-btn adm-btn--primary" type="button" disabled={busy || draft.sectionState !== 'OK' || !selectedItems.length || (draft.sourceChanged && !acceptSourceChange)} onClick={() => void onApprove(selectedItems.map((item) => item.itemId), acceptSourceChange)}><Check size={16} aria-hidden="true" /> Thêm {selectedItems.length} câu vào phần</button>
    </div>
  </div>
}

/** The same selectable review surface for lesson and bank question drafts. */
export function QuestionDraftReview({ items, selected, disabled, onChange, actions }: {
  items: QuestionDraftItem[]
  selected: string[]
  disabled: boolean
  onChange: (ids: string[]) => void
  actions?: { onView: (index: number) => void; onEdit: (index: number) => void; onRemove: (index: number) => void }
}) {
  return <QuestionDraftItems actions={actions} disabled={disabled} items={items} onChange={onChange} selected={selected} />
}
