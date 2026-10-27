import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus } from 'lucide-react'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminResource } from '../../lib/useAdminResource'
import { STATUS_LABEL, statusBadgeClass } from '../../questions/lib/labels'
import { fetchLessons, reorderLessons } from '../api/lessonApi'
import { lessonErrorText } from '../lib/lessonErrors'
import { moveId } from '../lib/blockForm'
import '../lessons.css'

/** The lessons of one topic, in teaching order, with their status. Opening one hands its id to the drawer. */
export function TopicLessonsPanel({ topicId, onOpen, onCreate }: {
  topicId: string
  onOpen: (lesson: { id: string; title: string }) => void
  onCreate: () => void
}) {
  const lessons = useAdminResource(`lessons|${topicId}`, (signal) => fetchLessons(topicId, signal))
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const rows = lessons.data ?? []

  async function move(id: string, delta: -1 | 1) {
    if (busy) return
    setBusy(true)
    setActionError(null)
    try {
      await reorderLessons(topicId, moveId(rows.map((lesson) => lesson.id), id, delta))
    } catch (reason) {
      setActionError(lessonErrorText(reason))
    } finally {
      setBusy(false)
      lessons.reload()
    }
  }

  return (
    <section aria-label="Bài học của chủ đề">
      <div className="ls-toolbar">
        <p className="adm-muted">Mọi trạng thái: nháp, đã xuất bản, đã lưu trữ. Bấm tên bài để soạn nội dung ngay trong khung này.</p>
        <button className="adm-btn adm-btn--primary" onClick={onCreate} type="button"><Plus aria-hidden="true" size={16} /> Bài học mới</button>
      </div>
      {actionError ? <div className="adm-alert adm-alert--error" role="alert">{actionError}</div> : null}
      {lessons.status === 'loading' && !lessons.data ? <AdminLoading label="Đang tải bài học…" /> : null}
      {lessons.status === 'error' ? <AdminError message={lessons.error ?? 'Không tải được bài học.'} onRetry={lessons.reload} /> : null}
      {lessons.status === 'success' && rows.length === 0 ? <AdminEmpty title="Chủ đề này chưa có bài học">Bấm “Bài học mới” để tạo bài nháp đầu tiên.</AdminEmpty> : null}
      {rows.length > 0 ? (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <caption className="adm-sr-only">Danh sách bài học</caption>
            <thead>
              <tr>
                <th className="adm-stt" scope="col">STT</th>
                <th scope="col">Thứ tự</th>
                <th scope="col">Mã</th>
                <th scope="col">Tiêu đề</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Block</th>
                <th scope="col">KP</th>
                <th scope="col">Phút</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((lesson, index) => (
                <tr key={lesson.id}>
                  <td className="adm-stt">{index + 1}</td>
                  <td>
                    <span className="ls-order">
                      <button aria-label={`Đưa ${lesson.title} lên`} className="adm-btn adm-btn--small" disabled={busy || index === 0} onClick={() => void move(lesson.id, -1)} type="button">
                        <ArrowUp aria-hidden="true" size={14} />
                      </button>
                      <button aria-label={`Đưa ${lesson.title} xuống`} className="adm-btn adm-btn--small" disabled={busy || index === rows.length - 1} onClick={() => void move(lesson.id, 1)} type="button">
                        <ArrowDown aria-hidden="true" size={14} />
                      </button>
                    </span>
                  </td>
                  <td><code>{lesson.code}</code></td>
                  <td><button className="qb-link ls-open" onClick={() => onOpen({ id: lesson.id, title: lesson.title })} type="button">{lesson.title}</button></td>
                  <td><span className={statusBadgeClass(lesson.status)}>{STATUS_LABEL[lesson.status]}</span></td>
                  <td>{lesson.blockCount ?? '—'}</td>
                  <td>{lesson.knowledgePointCount ?? '—'}</td>
                  <td>{lesson.estimatedMinutes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}
