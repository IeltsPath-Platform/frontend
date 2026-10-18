import { Link } from 'react-router-dom'
import { RotateCcw } from 'lucide-react'
import { ClassMascot } from '@/components/ClassMascot'
import type { ReadingResultView } from '../lib/readingResultView'
import { practiceFormatLabel } from '../lib/practiceFormatLabels'
import {
  RATING_LABELS,
  WEAK_BELOW_PERCENT,
  adviseTime,
  formatClockTime,
  formatMinutes,
  formatTip,
  mascotMessage,
  weakFormats,
} from '../lib/practiceAnalysis'
import type { RatedFormat } from '../lib/practiceAnalysis'

const clampPercent = (value: number) => Math.min(100, Math.max(0, value))

function Bar({ percent, tone }: { percent: number; tone?: string }) {
  return <span className={`rr-bar${tone ? ` rr-bar-${tone}` : ''}`} aria-hidden="true"><i style={{ width: `${clampPercent(percent)}%` }} /></span>
}

/** Area A: the mascot's sentence and the band (full test) or the accuracy (one passage). */
export function ResultHero({ view }: { view: ReadingResultView }) {
  const percent = Math.round(view.percent)
  return (
    <div className="rr-hero">
      <div className="rr-mascot-card">
        <ClassMascot size="md" />
        <p>{mascotMessage(view.percent)}</p>
      </div>
      <div className="rr-band-card" aria-label={view.band !== null ? 'Band Score ước tính' : 'Tỉ lệ đúng'}>
        {view.band !== null ? (
          <>
            <p>Band Score (ước tính)</p>
            <strong>{view.band.toFixed(1)}</strong>
            <small>Quy đổi từ số câu đúng theo thang 40 câu</small>
          </>
        ) : (
          <>
            <p>Tỉ lệ câu đúng</p>
            <strong>{percent}%</strong>
            <small>Band chỉ được ước tính khi làm trọn đề</small>
          </>
        )}
      </div>
    </div>
  )
}

/** Area B: the ring, the counts, the time and what to do next. */
export function ResultSummary({ view, reviewTo, onRetry, retrying, catalogTo }: {
  view: ReadingResultView
  reviewTo: string
  onRetry: () => void
  retrying: boolean
  catalogTo: string
}) {
  const total = view.counts.correct + view.counts.incorrect + view.counts.blank
  const share = total ? view.counts.correct / total : 0
  const radius = 52
  const circumference = 2 * Math.PI * radius
  return (
    <section className="rr-summary" aria-labelledby="rr-summary-title">
      <header>
        <h2 id="rr-summary-title">Kết quả làm bài</h2>
        <p>Thời gian làm bài <strong>{formatClockTime(view.durationSeconds)}</strong></p>
      </header>
      <div className="rr-summary-body">
        <figure className="rr-ring" role="img" aria-label={`${view.counts.correct} trên ${total} câu đúng`}>
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r={radius} className="rr-ring-track" />
            <circle cx="60" cy="60" r={radius} className="rr-ring-value" strokeDasharray={`${circumference * share} ${circumference}`} transform="rotate(-90 60 60)" />
          </svg>
          <figcaption><strong>{view.counts.correct}/{total}</strong><span>câu đúng</span></figcaption>
        </figure>
        <ul className="rr-counts">
          <li><i className="rr-dot rr-dot-correct" aria-hidden="true" />Đúng: <strong>{view.counts.correct} câu</strong></li>
          <li><i className="rr-dot rr-dot-wrong" aria-hidden="true" />Sai: <strong>{view.counts.incorrect} câu</strong></li>
          <li><i className="rr-dot rr-dot-blank" aria-hidden="true" />Bỏ qua: <strong>{view.counts.blank} câu</strong></li>
        </ul>
        <div className="rr-summary-actions">
          <Link className="rr-primary" to={reviewTo}>Xem giải thích</Link>
          <button type="button" disabled={retrying} onClick={onRetry}><RotateCcw size={15} aria-hidden="true" /> {retrying ? 'Đang tạo…' : 'Làm lại bài'}</button>
          <Link className="rr-secondary" to={catalogTo}>Về danh mục</Link>
        </div>
      </div>
    </section>
  )
}

