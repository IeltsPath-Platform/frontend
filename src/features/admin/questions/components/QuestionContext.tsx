import { AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminResource } from '../../lib/useAdminResource'
import { listVersionPassages } from '../api/questionApi'
import type { QuestionPassage } from '../types'

function sourceLabel(passage: QuestionPassage) {
  if (passage.source === 'LESSON') return `Trong bài học: ${passage.sourceName ?? '—'}`
  if (passage.source === 'SECTION') return `Trong phần thi: ${passage.sourceName ?? '—'}`
  return 'Gắn trực tiếp với câu hỏi'
}

function length(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/** The passages and recordings a question version is read or heard with, so the question is seen in its context. */
export function QuestionContext({ versionId }: { versionId: string }) {
  const context = useAdminResource(`question-context|${versionId}`, (signal) => listVersionPassages(versionId, signal))
  if (context.status === 'loading') return <AdminLoading label="Đang tải đoạn văn và bài nghe…" />
  if (context.status === 'error') return <AdminError message={context.error ?? 'Không tải được đoạn văn và bài nghe.'} onRetry={context.reload} />
  const items = context.data ?? []
  if (items.length === 0) return null

  return (
    <section aria-label="Đoạn văn và bài nghe đi kèm" className="qb-context">
      <h3 className="qb-section-title">Đoạn văn và bài nghe đi kèm</h3>
      {items.map((item) => (
        <article className="qb-context__item" key={item.assetId}>
          <p className="qb-context__source">
            {item.type === 'AUDIO' ? 'Bài nghe' : item.type === 'IMAGE' ? 'Ảnh đề' : 'Đoạn văn'} · {sourceLabel(item)}
            {item.type === 'AUDIO' && item.durationSeconds ? ` · ${length(item.durationSeconds)}` : ''}
          </p>
          {item.type === 'AUDIO' ? (
            item.mediaUrl
              ? <audio aria-label={`Bài nghe: ${sourceLabel(item)}`} controls preload="none" src={item.mediaUrl} />
              : <p className="adm-muted">Không tạo được liên kết nghe cho tệp này.</p>
          ) : null}
          {item.type === 'AUDIO' && item.text ? (
            <details>
              <summary>Bản ghi lời thoại</summary>
              <p className="qb-context__text">{item.text}</p>
            </details>
          ) : null}
          {item.type === 'IMAGE' ? (
            item.mediaUrl
              ? <img alt={item.text ?? 'Ảnh đề'} className="qb-context__image" src={item.mediaUrl} />
              : <p className="adm-muted">Không tạo được liên kết xem ảnh này.</p>
          ) : null}
          {item.type === 'PASSAGE' && item.text ? <p className="qb-context__text">{item.text}</p> : null}
        </article>
      ))}
    </section>
  )
}
