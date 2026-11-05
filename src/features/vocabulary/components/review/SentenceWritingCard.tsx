import { useState } from 'react'
import { Eye, ThumbsDown, ThumbsUp, Sparkles } from 'lucide-react'
import type { QuizQuestion } from '../../lib/quiz'

interface SentenceWritingCardProps {
  question: QuizQuestion
  onAnswer: (correct: boolean) => void
}

export function SentenceWritingCard({ question, onAnswer }: SentenceWritingCardProps) {
  const [writtenText, setWrittenText] = useState('')
  const [showSample, setShowSample] = useState(false)
  const entry = question.entry

  return (
    <div className="vocab-quiz-card" role="region" aria-label="Đặt câu với từ vựng">
      <div className="review-head">
        <span className="review-kicker">Tự đặt câu với từ vựng</span>
        <h2 className="review-word" lang="en">{entry.lemma}</h2>
        <p className="review-meaning-hint">{entry.vietnameseMeaning || entry.englishDefinition}</p>
      </div>

      <div className="review-form">
        <div>
          <label htmlFor="user-sentence-input" className="review-label">Câu của bạn:</label>
          <textarea
            id="user-sentence-input"
            rows={3}
            value={writtenText}
            onChange={(e) => setWrittenText(e.target.value)}
            placeholder={`Viết ít nhất một câu hoàn chỉnh có chứa từ "${entry.lemma}"...`}
            className="review-textarea"
          />
        </div>

        {!showSample ? (
          <button type="button" className="review-submit" onClick={() => setShowSample(true)}>
            <Eye size={22} aria-hidden="true" />
            Xem câu mẫu & Tự đánh giá
          </button>
        ) : (
          <>
            <div className="review-sample">
              <strong><Sparkles size={16} aria-hidden="true" />CÂU MẪU TỪ ĐIỂN</strong>
              <p lang="en">"{entry.exampleSentence || 'Chưa có câu mẫu trong kho.'}"</p>
            </div>

            <div>
              <p className="review-self-check">Bạn tự đánh giá câu vừa viết thế nào?</p>
              <div className="review-grades">
                <button type="button" className="review-grade is-forgot" onClick={() => onAnswer(false)}>
                  <ThumbsDown size={22} aria-hidden="true" />
                  Chưa nhớ rõ
                </button>
                <button type="button" className="review-grade is-remembered" onClick={() => onAnswer(true)}>
                  <ThumbsUp size={22} aria-hidden="true" />
                  Đã nhớ & Dùng đúng
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
