import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AdminLoading } from '../../components/AdminState'
import type { AdminResource } from '../../lib/useAdminResource'

/** One kind of thing that needs doing: how many, what, and the screen that fixes it. */
export interface AttentionRow {
  key: string
  count: number
  label: string
  to: string
  /** Active knowledge points, to draw how much of them the count is; omitted for counts of other things. */
  total?: number | null
}

/** A source of rows: its name for the error line, its resource for the loading and retry, and the rows it gave. */
export interface AttentionSource {
  name: string
  resource: Pick<AdminResource<unknown>, 'status' | 'error' | 'reload'>
  rows: readonly AttentionRow[]
}

/**
 * Everything that needs doing, in one list: the rows of every source that loaded, with a count and a link each. A kind
 * with nothing to do is left out. A source that failed says so on its own line, so the rest still shows.
 */
export function AttentionBlock({ sources }: { sources: readonly AttentionSource[] }) {
  const rows = sources.flatMap((source) => source.rows).filter((row) => row.count > 0)
  const failed = sources.filter((source) => source.resource.status === 'error')
  const loading = sources.some((source) => source.resource.status === 'loading')

  return (
    <section aria-label="Cần xử lý ngay" className="adm-card ov-block" id="attention">
      <header className="ov-block__head"><h2>Cần xử lý ngay</h2></header>
      {rows.length > 0 ? (
        <ul className="ov-attention">
          {rows.map((row) => (
            <li className="ov-check ov-check--warn" key={row.key}>
              <AlertTriangle aria-label="Cần xử lý" size={16} />
              <Link to={row.to}>
                <strong>{row.count}</strong>
                <span>{row.label}</span>
                <span aria-hidden="true" className="ov-attention__go">Xem ›</span>
              </Link>
              {row.total && row.count > 0 ? (
                <span aria-hidden="true" className="ov-check__track">
                  <span className="ov-check__fill" style={{ width: `${Math.min(100, (row.count / row.total) * 100)}%` }} />
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {loading && rows.length === 0 ? <AdminLoading label="Đang tải…" /> : null}
      {!loading && rows.length === 0 && failed.length === 0 ? (
        <p className="ov-ok"><CheckCircle2 aria-hidden="true" size={16} />Mọi thứ ổn: không có KP lỗi và không có bản nháp chờ xuất bản.</p>
      ) : null}
      {failed.map((source) => (
        <p className="ov-source-error" key={source.name} role="alert">
          Không tải được {source.name}: {source.resource.error ?? 'lỗi không rõ'}.{' '}
          <button className="adm-btn adm-btn--small" onClick={source.resource.reload} type="button">Thử lại</button>
        </p>
      ))}
    </section>
  )
}
