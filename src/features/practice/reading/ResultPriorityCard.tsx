import { Link } from 'react-router-dom'
import { practiceFormatLabel } from '../lib/practiceFormatLabels'
import { WEAK_BELOW_PERCENT, priorityFormats, skippedFormats } from '../lib/practiceAnalysis'
import type { RatedFormat } from '../lib/practiceAnalysis'

const labelOf = (format: RatedFormat) => practiceFormatLabel(format.formatCode)

/** One priority level: its label and the names of the formats on it, coloured by their rating. */
function PriorityLevel({ level, formats }: { level: 1 | 2; formats: RatedFormat[] }) {
  return (
    <div className={`rr-priority-level rr-tone-${formats[0]!.rating}`}>
      <p className="rr-priority-eyebrow">Ưu tiên số {level}</p>
      <ul className="rr-priority-chips">
        {formats.map((format) => <li key={format.formatCode}>{labelOf(format)}</li>)}
      </ul>
    </div>
  )
}

/**
 * The card above the analysis: what to practise first. The cases, in the order they are checked:
 * 1. Some answered format is under the weak line. It names only the formats: those at the lowest share of correct answers
 *    are priority 1 (any number of them, none is "the" worst), those at the next lowest share are priority 2.
 * 2. Nothing is under the weak line, but nothing was answered at all: ask the learner to answer first.
 * 3. Nothing is under the weak line, but some formats were never answered: ask the learner to do them.
 * 4. Everything answered is fine.
 */
export function ResultPriorityCard({ rated, answeredQuestions, totalQuestions, practiceHref, catalogTo }: {
  rated: RatedFormat[]
  answeredQuestions: number
  totalQuestions: number
  practiceHref: (formatCode: string) => string
  catalogTo: string
}) {
  const first = priorityFormats(rated, 1)
  const second = priorityFormats(rated, 2)
  const skipped = skippedFormats(rated)

  if (first.length > 0) {
    return (
      <div className={`rr-priority-card rr-priority-names rr-tone-${first[0]!.rating}`}>
        <PriorityLevel level={1} formats={first} />
        {second.length > 0 && <PriorityLevel level={2} formats={second} />}
      </div>
    )
  }

  if (answeredQuestions === 0) {
    return (
      <div className="rr-priority-card rr-tone-weak">
        <div>
          <p className="rr-priority-eyebrow">Cần làm trước</p>
          <h3>Bạn chưa trả lời câu nào</h3>
          <p>Cả {totalQuestions} câu đều bỏ trống nên chưa đánh giá được dạng câu hỏi nào. Hãy trả lời đủ các câu: bỏ trống không được điểm, còn đoán thì vẫn có cơ hội đúng.</p>
        </div>
      </div>
    )
  }

  if (skipped.length > 0) {
    const skippedQuestions = skipped.reduce((sum, format) => sum + format.total, 0)
    return (
      <div className="rr-priority-card rr-tone-weak">
        <div>
          <p className="rr-priority-eyebrow">Cần làm trước</p>
          <h3>Bạn chưa làm {skippedQuestions}/{totalQuestions} câu</h3>
          <p>
            Chưa có câu nào ở: <strong>{skipped.map(labelOf).join(', ')}</strong>. Các dạng bạn đã làm không có dạng nào dưới {WEAK_BELOW_PERCENT}%,
            nên hãy làm hết các câu trước: bỏ trống không được điểm, còn đoán thì vẫn có cơ hội đúng.
          </p>
        </div>
        <Link className="rr-cta" to={practiceHref(skipped[0]!.formatCode)}>Luyện {labelOf(skipped[0]!)}</Link>
      </div>
    )
  }

  return (
    <div className="rr-priority-card rr-tone-excellent">
      <div>
        <p className="rr-priority-eyebrow">Làm tốt lắm</p>
        <h3>Không có dạng nào dưới {WEAK_BELOW_PERCENT}%</h3>
        <p>Bạn làm đều tay ở mọi dạng câu hỏi. Hãy thử một đề khó hơn để tiếp tục nâng điểm.</p>
      </div>
      <Link className="rr-cta" to={catalogTo}>Chọn đề khác</Link>
    </div>
  )
}
