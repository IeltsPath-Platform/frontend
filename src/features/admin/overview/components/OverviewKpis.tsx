import { Link } from 'react-router-dom'

export interface Kpi {
  key: string
  label: string
  /** The figure; null when the source did not send it (shown as a dash). */
  value: string | null
  to: string
  /** `warn` colours the figure when something is waiting; `ok` when all is well. */
  tone?: 'warn' | 'ok'
}

/** The few numbers an author checks first, each opening the screen that owns it. */
export function OverviewKpis({ items }: { items: readonly Kpi[] }) {
  return (
    <ul aria-label="Số liệu chính" className="ov-kpis">
      {items.map((item) => (
        <li key={item.key}>
          <Link className={`ov-kpi${item.tone ? ` ov-kpi--${item.tone}` : ''}`} to={item.to}>
            <strong>{item.value ?? '—'}</strong>
            <span>{item.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
