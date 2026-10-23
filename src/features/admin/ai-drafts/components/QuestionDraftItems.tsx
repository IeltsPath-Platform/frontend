import { DIFFICULTY_LABEL } from '../../questions/lib/labels'
import type { QuestionDraftItem } from '../types'

export function QuestionDraftItems({ items, selected, disabled, onChange }: {
  items: readonly QuestionDraftItem[]; selected: number[]; disabled: boolean; onChange: (indexes: number[]) => void
}) {
  function toggle(index: number, checked: boolean) {
    if (disabled) return
    onChange(checked ? [...selected.filter((value) => value !== index), index].sort((left, right) => left - right) : selected.filter((value) => value !== index))
  }
  return <div className="adm-draft-items">
    {items.map((item, index) => <article className="adm-card adm-draft-item" key={index} aria-label={`Câu ${index + 1}`}>
      <div className="adm-draft-item-heading">
        <h3>Câu {index + 1}</h3>
        <span className="adm-badge">Độ khó: {DIFFICULTY_LABEL[item.difficulty]}</span>
      </div>
      <label className="adm-check"><input type="checkbox" checked={selected.includes(index)} disabled={disabled} onChange={(event) => toggle(index, event.target.checked)} /><span>Chọn câu {index + 1} để duyệt</span></label>
      <p className="adm-draft-stem">{item.stem}</p>
      {item.answerSpec.type === 'CHOICE' ? <ul className="adm-draft-options">{[...item.options].sort((left, right) => left.sortOrder - right.sortOrder).map((option) => {
        const correct = item.answerSpec.type === 'CHOICE' && item.answerSpec.correct === option.optionKey
        const distractor = item.answerSpec.type === 'CHOICE' ? item.answerSpec.distractors?.[option.optionKey] : undefined
        return <li className={`adm-draft-option${correct ? ' adm-draft-option--correct' : ''}`} key={option.optionKey}>
          <strong>{option.optionKey}.</strong>
          <div className="adm-draft-option-content"><p>{option.content}</p>{correct ? <strong>Đáp án đúng</strong> : distractor ? <p className="adm-muted">Mã lỗi: <code>{distractor}</code></p> : null}</div>
        </li>
      })}</ul> : <div className="adm-draft-answers">
        <h4>Đáp án được chấp nhận</h4>
        <ul>{item.answerSpec.accepted.map((answer, answerIndex) => <li key={answerIndex}>{answer}</li>)}</ul>
        {item.answerSpec.maxWords !== undefined ? <p className="adm-muted">Tối đa {item.answerSpec.maxWords} từ.</p> : null}
      </div>}
      <h4>Giải thích</h4>
      <p className="adm-draft-stem">{item.explanation}</p>
    </article>)}
  </div>
}
