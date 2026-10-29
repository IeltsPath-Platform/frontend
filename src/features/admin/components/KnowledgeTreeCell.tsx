import type { CSSProperties, ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import './knowledge-tree-cell.css'

/**
 * The first cell of a row in a knowledge point tree table: an arrow that folds or opens the points beneath this one (a
 * spacer when there are none), then the content, indented by `depth`. The arrow is named by the point's code.
 */
export function KnowledgeTreeCell({ depth, code, foldable, open, onToggle, children }: {
  depth: number
  code: string
  foldable: boolean
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return <span className="adm-kp-treecell" style={{ '--depth': depth } as CSSProperties}>
    {foldable
      ? <button aria-expanded={open} aria-label={`${open ? 'Thu gọn' : 'Mở'} ${code}`} className="adm-kp-tree__toggle" onClick={onToggle} type="button"><ChevronDown aria-hidden="true" size={16} /></button>
      : <span aria-hidden="true" className="adm-kp-tree__spacer" />}
    {children}
  </span>
}