/** Area C: every question format of this test (the whole test or the one passage) with its rating. */
export function ResultDetailTable({ rated, scopeLabel }: { rated: RatedFormat[]; scopeLabel: string }) {
  return (
    <section className="rr-card" aria-labelledby="rr-table-title">
      <h2 id="rr-table-title">Bảng dữ liệu chi tiết <small>{scopeLabel}</small></h2>
      <div className="rr-table-wrap">
        <table>
          <caption className="sr-only">Kết quả theo từng dạng câu hỏi</caption>
          <thead>
            <tr>
              <th scope="col">Loại câu hỏi</th><th scope="col">Số câu hỏi</th><th scope="col">Đúng</th><th scope="col">Sai</th>
              <th scope="col">Bỏ qua</th><th scope="col">Tỉ lệ đúng</th><th scope="col">Đánh giá</th><th scope="col">Gợi ý</th>
            </tr>
          </thead>
          <tbody>
            {rated.map((row) => (
              <tr key={row.formatCode} className={row.priority ? 'rr-row-priority' : undefined}>
                <th scope="row">
                  {practiceFormatLabel(row.formatCode)}
                  {row.priority && <span className="rr-priority">Ưu tiên {row.priority}</span>}
                </th>
                <td>{row.total}</td>
                <td><span className="rr-pill rr-pill-correct">{row.correct}</span></td>
                <td><span className="rr-pill rr-pill-wrong">{row.incorrect}</span></td>
                <td><span className="rr-pill">{row.blank}</span></td>
                <td className="rr-percent"><Bar percent={row.percent} /> <span>{row.percent}%</span></td>
                <td><span className={`rr-rating rr-rating-${row.rating}`}>{RATING_LABELS[row.rating]}</span></td>
                <td>
                  {row.percent < WEAK_BELOW_PERCENT
                    ? <Link className="rr-link" to={`/practice-tests?skill=reading&format=${row.formatCode}`}>Luyện dạng này ›</Link>
                    : <span className="rr-keep">✓ Giữ phong độ</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/** Area D: what to practise first, why points were lost, and where the time went. */
export function ResultAnalysis({ view, rated, practiceHref, partLabel = 'Passage', catalogTo = '/practice-tests?skill=reading' }: {
  view: ReadingResultView
  rated: RatedFormat[]
  practiceHref: (formatCode: string) => string
  /** Name of one part of the test (Passage, Section) and where "choose another test" leads. */
  partLabel?: string
  catalogTo?: string
}) {
  const totalQuestions = view.sections.reduce((sum, section) => sum + section.total, 0)
  const weak = weakFormats(rated)
  const priority = rated.find((format) => format.priority === 1)
  const fine = rated.filter((format) => format.percent >= WEAK_BELOW_PERCENT)

  const sections = view.sections.map((section, index) => ({
    ...section,
    label: `${partLabel} ${section.partNo ?? index + 1}`,
    limit: section.timeLimitSeconds,
  }))
  // The limits are the ones stored with the test; when a section has none, nothing is invented for it.
  const allLimited = sections.every((section) => section.limit !== null)
  const limit = view.timeLimitSeconds ?? (allLimited ? sections.reduce((sum, section) => sum + (section.limit ?? 0), 0) : null)
  const advice = adviseTime(view.durationSeconds, limit, totalQuestions)
  const limitMinutes = sections.map((section) => (section.limit === null ? null : Math.round(section.limit / 60)))

  return (
    <section className="rr-analysis" aria-labelledby="rr-analysis-title">
      <h2 id="rr-analysis-title">Phân tích &amp; gợi ý cho bạn</h2>
      <p className="rr-muted">Dựa trên {totalQuestions} câu bạn vừa làm, hệ thống chỉ ra điểm yếu và việc nên làm tiếp theo.</p>

      {priority ? (
        <div className="rr-priority-card">
          <div>
            <h3>Ưu tiên số 1: {practiceFormatLabel(priority.formatCode)}</h3>
            <p>
              Đúng {priority.correct}/{priority.total} câu, chiếm {totalQuestions ? Math.round(priority.total / totalQuestions * 100) : 0}% tổng số câu của bài.
              Đây là dạng đang kéo điểm của bạn xuống nhiều nhất: cải thiện dạng này sẽ giúp tăng điểm nhanh nhất.
            </p>
          </div>
          <Link className="rr-cta" to={practiceHref(priority.formatCode)}>Luyện {practiceFormatLabel(priority.formatCode)}</Link>
        </div>
      ) : (
        <div className="rr-priority-card rr-priority-ok">
          <div><h3>Không có dạng nào dưới {WEAK_BELOW_PERCENT}%</h3><p>Bạn làm đều tay ở mọi dạng câu hỏi. Hãy thử một đề khó hơn để tiếp tục nâng điểm.</p></div>
          <Link className="rr-cta" to={catalogTo}>Chọn đề khác</Link>
        </div>
      )}

      <div className="rr-analysis-grid">
        <div className="rr-card">
          <h3>Vì sao bạn mất điểm?</h3>
          {weak.length ? (
            <>
              <p className="rr-muted">Các dạng đúng dưới {WEAK_BELOW_PERCENT}%: nên học lại phương pháp làm bài.</p>
              <ul className="rr-weak-list">
                {weak.map((format) => (
                  <li key={format.formatCode}>
                    <div className="rr-weak-head">
                      <strong>{practiceFormatLabel(format.formatCode)}</strong>
                      <Bar percent={format.percent} tone={format.rating} />
                      <span>{format.percent}% · {format.correct}/{format.total}</span>
                      <Link className="rr-link" to={practiceHref(format.formatCode)}>Luyện dạng này ›</Link>
                    </div>
                    <p>{formatTip(format.formatCode)}</p>
                  </li>
                ))}
              </ul>
            </>
          ) : <p className="rr-muted">Không có dạng nào dưới {WEAK_BELOW_PERCENT}%, bạn chưa mất điểm nặng ở dạng nào.</p>}
          {fine.length > 0 && weak.length > 0 && (
            <p className="rr-fine">✓ Các dạng còn lại đang ổn (từ {WEAK_BELOW_PERCENT}% trở lên): {fine.map((format) => practiceFormatLabel(format.formatCode)).join(', ')}</p>
          )}
        </div>

        <div className="rr-card">
          <h3>Quản lý thời gian</h3>
          <p className="rr-time-total">{formatClockTime(view.durationSeconds)} {limit !== null && <small>/ {formatClockTime(limit)}</small>}</p>
          <p className="rr-muted">{advice.message}</p>
          <ul className="rr-time-list">
            {sections.map((section) => {
              const spent = section.timeSpentSeconds
              return (
                <li key={section.sectionId}>
                  <span>{section.label} · {section.total} câu · {section.correct}/{section.total} đúng</span>
                  <Bar percent={spent === null || !section.limit ? 0 : spent / section.limit * 100} tone={spent !== null && section.limit !== null && spent > section.limit ? 'veryWeak' : undefined} />
                  <span className="rr-time-value">{formatMinutes(spent)}{section.limit !== null && ` / ~${formatMinutes(section.limit)}`}</span>
                </li>
              )
            })}
          </ul>
          {limit !== null && allLimited && (
            <p className="rr-time-hint">
              {sections.length > 1
                ? `Gợi ý: chia ${Math.round(limit / 60)} phút thành ${limitMinutes.join(' / ')} phút cho ${sections.length} ${partLabel.toLowerCase()}.`
                : `Gợi ý: dành khoảng ${limitMinutes[0]} phút cho ${partLabel.toLowerCase()} này.`}
            </p>
          )}
        </div>
      </div>
      <p className="rr-footnote">Số liệu phân tích được tính từ bài bạn vừa làm; band chỉ là ước tính, không thay thế kết quả thi thật.</p>
    </section>
  )
}
