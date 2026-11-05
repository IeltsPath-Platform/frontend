import { useState } from 'react'
import { Archive, ArrowDown, ArrowUp, Pencil, Plus, Send } from 'lucide-react'
import { AdminRowMenu } from '../../components/AdminRowMenu'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminConfirm } from '../../lib/useAdminConfirm'
import { useAdminResource } from '../../lib/useAdminResource'
import { STATUS_LABEL, statusBadgeClass } from '../../questions/lib/labels'
import { archiveLesson, fetchLessons, publishLesson, reorderLessons } from '../api/lessonApi'
import { lessonErrorText, publishProblems } from '../lib/lessonErrors'
import { moveId } from '../lib/blockForm'
import type { LessonSummary } from '../types'
import '../lessons.css'
import { useAdminError } from '../../lib/useAdminError'

/** The lessons of one topic, in teaching order, with their status. Opening one hands its id to the drawer. */
export function TopicLessonsPanel({ topicId, onOpen, onCreate }: {
  topicId: string
  onOpen: (lesson: { id: string; title: string }) => void
  onCreate: () => void
}) {
  const lessons = useAdminResource(`lessons|${topicId}`, (signal) => fetchLessons(topicId, signal))
  const [busy, setBusy] = useState(false)
  const [, setActionError] = useAdminError()
  const { confirm, confirmDialog } = useAdminConfirm()
  const rows = lessons.data ?? []

  /** Runs one write on the list, shows why it failed, and loads the list again either way. */
  async function change(action: () => Promise<unknown>) {
    if (busy) return
    setBusy(true)
    setActionError(null)
    try {
      await action()
    } catch (reason) {
      setActionError([lessonErrorText(reason), ...publishProblems(reason)].join('\n'))
    } finally {
      setBusy(false)
      lessons.reload()
    }
  }

  const move = (id: string, delta: -1 | 1) => change(() => reorderLessons(topicId, moveId(rows.map((lesson) => lesson.id), id, delta)))

  async function archive(lesson: LessonSummary) {
    if (!(await confirm({
      title: 'Lưu trữ bài học?',
      message: `Học viên sẽ không còn thấy “${lesson.title}”. Nội dung và tiến độ vẫn được giữ, bạn có thể xuất bản lại sau.`,
      confirmLabel: 'Lưu trữ',
      tone: 'danger',
    }))) return
    await change(() => archiveLesson(lesson.id))
  }

  return (
    <section aria-label="Bài học của chủ đề">
      {confirmDialog}
      <div className="ls-toolbar">
        <button className="adm-btn adm-btn--primary" onClick={onCreate} type="button"><Plus aria-hidden="true" size={16} /> Bài học mới</button>
      </div>
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
                <th scope="col">Mã</th>
                <th scope="col">Tiêu đề</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Block</th>
                <th scope="col">KP</th>
                <th scope="col">Phút</th>
                <th className="adm-col-actions" scope="col">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((lesson, index) => (
                <tr key={lesson.id}>
                  <td className="adm-stt">{index + 1}</td>
                  <td><code>{lesson.code}</code></td>
                  <td>{lesson.title}</td>
                  <td><span className={statusBadgeClass(lesson.status)}>{STATUS_LABEL[lesson.status]}</span></td>
                  <td>{lesson.blockCount ?? '—'}</td>
                  <td>{lesson.knowledgePointCount ?? '—'}</td>
                  <td>{lesson.estimatedMinutes ?? '—'}</td>
                  <td className="adm-col-actions">
                    <AdminRowMenu label={`Hành động của bài ${index + 1}`} items={[
                      { key: 'edit', label: 'Sửa bài học', ariaLabel: `Sửa ${lesson.title}`, icon: <Pencil aria-hidden="true" size={16} />, onSelect: () => onOpen({ id: lesson.id, title: lesson.title }) },
                      lesson.status === 'PUBLISHED'
                        ? { key: 'archive', label: 'Lưu trữ', ariaLabel: `Lưu trữ ${lesson.title}`, icon: <Archive aria-hidden="true" size={16} />, separatorBefore: true, disabled: busy, onSelect: () => void archive(lesson) }
                        : { key: 'publish', label: lesson.status === 'DRAFT' ? 'Xuất bản' : 'Xuất bản lại', ariaLabel: `${lesson.status === 'DRAFT' ? 'Xuất bản' : 'Xuất bản lại'} ${lesson.title}`, icon: <Send aria-hidden="true" size={16} />, separatorBefore: true, disabled: busy, onSelect: () => void change(() => publishLesson(lesson.id)) },
                      { key: 'up', label: 'Đưa lên', ariaLabel: `Đưa ${lesson.title} lên`, icon: <ArrowUp aria-hidden="true" size={16} />, separatorBefore: true, disabled: busy || index === 0, onSelect: () => void move(lesson.id, -1) },
                      { key: 'down', label: 'Đưa xuống', ariaLabel: `Đưa ${lesson.title} xuống`, icon: <ArrowDown aria-hidden="true" size={16} />, disabled: busy || index === rows.length - 1, onSelect: () => void move(lesson.id, 1) },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}
