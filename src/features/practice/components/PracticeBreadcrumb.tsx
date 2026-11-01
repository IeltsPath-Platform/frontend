import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import './practice-breadcrumb.css'

export interface Crumb {
  label: string
  /** Where the crumb leads; the last crumb is the page the learner is on and has none. */
  to?: string
}

/**
 * Where the learner came from, as a path they can walk back along: "Luyện tập › Reading › Passage 2 › Kết quả". Every
 * crumb but the last is a link; the last one names the current page.
 */
export function PracticeBreadcrumb({ items }: { items: readonly Crumb[] }) {
  return (
    <nav className="pb-nav" aria-label="Đường dẫn">
      <ol className="pb-list">
        {items.map((item, index) => {
          const last = index === items.length - 1
          return (
            <Fragment key={`${item.label}-${index}`}>
              <li className="pb-item">
                {item.to && !last
                  ? <Link className="pb-link" to={item.to}>{item.label}</Link>
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
