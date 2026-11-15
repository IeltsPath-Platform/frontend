import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, House } from 'lucide-react'
import { HOME_PATH } from '../lib/resultOrigin'

export interface TrailItem {
  label: string
  /** Omit on the last item: it is the page the learner is on. */
  to?: string
  /** Shown as a house icon, with the label kept for screen readers and the tooltip: the way back to the home page. */
  home?: boolean
  /** Runs when the learner follows the link, for a step that changes the page without leaving it. */
  onClick?: () => void
}

const HOME: TrailItem = { label: 'Trang chủ', to: HOME_PATH, home: true }

/**
 * The pages the learner passed through, ending at the current page. Every trail starts with the house icon that leads to the
 * home page, so a page does not list it itself; there is no separate back button, the steps are the way back.
 */
export function LearnTrail({ items }: { items: TrailItem[] }) {
  if (items.length === 0) return null

  const trail = items[0].home ? items : [HOME, ...items]
  const last = trail.length - 1

  return (
    <nav aria-label="Đường dẫn trang" className="lp-trail">
      <ol className="lp-trail__list">
        {trail.map((item, index) => (
          <Fragment key={`${index}:${item.label}`}>
            <li className={index === last ? 'lp-trail__item is-current' : 'lp-trail__item'}>
              {index === last || !item.to ? (
                <span aria-current={index === last ? 'page' : undefined} title={item.label}>{item.label}</span>
              ) : item.home ? (
                <Link aria-label={item.label} className="lp-trail__home" onClick={item.onClick} title={item.label} to={item.to}>
                  <House aria-hidden="true" size={16} />
                </Link>
              ) : (
                <Link onClick={item.onClick} title={item.label} to={item.to}>{item.label}</Link>
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
