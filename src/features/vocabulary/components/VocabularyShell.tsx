import type { ReactNode } from 'react'
import { SiteNavbar } from '@/components/SiteNavbar'
import '../vocabulary.css'

interface VocabularyShellProps {
  children: ReactNode
  /** Label of the skip link that jumps past the navbar. */
  skipLabel?: string
}

/** Page frame shared by every vocabulary screen: the site navbar, the dictionary canvas and a skip link. */
export function VocabularyShell({ children, skipLabel = 'Chuyển đến nội dung' }: VocabularyShellProps) {
  return (
    <div className="dictionary-page">
      <a className="skip-link" href="#vocabulary-content">
        {skipLabel}
      </a>
      <SiteNavbar />
      <main id="vocabulary-content" tabIndex={-1}>
        {children}
      </main>
    </div>
  )
}
