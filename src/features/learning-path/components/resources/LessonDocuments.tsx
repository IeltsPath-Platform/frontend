import { Download, FileText } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { MouseEvent } from 'react'
import type { LessonDocumentItem } from '~types/lesson'

/** An uploaded file's link is signed for 15 minutes; past this age a click reloads the list instead of opening it. */
export const DOCUMENT_LINK_MAX_AGE_MS = 10 * 60 * 1000

export function LessonDocuments({ documents, onRefresh }: {
  documents: readonly LessonDocumentItem[]
  /** Fetches the lesson's resources again, which signs fresh links. */
  onRefresh?: () => void
}) {
  const loadedAt = useRef(0)
  useEffect(() => { loadedAt.current = Date.now() }, [documents])

  if (documents.length === 0) return <p className="lp-res-empty">Bài học này chưa có tài liệu.</p>

  function openOrRefresh(event: MouseEvent) {
    if (!onRefresh || Date.now() - loadedAt.current <= DOCUMENT_LINK_MAX_AGE_MS) return
    event.preventDefault()
    onRefresh()
  }

  return (
    <ul className="lp-res-docs">
      {documents.map((doc) => (
        <li key={doc.id}>
          <a className="lp-res-doc" href={doc.url} target="_blank" rel="noopener noreferrer" onClick={openOrRefresh}>
            <FileText aria-hidden="true" size={18} />
            <span>{doc.title}</span>
            <span className="lp-res-doc__action"><Download aria-hidden="true" size={15} />Tải về</span>
          </a>
        </li>
      ))}
    </ul>
  )
}
