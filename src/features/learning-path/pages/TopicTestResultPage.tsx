import type { CSSProperties } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, Check, RotateCcw, Trophy, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AttemptItemResult, AttemptResult } from '~types/learningPath'
import { learningApi } from '../api'
import { ApiErrorState, LoadingState } from '../components/PageState'
import { useApiResource } from '../lib/useApiResource'

export function TopicTestResultPage() {
  const { attemptId = '' } = useParams()
  const resource = useApiResource(`result:${attemptId}`, () => learningApi.getAttemptResult(attemptId))

  if (resource.status === 'loading') return <LoadingState label="Đang chấm bài…" />
  if (resource.status === 'error' && resource.error) return <ApiErrorState error={resource.error} onRetry={resource.reload} />
  if (!resource.data) return null
  return <ResultView result={resource.data} />
}

function ResultView({ result }: { result: AttemptResult }) {
  const topicPath = `/learn/topics/${result.topicId}`
  return (
    <article className="lp-page lp-result-page" aria-labelledby="lp-result-title">
      <header className={`lp-score${result.passed ? ' is-passed' : ''}`}>
        <div className="lp-score__dial" aria-hidden="true" style={{ '--pct': result.percent } as CSSProperties}>
          <span>{result.percent}%</span>
        </div>
        <div className="lp-score__body">
          <p className="lp-eyebrow">Kết quả · mã đề {result.packageCode}</p>
          <h1 id="lp-result-title">{result.passed ? 'Đạt bài kiểm tra cuối' : 'Chưa đạt lần này'}</h1>
          <p className="lp-score__line"><strong>{result.score}/{result.maxScore}</strong> câu đúng · {result.percent}% · cần từ 70%</p>
          <p>
            {result.passed
              ? result.nextTopicId ? 'Topic đã qua. Chặng tiếp theo đã mở.' : 'Topic đã qua. Bạn đã hoàn thành toàn bộ lộ trình hiện có.'
              : 'Đáp án được ẩn khi chưa đạt. Ôn lại các bài trong topic rồi làm lại; lần sau bạn sẽ nhận mã đề khác.'}
          </p>
          <div className="lp-score__actions">
            {result.passed && result.nextTopicId ? (
              <Button asChild className="lp-btn lp-btn--accent"><Link to={`/learn/topics/${result.nextTopicId}`}><Trophy aria-hidden="true" />Sang chặng tiếp theo<ArrowRight aria-hidden="true" /></Link></Button>
            ) : null}
            {result.passed ? (
              <Button asChild className="lp-btn" variant="outline"><Link to="/learn">Xem lộ trình</Link></Button>
            ) : (
              <Button asChild className="lp-btn"><Link to={topicPath}><RotateCcw aria-hidden="true" />Về topic để làm lại</Link></Button>
            )}
          </div>
        </div>
      </header>

      <section aria-labelledby="lp-result-items">
        <h2 className="lp-section-title" id="lp-result-items">Từng câu</h2>
        <ol className="lp-result-items">
          {[...result.items].sort((a, b) => a.number - b.number).map((item) => <ResultItem item={item} key={item.itemId} />)}
        </ol>
      </section>
    </article>
  )
}

function ResultItem({ item }: { item: AttemptItemResult }) {
  return (
    <li className={`lp-question lp-question--${item.correct ? 'correct' : 'wrong'}`}>
      <p className="lp-question__prompt">
        <span className="lp-question__num" aria-label={`Câu ${item.number}`}>{item.number}</span>
        <span>{item.prompt}</span>
      </p>
      <p className="lp-question__mark">
        {item.correct ? <Check aria-hidden="true" size={16} /> : <X aria-hidden="true" size={16} />}
        {item.correct ? 'Đúng' : 'Sai'} · Bạn chọn: {item.yourAnswer ?? 'bỏ trống'}
      </p>
      {item.correctAnswer ? (
        <div className="lp-solution">
          <p><strong>Đáp án:</strong> {item.correctAnswer}</p>
          {item.explanation ? <p>{item.explanation}</p> : null}
        </div>
      ) : null}
    </li>
  )
}
