import { Eye, Pencil, Trash2 } from 'lucide-react'
import { AdminRowMenu, type RowMenuItem } from '../../components/AdminRowMenu'
import { DIFFICULTY_LABEL } from '../../questions/lib/labels'
import type { QuestionDraftItem } from '../types'

export interface QuestionDraftItemActions {
  onView: (index: number) => void
  onEdit: (index: number) => void
  onRemove: (index: number) => void
}

/** The answer a question keeps: the key and text of the correct option, or the accepted answers of a typed question. */
function answerOf(item: QuestionDraftItem): { key: string | null; text: string; more: number } {
  if (item.answerSpec.type === 'CHOICE') {
    const correct = item.answerSpec.correct
    return { key: correct, text: item.options.find((option) => option.optionKey === correct)?.content ?? '', more: 0 }
  }
  const [first = '', ...rest] = item.answerSpec.accepted
  return { key: null, text: first, more: rest.length }
}

/**
 * The generated questions as one table: pick the ones to keep, see the answer at a glance, and open a question's full
 * view, edit or removal from its row menu. Stems stay on one or two lines; the whole question is in its view.
 */
export function QuestionDraftItems({ items, selected, disabled, actions, onChange }: {
  items: readonly QuestionDraftItem[]
  selected: number[]
  disabled: boolean
  /** Without actions the table is read only, as it is once the draft has left the review. */
  actions?: QuestionDraftItemActions
  onChange: (indexes: number[]) => void
}) {
  function toggle(index: number, checked: boolean) {
    if (disabled) return
    onChange(checked ? [...selected.filter((value) => value !== index), index].sort((left, right) => left - right) : selected.filter((value) => value !== index))
  }

  function menuOf(index: number): RowMenuItem[] {
    const number = index + 1
    const menu: RowMenuItem[] = [
      { key: 'view', label: 'Xem chi tiết', ariaLabel: `Xem câu ${number}`, icon: <Eye aria-hidden="true" size={16} />, onSelect: () => actions!.onView(index) },
      { key: 'edit', label: 'Sửa', ariaLabel: `Sửa câu ${number}`, icon: <Pencil aria-hidden="true" size={16} />, disabled, onSelect: () => actions!.onEdit(index) },
      { key: 'remove', label: 'Xóa', ariaLabel: `Xóa câu ${number}`, icon: <Trash2 aria-hidden="true" size={16} />, tone: 'danger', disabled, onSelect: () => actions!.onRemove(index) },
    ]
    return menu
  }

  return <div className="adm-table-wrap">
    <table aria-label="Câu hỏi sinh được" className="adm-table dr-items">
      <thead>
        <tr>
          <th className="adm-stt" scope="col">STT</th>
          <th className="dr-col-pick" scope="col">Duyệt</th>
          <th scope="col">Câu hỏi</th>
          <th scope="col">Đáp án</th>
          <th scope="col">Độ khó</th>
          {actions ? <th className="adm-col-actions" scope="col">Hành động</th> : null}
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => {
          const number = index + 1
          const answer = answerOf(item)
          return <tr className={selected.includes(index) ? 'is-selected' : undefined} key={index}>
            <td className="adm-stt">{number}</td>
            <td>
              <input
                aria-label={`Chọn câu ${number} để duyệt`}
                checked={selected.includes(index)}
                disabled={disabled}
                onChange={(event) => toggle(index, event.target.checked)}
                type="checkbox"
              />
            </td>
            <td><span className="dr-stem">{item.stem}</span></td>
            <td>
              <span className="dr-answer">
                {answer.key ? <span aria-hidden="true" className="dr-key dr-key--correct">{answer.key}</span> : null}
                <span className="adm-sr-only">Đáp án đúng: </span>
                <span className="dr-answer__text">{answer.text || '—'}{answer.more ? <small className="adm-muted"> +{answer.more}</small> : null}</span>
              </span>
            </td>
            <td><span className="adm-badge">{DIFFICULTY_LABEL[item.difficulty]}</span></td>
            {actions ? <td className="adm-col-actions"><AdminRowMenu items={menuOf(index)} label={`Hành động của câu ${number}`} /></td> : null}
          </tr>
        })}
      </tbody>
    </table>
  </div>
}
