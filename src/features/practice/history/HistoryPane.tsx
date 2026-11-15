import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle2, ChevronRight, Hourglass, TriangleAlert } from 'lucide-react'
import { ApiErrorState, EmptyState, PageSkeleton } from '@/features/learning-path/components/PageState'
import { toApiError } from '@/features/learning-path/api/apiError'
import { useApiResource } from '@/features/learning-path/lib/useApiResource'
import { withOrigin } from '@/features/learning-path/lib/resultOrigin'
import type { HistoryPage } from './historyLoaders'
import type { HistoryRow, HistoryTone } from './submissionHistoryView'
import '@/features/learning-path/learning-path.css'
import '../reading/reading-workspace.css'
import '../writing/writing-result.css'
import '../writing/writing-examiner.css'

const TONE_ICON = { done: CheckCircle2, wait: Hourglass, late: TriangleAlert } as const

/** The square at the start of a line: the band or score when there is one, otherwise the icon of where the line stands. */
function Mark({ mark, tone }: { mark: HistoryRow['mark']; tone: HistoryTone }) {
  if (mark) {
    return (
      <span className="wl-mark" aria-label={`${mark.label} ${mark.value}`}>
        <small aria-hidden="true">{mark.label}</small>
        <strong aria-hidden="true">{mark.value}</strong>
      </span>
    )
  }
  const Icon = TONE_ICON[tone]
  return <span aria-hidden="true" className="wl-mark"><Icon size={22} strokeWidth={1.75} /></span>
}

const ESSAY_RESULT_PREFIX = '/practice/writing/submissions/'

function Row({ row }: { row: HistoryRow }) {
  const here = useLocation()
  // An essay's result page names this list in its breadcrumb and leads back to it, tab and skill included.
  const href = row.href?.startsWith(ESSAY_RESULT_PREFIX) ? withOrigin(row.href, `${here.pathname}${here.search}`) : row.href
  return (
    <li className={`wl-row wl-row--${row.tone}`}>
      <Mark mark={row.mark} tone={row.tone} />
      <div className="wl-body">
        <p className="wl-meta">{row.meta}</p>
        <p className="wl-prompt">{row.title}</p>
        <p className="wl-facts">{row.facts.map((fact) => <span key={fact}>{fact}</span>)}</p>
      </div>
      <div className="wl-side">
        <span className="wl-status">{row.status}</span>
        {href ? <Link className="wl-open" state={row.state} to={href}>{row.openLabel}<ChevronRight aria-hidden="true" size={16} /></Link> : null}
      </div>
    </li>
  )
}

export interface HistoryEmpty {
  title: string
  description: string
  actionLabel: string
  to: string
}

/**
 * One list of the page "Lịch sử nộp bài": the first page loads at once and older lines are added by "Xem thêm". The list is
 * keyed by its source, so changing the source starts from the first page again.
 */
export function HistoryPane({ paneKey, label, load, empty }: {
  paneKey: string
  label: string
  load: (page: number) => Promise<HistoryPage>
  empty: HistoryEmpty
}) {
  const navigate = useNavigate()
  const first = useApiResource(`history:${paneKey}`, () => load(0))
  const [more, setMore] = useState<{ rows: HistoryRow[]; hasNext: boolean; page: number } | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreError, setMoreError] = useState('')

  const rows = first.data ? [...first.data.rows, ...(more?.rows ?? [])] : []
  const hasNext = more ? more.hasNext : first.data?.hasNext ?? false
  const nextPage = more ? more.page + 1 : 1

  async function loadMore() {
    setLoadingMore(true)
    setMoreError('')
    try {
      const page = await load(nextPage)
      setMore({ rows: [...(more?.rows ?? []), ...page.rows], hasNext: page.hasNext, page: nextPage })
    } catch (cause) {
      setMoreError(toApiError(cause).message)
    } finally {
      setLoadingMore(false)
    }
  }

  const reload = () => { setMore(null); first.reload() }

  if (first.status === 'loading') return <PageSkeleton label="Đang tải lịch sử…" variant="list" />
  if (first.status === 'error' && first.error) return <ApiErrorState error={first.error} onRetry={reload} />
  if (rows.length === 0) {
    return <EmptyState title={empty.title} description={empty.description} actionLabel={empty.actionLabel} onAction={() => navigate(empty.to)} />
  }
  return (
    <section className="wl-list" aria-label={label}>
      <ol className="wl-rows">{rows.map((row) => <Row key={row.key} row={row} />)}</ol>
      {hasNext ? (
        <div className="wl-more">
          <button className="wl-more__btn" disabled={loadingMore} onClick={() => { void loadMore() }} type="button">
            {loadingMore ? 'Đang tải…' : 'Xem thêm bài cũ hơn'}
          </button>
          {moreError ? <span role="alert">{moreError}</span> : null}
        </div>
      ) : null}
    </section>
  )
}
