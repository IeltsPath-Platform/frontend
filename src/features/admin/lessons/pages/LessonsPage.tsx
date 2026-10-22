import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp, Plus } from 'lucide-react'
import { useAdminSearch } from '../../adminSearch'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminResource } from '../../lib/useAdminResource'
import { fetchCourses } from '../../knowledge-graph/api/knowledgeGraphApi'
import { AdminPage } from '../../pages/AdminPage'
import { STATUS_LABEL, statusBadgeClass } from '../../questions/lib/labels'
import { createLesson, fetchLessons, fetchTopics, reorderLessons } from '../api/lessonApi'
import { lessonErrorText } from '../lib/lessonErrors'
import { moveId } from '../lib/blockForm'
import '../lessons.css'

function NewLessonForm({ topicId, onCreated, onCancel }: { topicId: string; onCreated: () => void; onCancel: () => void }) {
  const [code, setCode] = useState('')
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!code.trim() || !title.trim()) {
      setError('Cần nhập mã và tiêu đề bài học.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createLesson(topicId, { code: code.trim(), title: title.trim(), summary: summary.trim(), summaryMarkdown: '', estimatedMinutes: null })
      onCreated()
    } catch (reason) {
      setError(lessonErrorText(reason))
      setSaving(false)
    }
  }

  return (
    <form aria-label="Bài học mới" className="adm-card ls-create" noValidate onSubmit={(event) => void submit(event)}>
      <h2>Bài học mới</h2>
      {error ? <div className="adm-alert adm-alert--error" role="alert">{error}</div> : null}
      <div className="adm-filters">
        <label className="adm-field">
          <span>Mã bài học</span>
          <input className="adm-input" onChange={(event) => setCode(event.target.value)} value={code} />
        </label>
        <label className="adm-field ls-grow">
          <span>Tiêu đề</span>
          <input className="adm-input" onChange={(event) => setTitle(event.target.value)} value={title} />
        </label>
      </div>
      <label className="adm-field">
        <span>Tóm tắt</span>
        <input className="adm-input" onChange={(event) => setSummary(event.target.value)} value={summary} />
      </label>
      <div className="qb-form__actions">
        <button className="adm-btn adm-btn--primary" disabled={saving} type="submit">{saving ? 'Đang tạo…' : 'Tạo bài học nháp'}</button>
        <button className="adm-btn" disabled={saving} onClick={onCancel} type="button">Hủy</button>
      </div>
    </form>
  )
}

export function LessonsPage() {
  const { query } = useAdminSearch()
  const [courseId, setCourseId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [creating, setCreating] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const courses = useAdminResource('lesson-courses', (signal) => fetchCourses(signal))
  const topics = useAdminResource('lesson-topics', (signal) => fetchTopics(signal))
  const lessons = useAdminResource(`lessons|${topicId}`, (signal) => (topicId ? fetchLessons(topicId, signal) : Promise.resolve([])))

  const topicOptions = (topics.data ?? []).filter((topic) => !courseId || topic.courseId === courseId)

  async function move(id: string, delta: -1 | 1) {
    const ids = (lessons.data ?? []).map((lesson) => lesson.id)
    setActionError(null)
    try {
      await reorderLessons(topicId, moveId(ids, id, delta))
    } catch (reason) {
      setActionError(lessonErrorText(reason))
    }
    lessons.reload()
  }

  const text = query.trim().toLowerCase()
  const rows = (lessons.data ?? []).filter((lesson) =>
    !text || lesson.code.toLowerCase().includes(text) || lesson.title.toLowerCase().includes(text))
  const unfiltered = text === ''

  return (
    <AdminPage
        actions={
          <button className="adm-btn adm-btn--primary" disabled={!topicId} onClick={() => setCreating((open) => !open)} type="button">
            <Plus aria-hidden="true" size={16} /> Bài học mới
          </button>
        }
        subtitle="Chọn khóa học và chủ đề, rồi soạn bài theo từng block. Block giữ nguyên mã khi sửa nên tiến độ của học viên không mất."
        title="Bài học">

      <div className="adm-filters">
        <label className="adm-field">
          <span>Khóa học</span>
          <select
            className="adm-select"
            onChange={(event) => { setCourseId(event.target.value); setTopicId(''); setCreating(false) }}
            value={courseId}
          >
            <option value="">Tất cả khóa học</option>
            {(courses.data ?? []).map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
          </select>
        </label>
        <label className="adm-field">
          <span>Chủ đề</span>
          <select className="adm-select" onChange={(event) => { setTopicId(event.target.value); setCreating(false) }} value={topicId}>
            <option value="">Chọn chủ đề…</option>
            {topicOptions.map((topic) => <option key={topic.id} value={topic.id}>{topic.code} · {topic.name}</option>)}
          </select>
        </label>
      </div>

      {topics.status === 'loading' ? <AdminLoading label="Đang tải chủ đề…" /> : null}
      {topics.status === 'error' ? <AdminError message={topics.error ?? 'Không tải được chủ đề.'} onRetry={topics.reload} /> : null}
      {creating && topicId ? (
        <NewLessonForm onCancel={() => setCreating(false)} onCreated={() => { setCreating(false); lessons.reload() }} topicId={topicId} />
      ) : null}
      {actionError ? <div className="adm-alert adm-alert--error" role="alert">{actionError}</div> : null}

      {!topicId && topics.status === 'success' ? <AdminEmpty title="Chọn một chủ đề để xem các bài học">Danh sách hiện mọi trạng thái: nháp, đã xuất bản, đã lưu trữ.</AdminEmpty> : null}
      {topicId && lessons.status === 'loading' ? <AdminLoading label="Đang tải bài học…" /> : null}
      {topicId && lessons.status === 'error' ? <AdminError message={lessons.error ?? 'Không tải được bài học.'} onRetry={lessons.reload} /> : null}
      {topicId && lessons.status === 'success' && (lessons.data?.length ?? 0) === 0 ? (
        <AdminEmpty title="Chủ đề này chưa có bài học">Bấm “Bài học mới” để tạo bài nháp đầu tiên.</AdminEmpty>
      ) : null}

      {topicId && lessons.status === 'success' && rows.length > 0 ? (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <caption className="adm-sr-only">Danh sách bài học</caption>
            <thead>
              <tr>
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
                  <td>
                    <span className="ls-order">
                      <button aria-label={`Đưa ${lesson.title} lên`} className="adm-btn adm-btn--small" disabled={!unfiltered || index === 0} onClick={() => void move(lesson.id, -1)} type="button">
                        <ArrowUp aria-hidden="true" size={14} />
                      </button>
                      <button aria-label={`Đưa ${lesson.title} xuống`} className="adm-btn adm-btn--small" disabled={!unfiltered || index === rows.length - 1} onClick={() => void move(lesson.id, 1)} type="button">
                        <ArrowDown aria-hidden="true" size={14} />
                      </button>
                    </span>
                  </td>
                  <td><code>{lesson.code}</code></td>
                  <td><Link className="qb-link" to={`/content-author/lessons/${lesson.id}`}>{lesson.title}</Link></td>
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
      {topicId && lessons.status === 'success' && !unfiltered ? <p className="adm-muted">Đang lọc theo ô tìm kiếm nên tạm khóa đổi thứ tự.</p> : null}
    </AdminPage>
  )
}
