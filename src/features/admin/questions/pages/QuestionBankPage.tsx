import { useState, type FormEvent } from 'react'
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { useToast } from '@/components/toast/toastContext'
import { useAdminSearch } from '../../adminSearch'
import { AdminDrawer } from '../../components/AdminLayer'
import { AdminRowMenu } from '../../components/AdminRowMenu'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminConfirm } from '../../lib/useAdminConfirm'
import { useAdminResource } from '../../lib/useAdminResource'
import { AdminPage } from '../../pages/AdminPage'
import { archiveQuestion, createQuestion, listQuestions } from '../api/questionApi'
import { QuestionDetailModal } from '../components/QuestionDetailModal'
import { QuestionEditPanel } from '../components/QuestionEditPanel'
import {
  PURPOSE_LABEL, SKILL_LABEL, STATUS_LABEL, TYPE_LABEL, questionErrorText, statusBadgeClass,
} from '../lib/labels'
import { PUBLICATION_STATUSES, PURPOSES, QUESTION_TYPES, SKILLS, type Question } from '../types'
import '../questions.css'
import { useAdminError } from '../../lib/useAdminError'

const PAGE_SIZE = 25

function CreateQuestionPanel({ onDone, onCreated }: { onDone: () => void; onCreated: (question: Question) => void }) {
  const [questionType, setQuestionType] = useState<string>('MULTIPLE_CHOICE')
  const [skill, setSkill] = useState<string>('READING')
  const [purpose, setPurpose] = useState<string>('LEARNING')
  const [accessLevel, setAccessLevel] = useState('FREE')
  const [, setError] = useAdminError()
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const created = await createQuestion({ questionType, skill: skill || null, accessLevel, purpose })
      onCreated(created)
    } catch (reason) {
      setError(questionErrorText(reason))
      setSaving(false)
    }
  }

  return (
    <form aria-label="Câu hỏi mới" onSubmit={(event) => void submit(event)}>
      <div className="adm-filters">
        <label className="adm-field">
          <span>Dạng câu hỏi</span>
          <select className="adm-select" onChange={(event) => setQuestionType(event.target.value)} value={questionType}>
            {QUESTION_TYPES.map((type) => <option key={type} value={type}>{TYPE_LABEL[type]}</option>)}
          </select>
        </label>
        <label className="adm-field">
          <span>Kỹ năng</span>
          <select className="adm-select" onChange={(event) => setSkill(event.target.value)} value={skill}>
            {SKILLS.map((item) => <option key={item} value={item}>{SKILL_LABEL[item]}</option>)}
          </select>
        </label>
        <label className="adm-field">
          <span>Mục đích</span>
          <select className="adm-select" onChange={(event) => setPurpose(event.target.value)} value={purpose}>
            {PURPOSES.map((item) => <option key={item} value={item}>{PURPOSE_LABEL[item]}</option>)}
          </select>
        </label>
        <label className="adm-field">
          <span>Gói truy cập</span>
          <select className="adm-select" onChange={(event) => setAccessLevel(event.target.value)} value={accessLevel}>
            <option value="FREE">FREE</option>
            <option value="PREMIUM">PREMIUM</option>
          </select>
        </label>
      </div>
      <div className="adm-form-footer">
        <button className="adm-btn" disabled={saving} onClick={onDone} type="button">Hủy</button>
        <button className="adm-btn adm-btn--primary" disabled={saving} type="submit">{saving ? 'Đang tạo…' : 'Tạo và thêm phiên bản'}</button>
      </div>
    </form>
  )
}

