import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronRight } from 'lucide-react'

export interface TrailItem {
  label: string
  /** Omit on the last item: it is the page the learner is on. */
  to?: string
}

/** Back button plus the pages the learner passed through, ending at the current page. */
export function LearnTrail({ items }: { items: TrailItem[] }) {
  if (items.length < 2) return null

  const parents = items.slice(0, -1)
  const back = [...parents].reverse().find((item) => item.to)
  const last = items.length - 1

  return (
    <nav aria-label="Đường dẫn trang" className="lp-trail">
      {back?.to ? (
        <Link aria-label={`Quay lại: ${back.label}`} className="lp-trail__back" title={`Quay lại: ${back.label}`} to={back.to}>
          <ArrowLeft aria-hidden="true" size={18} />
        </Link>
      ) : null}
      <ol className="lp-trail__list">
        {items.map((item, index) => (
          <Fragment key={`${index}:${item.label}`}>
            <li className={index === last ? 'lp-trail__item is-current' : 'lp-trail__item'}>
              {index === last || !item.to ? (
                <span aria-current={index === last ? 'page' : undefined} title={item.label}>{item.label}</span>
              ) : (
                <Link title={item.label} to={item.to}>{item.label}</Link>
              )}
            </li>
            {index < last ? (
              <li aria-hidden="true" className="lp-trail__sep">
                <ChevronRight size={14} />
              </li>
            ) : null}
          </Fragment>
        ))}
      </ol>
    </nav>
  )
}
