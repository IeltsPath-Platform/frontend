import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Ban, CheckCircle2, ChevronRight, Hourglass, TriangleAlert } from 'lucide-react'
import { SiteNavbar } from '@/components/SiteNavbar'
import { LearnTrail } from '@/features/learning-path/components/LearnTrail'
import { ApiErrorState, EmptyState, LoadingState } from '@/features/learning-path/components/PageState'
import { useApiResource } from '@/features/learning-path/lib/useApiResource'
import { toApiError } from '@/features/learning-path/api/apiError'
import { listExaminerReviews, REVIEWS_PAGE_SIZE } from './examinerReviewsApi'
import type { ExaminerReviewItem } from './examinerReviewsApi'
import { getMyGradingJobs } from './gradingJobApi'
import {
  countReviews, dateText, joinReviews, sourceText, taskText, viewReviews,
  type ReviewFilter, type ReviewRow,
} from './examinerReviewsView'
import '@/features/learning-path/learning-path.css'
import '../reading/reading-workspace.css'
import './writing-result.css'
import './writing-examiner.css'

const CATALOG_PATH = '/practice-tests?skill=writing'
/** This list is the page behind "Lịch sử nộp bài", whichever of its two addresses was opened. */
const HISTORY_PATH = '/submission-history'
const FILTERS: ReadonlyArray<{ key: ReviewFilter; label: string }> = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'DONE', label: 'Đã chấm' },
  { key: 'WAITING', label: 'Đang chờ chấm' },
]

type Kind = 'done' | 'wait' | 'late' | 'cancelled'

const kindOf = (row: ReviewRow): Kind => {
  if (row.done) return 'done'
  if (row.cancelled) return 'cancelled'
  return row.job?.state === 'OVERDUE' ? 'late' : 'wait'
}

/** The square at the start of a row: the band when graded, otherwise the icon of where the essay stands. */
function Mark({ row, kind }: { row: ReviewRow; kind: Kind }) {
  if (kind === 'done' && row.band !== null) {
    return (
      <span className="wl-mark" aria-label={`Band ${row.band.toFixed(1)}`}>
        <small aria-hidden="true">Band</small>
        <strong aria-hidden="true">{row.band.toFixed(1)}</strong>
      </span>
    )
  }
  const Icon = kind === 'done' ? CheckCircle2 : kind === 'cancelled' ? Ban : kind === 'late' ? TriangleAlert : Hourglass
  return <span aria-hidden="true" className="wl-mark"><Icon size={22} strokeWidth={1.75} /></span>
}

/** Where the essay stands, in words as well as colour. */
function Status({ kind }: { kind: Kind }) {
  if (kind === 'done') return <span className="wl-status">Đã chấm</span>
  if (kind === 'cancelled') return <span className="wl-status">Đã hủy yêu cầu</span>
  if (kind === 'late') return <span className="wl-status">Quá hạn 48 giờ</span>
  return <span className="wl-status">Đang chờ chấm</span>
}

function Row({ row }: { row: ReviewRow }) {
  const kind = kindOf(row)
  const to = `/practice/writing/submissions/${row.submissionId}/result`
  const graded = row.done && row.completedAt ? dateText(row.completedAt) : ''
  return (
    <li className={`wl-row wl-row--${kind}`}>
      <Mark kind={kind} row={row} />
      <div className="wl-body">
        <p className="wl-meta">{taskText(row.task)} · {sourceText(row.source)}</p>
        <p className="wl-prompt">{row.promptPreview || 'Bài viết của bạn'}</p>
        <p className="wl-facts">
          <span>Gửi {dateText(row.requestedAt)}</span>
          <span>{row.wordCount} từ</span>
          {graded ? <span>Chấm {graded}</span> : null}
        </p>
      </div>
      <div className="wl-side">
        <Status kind={kind} />
        <Link className="wl-open" to={to}>{row.done ? 'Xem nhận xét' : 'Xem bài'}<ChevronRight aria-hidden="true" size={16} /></Link>
      </div>
    </li>
  )
}

/**
 * The essays the learner sent to a teacher, where the notice "your essay was graded" leads. Each essay is a line that starts
 * with its band (or the icon of where it stands) and opens as a whole to the comments and the errors marked in the essay;
 * graded ones come first. The list comes from Learning and the state from Assessment's jobs, joined here, so a page costs
 * two calls whatever its size.
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
    <div className="wr-page wl-page lp-root">
      <SiteNavbar activePath={HISTORY_PATH} />
      <main className="wr-main wl-main">
        <LearnTrail items={[{ label: 'Trang chủ', to: '/', home: true }, { label: 'Lịch sử nộp bài' }]} showBack={false} />
        <h1 className="wl-title">Bài giáo viên đã chấm</h1>
        {first.status === 'loading' && <LoadingState label="Đang tải danh sách bài…" />}
        {first.status === 'error' && first.error && <ApiErrorState error={first.error} onRetry={reload} />}
        {first.status === 'success' && (
          rows.length === 0 ? (
            <EmptyState title="Bạn chưa gửi bài nào cho giáo viên" description="Khi bạn chọn giáo viên chấm một bài Writing, bài đó sẽ hiện ở đây." actionLabel="Đến danh mục Writing" onAction={() => navigate(CATALOG_PATH)} />
          ) : (
            <section className="wl-list" aria-label="Bài đã gửi giáo viên">
              <div className="wl-tabs" role="group" aria-label="Lọc bài">
                {FILTERS.map((item) => (
                  <button aria-pressed={filter === item.key} className="wl-tab" key={item.key} onClick={() => setFilter(item.key)} type="button">
                    {item.label} <span>{counts[item.key]}</span>
                  </button>
                ))}
              </div>
              {jobs.status === 'error' ? <p className="wl-note" role="status">Chưa lấy được trạng thái chấm bài; các bài đang hiện là đang chờ.</p> : null}

              {shown.length === 0
                ? <p className="wl-empty">Không có bài nào trong mục này.</p>
                : <ol className="wl-rows">{shown.map((row) => <Row key={row.submissionId} row={row} />)}</ol>}

              {hasNext ? (
                <div className="wl-more">
                  <button className="wl-more__btn" disabled={loadingMore} onClick={() => { void loadMore() }} type="button">
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
