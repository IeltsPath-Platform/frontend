import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, Clock3, FileText, Hourglass, TriangleAlert, X } from 'lucide-react'
import { SiteNavbar } from '@/components/SiteNavbar'
import { ApiErrorState, EmptyState, LoadingState } from '@/features/learning-path/components/PageState'
import { useApiResource } from '@/features/learning-path/lib/useApiResource'
import { toApiError } from '@/features/learning-path/api/apiError'
import { listExaminerReviews, REVIEWS_PAGE_SIZE } from './examinerReviewsApi'
import type { ExaminerReviewItem } from './examinerReviewsApi'
import { getMyGradingJobs } from './gradingJobApi'
import {
  averageBand, countReviews, dateText, joinReviews, sourceText, taskText, viewReviews,
  type ReviewFilter, type ReviewRow,
} from './examinerReviewsView'
import '../reading/reading-workspace.css'
import './writing-result.css'
import './writing-examiner.css'

const CATALOG_PATH = '/practice-tests?skill=writing'
const FILTERS: ReadonlyArray<{ key: ReviewFilter; label: string }> = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'DONE', label: 'Đã chấm' },
  { key: 'WAITING', label: 'Đang chờ chấm' },
]

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: 'ok' | 'wait' | 'band' }) {
  return (
    <li className={`we-stat${tone ? ` we-stat--${tone}` : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </li>
  )
}

/** Where the essay stands, as a badge: the colour and the words say the same thing. */
function Status({ row }: { row: ReviewRow }) {
  if (row.done) return <span className="we-badge we-badge--done"><CheckCircle2 aria-hidden="true" size={14} />Đã chấm</span>
  if (row.job?.state === 'OVERDUE') return <span className="we-badge we-badge--late"><TriangleAlert aria-hidden="true" size={14} />Quá hạn 48 giờ</span>
  return <span className="we-badge we-badge--wait"><Hourglass aria-hidden="true" size={14} />Đang chờ chấm</span>
}

function Row({ row }: { row: ReviewRow }) {
  const to = `/practice/writing/submissions/${row.submissionId}/result`
  return (
    <tr className={row.done ? 'is-done' : undefined}>
      <td className="we-cell-essay" data-label="Đề bài">
        <span className="we-chip">{taskText(row.task)}</span>
        <span className="we-source">{sourceText(row.source)}</span>
        <p className="we-prompt">{row.promptPreview || 'Bài viết của bạn'}</p>
      </td>
      <td data-label="Ngày">
        <span>Gửi {dateText(row.requestedAt)}</span>
        {row.done && row.completedAt ? <small>Chấm {dateText(row.completedAt)}</small> : null}
      </td>
      <td data-label="Số từ">{row.wordCount}</td>
      <td data-label="Trạng thái"><Status row={row} /></td>
      <td className="we-cell-band" data-label="Band">
        {row.done && row.band !== null
          ? <strong className="we-band-pill" aria-label={`Band ${row.band.toFixed(1)}`}>{row.band.toFixed(1)}</strong>
          : <span aria-label="Chưa có band">—</span>}
      </td>
      <td className="we-cell-action">
        <Link className={row.done ? 'we-open we-open--done' : 'we-open'} to={to}>
          {row.done ? 'Xem nhận xét' : 'Xem bài'}
        </Link>
      </td>
    </tr>
  )
}

/**
 * The essays the learner sent to a teacher, where the notice "your essay was graded" leads. A row of figures gives the whole
 * picture at once; the table below lines the essays up by the same columns (what, when, how long, where it stands, the band),
 * graded ones first. Each opens to the comments and the errors marked in the essay. The list comes from Learning and the state
 * from Assessment's jobs, joined here, so a page costs two calls whatever its size.
 */
export function ExaminerReviewsPage() {
  const navigate = useNavigate()
  const first = useApiResource('examiner-reviews:first', () => listExaminerReviews(0))
  const jobs = useApiResource('examiner-reviews:jobs', () => getMyGradingJobs())
  const [more, setMore] = useState<{ items: ExaminerReviewItem[]; hasNext: boolean; page: number } | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreError, setMoreError] = useState('')
  const [filter, setFilter] = useState<ReviewFilter>('ALL')

  const items = first.data ? [...first.data.items, ...(more?.items ?? [])] : []
  const hasNext = more ? more.hasNext : first.data?.hasNext ?? false
  const nextPage = more ? more.page + 1 : 1
  const rows = joinReviews(items, jobs.data ?? [])
  const counts = countReviews(rows)
  const average = averageBand(rows)
  const shown = viewReviews(rows, filter)

  async function loadMore() {
    setLoadingMore(true)
    setMoreError('')
    try {
      const page = await listExaminerReviews(nextPage)
      setMore({ items: [...(more?.items ?? []), ...page.items], hasNext: page.hasNext, page: page.page })
    } catch (cause) {
      setMoreError(toApiError(cause).message)
    } finally {
      setLoadingMore(false)
    }
  }

  const reload = () => { setMore(null); first.reload(); jobs.reload() }

  return (
    <div className="wr-page we-page">
      <SiteNavbar />
      <header className="wr-top"><Link className="rw-exit" to={CATALOG_PATH} aria-label="Về danh mục Writing"><X size={16} aria-hidden="true" /></Link></header>
      <main className="wr-main we-main">
        <div className="we-head">
          <h1>Bài giáo viên đã chấm</h1>
          <p>Những bài bạn gửi cho giáo viên. Mở một bài để đọc nhận xét theo từng tiêu chí, các lỗi giáo viên đánh dấu và cách sửa.</p>
        </div>
        {first.status === 'loading' && <LoadingState label="Đang tải danh sách bài…" />}
        {first.status === 'error' && first.error && <ApiErrorState error={first.error} onRetry={reload} />}
        {first.status === 'success' && (
          rows.length === 0 ? (
            <EmptyState title="Bạn chưa gửi bài nào cho giáo viên" description="Khi bạn chọn giáo viên chấm một bài Writing, bài đó sẽ hiện ở đây." actionLabel="Đến danh mục Writing" onAction={() => navigate(CATALOG_PATH)} />
          ) : (
            <section className="we-reviews" aria-label="Bài đã gửi giáo viên">
              <ul className="we-stats" aria-label="Tổng hợp">
                <Stat label="Bài đã gửi" value={counts.ALL} />
                <Stat label="Đã chấm" tone="ok" value={counts.DONE} />
                <Stat label="Đang chờ chấm" tone="wait" value={counts.WAITING} />
                <Stat label="Band trung bình" tone="band" value={average === null ? '—' : average.toFixed(1)} />
              </ul>

              <div className="we-toolbar">
                <div className="we-filters" role="group" aria-label="Lọc bài">
                  {FILTERS.map((item) => (
                    <button aria-pressed={filter === item.key} className="we-filter" key={item.key} onClick={() => setFilter(item.key)} type="button">
                      {item.label} <span>{counts[item.key]}</span>
                    </button>
                  ))}
                </div>
                <p className="we-note"><Clock3 aria-hidden="true" size={14} /> Bài đã chấm xếp trước, mới chấm nhất ở trên cùng</p>
              </div>
              {jobs.status === 'error' ? <p className="we-note" role="status">Chưa lấy được trạng thái chấm bài; các bài đang hiện là đang chờ.</p> : null}

              {shown.length === 0
                ? <p className="we-empty"><FileText aria-hidden="true" size={18} /> Không có bài nào trong mục này.</p>
                : (
                  <div className="we-table-wrap">
                    <table className="we-table">
                      <caption className="we-sr">Bài đã gửi giáo viên</caption>
                      <thead>
                        <tr>
                          <th scope="col">Đề bài</th>
                          <th scope="col">Ngày</th>
                          <th scope="col">Số từ</th>
                          <th scope="col">Trạng thái</th>
                          <th scope="col">Band</th>
                          <th scope="col"><span className="we-sr">Thao tác</span></th>
                        </tr>
                      </thead>
                      <tbody>{shown.map((row) => <Row key={row.submissionId} row={row} />)}</tbody>
                    </table>
                  </div>
                )}

              {hasNext ? (
                <div className="we-more">
                  <button className="we-more__btn" disabled={loadingMore} onClick={() => { void loadMore() }} type="button">
                    {loadingMore ? 'Đang tải…' : `Xem thêm ${REVIEWS_PAGE_SIZE} bài cũ hơn`}
                  </button>
                  {moreError ? <span role="alert">{moreError}</span> : null}
                </div>
              ) : null}
            </section>
          )
        )}
      </main>
    </div>
  )
}
