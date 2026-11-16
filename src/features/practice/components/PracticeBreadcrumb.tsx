import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, House } from 'lucide-react'
import { HOME_PATH } from '@/features/learning-path/lib/resultOrigin'
import './practice-breadcrumb.css'

export interface Crumb {
  label: string
  /** Where the crumb leads; the last crumb is the page the learner is on and has none. */
  to?: string
  /** Shown as a house icon, the label kept for screen readers. */
  home?: boolean
}

/**
 * Where the learner came from, as a path they can walk back along: "Luyện tập › Reading › Passage 2 › Kết quả". Every
 * crumb but the last is a link; the last one names the current page.
 */
export function PracticeBreadcrumb({ items }: { items: readonly Crumb[] }) {
  // Like every trail of the app it starts with the house icon that leads home, so a page does not list it itself.
  const trail: readonly Crumb[] = [{ label: 'Trang chủ', to: HOME_PATH, home: true }, ...items]
  return (
    <nav className="pb-nav" aria-label="Đường dẫn">
      <ol className="pb-list">
        {trail.map((item, index) => {
          const last = index === trail.length - 1
          return (
            <Fragment key={`${item.label}-${index}`}>
              <li className="pb-item">
                {item.to && !last
                  ? item.home
                    ? <Link aria-label={item.label} className="pb-link pb-home" title={item.label} to={item.to}><House aria-hidden="true" size={16} /></Link>
                    : <Link className="pb-link" to={item.to}>{item.label}</Link>
                  : <span className="pb-current" aria-current={last ? 'page' : undefined}>{item.label}</span>}
              </li>
              {!last && <li className="pb-sep" aria-hidden="true"><ChevronRight size={16} /></li>}
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
