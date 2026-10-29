import { Check } from 'lucide-react'
import type { QuestionDraftItem } from '../types'

/**
 * One generated question in full, for checking its answer before it is approved: the stem, each option with its key and
 * the error code of a wrong one, the accepted answers of a typed question and the explanation.
 */
export function QuestionDraftItemView({ item }: { item: QuestionDraftItem }) {
  if (item.answerSpec.type === 'FILL') {
    const { accepted, maxWords } = item.answerSpec
    return <div className="dr-view">
      <p className="dr-view__stem">{item.stem}</p>
      <section aria-label="Đáp án được chấp nhận" className="dr-view__section">
        <h3>Đáp án được chấp nhận</h3>
        <ul className="dr-accepted">{accepted.map((answer, index) => <li key={index}>{answer}</li>)}</ul>
        {maxWords !== undefined ? <p className="adm-muted">Tối đa {maxWords} từ</p> : null}
      </section>
      <Explanation text={item.explanation} />
    </div>
  }

  const { correct, distractors } = item.answerSpec
  const options = [...item.options].sort((left, right) => left.sortOrder - right.sortOrder)
  return <div className="dr-view">
    <p className="dr-view__stem">{item.stem}</p>
    <ul aria-label="Lựa chọn" className="dr-options">
      {options.map((option) => {
        const isCorrect = option.optionKey === correct
        const code = distractors?.[option.optionKey]
        return <li className={`dr-option${isCorrect ? ' is-correct' : ''}`} key={option.optionKey}>
          <span className={`dr-key${isCorrect ? ' dr-key--correct' : ''}`}>{option.optionKey}</span>
          <p className="dr-option__content">{option.content}</p>
          <span className="dr-option__mark">
            {isCorrect ? <><Check aria-hidden="true" size={14} /> Đáp án đúng</> : code ? <>Mã lỗi <code>{code}</code></> : null}
          </span>
        </li>
      })}
    </ul>
    <Explanation text={item.explanation} />
  </div>
}

function Explanation({ text }: { text: string }) {
  return <section aria-label="Giải thích" className="dr-view__section dr-explain">
    <h3>Giải thích</h3>
    <p>{text}</p>
  </section>
}
