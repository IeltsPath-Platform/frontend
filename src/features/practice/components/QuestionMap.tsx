import type { ReactNode } from 'react'
import { Bookmark, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface QuestionMapProps {
  questionNumbers: readonly number[]
  answers: Record<number, string>
  flagged: Record<number, boolean>
  currentQuestion: number
  onSelectQuestion: (questionNumber: number) => void
  navigation?: ReactNode
}

export function QuestionMap({
  questionNumbers,
  answers,
  flagged,
  currentQuestion,
  onSelectQuestion,
  navigation,
}: QuestionMapProps) {
  return (
    <aside className="question-map-sidebar" aria-labelledby="question-map-heading">
      <div className="question-map-heading-row">
        <div>
          <p className="workspace-eyebrow">QUESTION MAP</p>
          <h2 id="question-map-heading">Bản đồ câu hỏi</h2>
        </div>
        <span className="question-map-count">{questionNumbers.length} câu</span>
      </div>
      <p className="question-map-intro">Chọn một số để chuyển thẳng đến câu tương ứng.</p>
      <div className="question-map-grid" aria-label="Danh sách câu hỏi">
        {questionNumbers.map((questionNumber) => {
          const isAnswered = Boolean(answers[questionNumber])
          const isFlagged = Boolean(flagged[questionNumber])
          const isCurrent = currentQuestion === questionNumber
          const status = [
            isAnswered ? 'đã trả lời' : 'chưa trả lời',
            isFlagged ? 'đã đánh dấu xem lại' : '',
            isCurrent ? 'đang xem' : '',
          ].filter(Boolean).join(', ')

          return (
            <Button
              key={questionNumber}
              type="button"
              variant="outline"
              className={`question-map-button${isAnswered ? ' is-answered' : ''}${isFlagged ? ' is-flagged' : ''}${isCurrent ? ' is-current' : ''}`}
              aria-current={isCurrent ? 'step' : undefined}
              aria-label={`Câu ${questionNumber}, ${status}`}
              onClick={() => onSelectQuestion(questionNumber)}
            >
              <span>{questionNumber}</span>
              {isAnswered && <Check className="question-map-answer-icon" aria-hidden="true" size={14} />}
              {isFlagged && <Bookmark className="question-map-flag-icon" aria-hidden="true" size={13} />}
            </Button>
          )
        })}
      </div>
      {navigation && <div className="question-map-navigation">{navigation}</div>}
    </aside>
  )
}
