import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { AdminError, AdminLoading } from '@/features/admin/components/AdminState'
import type { AdminResource } from '@/features/admin/lib/useAdminResource'
import '@/features/admin/overview/overview.css'

/** One block of the page, the way the admin overview draws it: its own loading and error state, so a failing source never blanks the rest. */
export function Block<T>({ title, to, toLabel, resource, children }: {
  title: string
  to?: string
  toLabel?: string
  resource: AdminResource<T>
  children: (data: T) => ReactNode
}) {
  return (
    <section aria-label={title} className="adm-card ov-block">
      <header className="ov-block__head">
        <h2>{title}</h2>
        {to ? <Link className="adm-btn adm-btn--small ex-block__link" to={to}>{toLabel ?? 'Mở'}<ArrowRight aria-hidden="true" size={14} /></Link> : null}
      </header>
      {resource.status === 'loading' ? <AdminLoading label="Đang tải…" /> : null}
      {resource.status === 'error' ? <AdminError message={resource.error ?? 'Không tải được dữ liệu.'} onRetry={resource.reload} /> : null}
      {resource.status === 'success' && resource.data !== null ? children(resource.data) : null}
    </section>
  )
}

/** A titled column inside a block, with an optional line of text under it. */
export function Panel({ title, note, children }: { title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <div className="ov-panel">
      <h3>{title}</h3>
      {children}
      {note ? <p className="ov-note">{note}</p> : null}
    </div>
  )
}
