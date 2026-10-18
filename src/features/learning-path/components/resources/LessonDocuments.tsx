import { Download, FileText } from 'lucide-react'
import type { LessonDocumentItem } from '~types/lesson'

export function LessonDocuments({ documents }: { documents: readonly LessonDocumentItem[] }) {
  if (documents.length === 0) return <p className="lp-res-empty">Bài học này chưa có tài liệu.</p>

  return (
    <ul className="lp-res-docs">
      {documents.map((doc) => (
        <li key={doc.id}>
          <a className="lp-res-doc" href={doc.url} target="_blank" rel="noopener noreferrer">
            <FileText aria-hidden="true" size={18} />
            <span>{doc.title}</span>
            <span className="lp-res-doc__action"><Download aria-hidden="true" size={15} />Tải về</span>
          </a>
        </li>
      ))}
    </ul>
  )
}