export function QuestionBankPage() {
  const { query } = useAdminSearch()
  const [skill, setSkill] = useState('')
  const [purpose, setPurpose] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const [creating, setCreating] = useState(false)
  const [viewing, setViewing] = useState<Question | null>(null)
  const [editing, setEditing] = useState<Question | null>(null)
  const { toast } = useToast()
  const { confirm, confirmDialog } = useAdminConfirm()
  const [, setActionError] = useAdminError()

  const list = useAdminResource(`questions|${skill}|${purpose}|${status}|${page}`, (signal) =>
    listQuestions({ skill, purpose, status, page, size: PAGE_SIZE }, signal))

  const text = query.trim().toLowerCase()
  const rows = (list.data?.content ?? []).filter((question) =>
    !text || [question.id, TYPE_LABEL[question.questionType], question.questionType, question.skill]
      .some((value) => value?.toLowerCase().includes(text)))

  /** Soft delete: the question is archived, not removed, so it stays under the "Đã lưu trữ" status filter. */
  async function remove(question: Question) {
    const confirmed = await confirm({
      title: 'Xóa câu hỏi?',
      message: 'Câu hỏi sẽ chuyển sang trạng thái "Đã lưu trữ" (xóa mềm); dữ liệu vẫn được giữ.',
      confirmLabel: 'Xóa câu hỏi',
      tone: 'danger',
    })
    if (!confirmed) return
    try {
      await archiveQuestion(question.id)
      toast({ title: 'Thành công', description: 'Đã xóa câu hỏi.', tone: 'success' })
      list.refresh()
    } catch (reason) {
      setActionError(questionErrorText(reason))
    }
  }

  function changeFilter(setter: (value: string) => void, value: string) {
    setter(value)
    setPage(0)
  }

  return (
    <AdminPage
        actions={
          <button className="adm-btn adm-btn--primary" onClick={() => setCreating(true)} type="button">
            <Plus aria-hidden="true" size={16} /> Câu hỏi mới
          </button>
        }
        subtitle="Tạo câu hỏi, thêm phiên bản, rồi xuất bản để bài học dùng được. Câu chưa xuất bản không bao giờ tới học viên."
        title="Ngân hàng câu hỏi">

      {creating ? <AdminDrawer title="Câu hỏi mới" onClose={() => setCreating(false)}>
        {(close) => (
          <CreateQuestionPanel
            onCreated={(created) => { setCreating(false); setEditing(created); list.reload() }}
            onDone={close}
          />
        )}
      </AdminDrawer> : null}

      {viewing ? <QuestionDetailModal onClose={() => setViewing(null)} question={viewing} /> : null}

      {editing ? <AdminDrawer
        description={`Mã ${editing.id}`}
        onClose={() => setEditing(null)}
        size="lg"
        title="Cập nhật câu hỏi">
        {(close) => <QuestionEditPanel onChanged={list.refresh} onDone={close} question={editing} />}
      </AdminDrawer> : null}

      {confirmDialog}

      <div className="adm-filters">
        <label className="adm-field">
          <span>Kỹ năng</span>
          <select className="adm-select" onChange={(event) => changeFilter(setSkill, event.target.value)} value={skill}>
            <option value="">Tất cả</option>
            {SKILLS.map((item) => <option key={item} value={item}>{SKILL_LABEL[item]}</option>)}
          </select>
        </label>
        <label className="adm-field">
          <span>Mục đích</span>
          <select className="adm-select" onChange={(event) => changeFilter(setPurpose, event.target.value)} value={purpose}>
            <option value="">Tất cả</option>
            {PURPOSES.map((item) => <option key={item} value={item}>{PURPOSE_LABEL[item]}</option>)}
          </select>
        </label>
        <label className="adm-field">
          <span>Trạng thái</span>
          <select className="adm-select" onChange={(event) => changeFilter(setStatus, event.target.value)} value={status}>
            <option value="">Tất cả</option>
            {PUBLICATION_STATUSES.map((item) => <option key={item} value={item}>{STATUS_LABEL[item]}</option>)}
          </select>
        </label>
      </div>

      {list.status === 'loading' ? <AdminLoading label="Đang tải câu hỏi…" /> : null}
      {list.status === 'error' ? <AdminError message={list.error ?? 'Không tải được câu hỏi.'} onRetry={list.reload} /> : null}
      {list.status === 'success' && (list.data?.content.length ?? 0) === 0 ? (
        <AdminEmpty title="Chưa có câu hỏi nào">Thử bỏ bớt bộ lọc, hoặc tạo câu hỏi mới.</AdminEmpty>
      ) : null}

      {list.status === 'success' && (list.data?.content.length ?? 0) > 0 ? (
        <>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <caption className="adm-sr-only">Danh sách câu hỏi</caption>
              <thead>
                <tr>
                  <th className="adm-stt" scope="col">STT</th>
                  <th scope="col">Mã</th>
                  <th scope="col">Dạng</th>
                  <th scope="col">Kỹ năng</th>
                  <th scope="col">Mục đích</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Cập nhật</th>
                  <th className="adm-col-actions" scope="col">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((question, index) => (
                  <tr key={question.id}>
                    <td className="adm-stt">{(list.data?.page ?? 0) * PAGE_SIZE + index + 1}</td>
                    <td><code>{question.id.slice(0, 8)}…</code></td>
                    <td>{TYPE_LABEL[question.questionType] ?? question.questionType}</td>
                    <td>{question.skill ? SKILL_LABEL[question.skill] ?? question.skill : '—'}</td>
                    <td>{question.purpose ? PURPOSE_LABEL[question.purpose] ?? question.purpose : '—'}</td>
                    <td><span className={statusBadgeClass(question.status)}>{STATUS_LABEL[question.status]}</span></td>
                    <td>{question.updatedAt ? new Date(question.updatedAt).toLocaleDateString('vi-VN') : '—'}</td>
                    <td className="adm-col-actions">
                      <AdminRowMenu label={`Hành động của câu hỏi ${(list.data?.page ?? 0) * PAGE_SIZE + index + 1}`} items={[
                        { key: 'view', label: 'Xem chi tiết', icon: <Eye aria-hidden="true" size={16} />, onSelect: () => setViewing(question) },
                        { key: 'edit', label: 'Cập nhật', icon: <Pencil aria-hidden="true" size={16} />, disabled: question.status === 'ARCHIVED', onSelect: () => setEditing(question) },
                        { key: 'delete', label: 'Xóa', icon: <Trash2 aria-hidden="true" size={16} />, tone: 'danger', separatorBefore: true, disabled: question.status === 'ARCHIVED', onSelect: () => void remove(question) },
                      ]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {text ? <p className="adm-muted">Ô tìm kiếm lọc trong trang hiện tại: {rows.length} kết quả.</p> : null}
          <nav aria-label="Phân trang" className="qb-pager">
            <button className="adm-btn adm-btn--small" disabled={page === 0} onClick={() => setPage(page - 1)} type="button">Trang trước</button>
            <span>Trang {(list.data?.page ?? 0) + 1} / {Math.max(1, list.data?.totalPages ?? 1)} · {list.data?.totalElements ?? 0} câu hỏi</span>
            <button
              className="adm-btn adm-btn--small"
              disabled={page + 1 >= (list.data?.totalPages ?? 1)}
              onClick={() => setPage(page + 1)}
              type="button"
            >
              Trang sau
            </button>
          </nav>
        </>
      ) : null}
    </AdminPage>
  )
}
