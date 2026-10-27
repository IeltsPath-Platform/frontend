import { useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, Archive, Pencil, Plus, Send, Trash2 } from 'lucide-react'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminResource } from '../../lib/useAdminResource'
import { KnowledgePointPicker } from '../../questions/components/KnowledgePointPicker'
import { STATUS_LABEL, statusBadgeClass } from '../../questions/lib/labels'
import {
  addBlock, archiveLesson, deleteBlock, fetchLesson, publishLesson, reorderBlocks,
  setLessonKnowledgePoints, updateBlock, updateLesson,
} from '../api/lessonApi'
import { BlockEditor } from '../components/BlockEditor'
import { LessonResourcesEditor } from '../components/LessonResourcesEditor'
import { BLOCK_LABEL } from '../lib/blockLabels'
import { moveId } from '../lib/blockForm'
import { lessonErrorText, publishProblems } from '../lib/lessonErrors'
import { BLOCK_TYPES, type BlockRequest, type BlockType, type LessonBlock, type LessonEditor } from '../types'
import '../lessons.css'

const EXERCISE_LOCK_NOTE =
  'Bài đã xuất bản: không đổi được bộ câu hỏi của block bài tập vì học viên đã có tiến độ theo block. Các block khác vẫn sửa được.'

function blockSummary(block: LessonBlock): string {
  switch (block.blockType) {
    case 'TEXT': return (block.textContent ?? '').slice(0, 140) || '(trống)'
    case 'ASSET': return block.assetId ? `Asset ${block.assetId.slice(0, 8)}…` : '(chưa có asset)'
    case 'VOCABULARY': return `${block.vocabularySenseIds.length} nghĩa từ vựng`
    case 'EXERCISE': return block.questions.length === 0 ? '(chưa có câu hỏi)' : `${block.questions.length} câu hỏi`
  }
}

function MetaForm({ lesson, onSaved }: { lesson: LessonEditor; onSaved: () => void }) {
  const [title, setTitle] = useState(lesson.title)
  const [summary, setSummary] = useState(lesson.summary)
  const [markdown, setMarkdown] = useState(lesson.summaryMarkdown)
  const [minutes, setMinutes] = useState(lesson.estimatedMinutes?.toString() ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) {
      setError('Tiêu đề không được để trống.')
      return
    }
    const parsed = minutes.trim() === '' ? null : Number(minutes)
    if (parsed !== null && (!Number.isInteger(parsed) || parsed <= 0)) {
      setError('Số phút phải là số nguyên dương.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await updateLesson(lesson.id, { title: title.trim(), summary: summary.trim(), summaryMarkdown: markdown, estimatedMinutes: parsed })
      onSaved()
    } catch (reason) {
      setError(lessonErrorText(reason))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form aria-label="Thông tin bài học" className="adm-card ls-meta" noValidate onSubmit={(event) => void submit(event)}>
      <h2>Thông tin bài học</h2>
      {error ? <div className="adm-alert adm-alert--error" role="alert">{error}</div> : null}
      <div className="adm-filters">
        <label className="adm-field ls-grow">
          <span>Tiêu đề</span>
          <input className="adm-input" onChange={(event) => setTitle(event.target.value)} value={title} />
        </label>
        <label className="adm-field">
          <span>Số phút ước tính</span>
          <input className="adm-input" inputMode="numeric" onChange={(event) => setMinutes(event.target.value)} value={minutes} />
        </label>
      </div>
      <label className="adm-field">
        <span>Tóm tắt</span>
        <input className="adm-input" onChange={(event) => setSummary(event.target.value)} value={summary} />
      </label>
      <label className="adm-field">
        <span>Tóm tắt chi tiết (Markdown)</span>
        <textarea className="adm-textarea ls-textarea" onChange={(event) => setMarkdown(event.target.value)} value={markdown} />
      </label>
      <button className="adm-btn adm-btn--primary" disabled={saving} type="submit">{saving ? 'Đang lưu…' : 'Lưu thông tin'}</button>
    </form>
  )
}

function KnowledgePointsPanel({ lesson, onSaved }: { lesson: LessonEditor; onSaved: () => void }) {
  const [ids, setIds] = useState(lesson.knowledgePointIds)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await setLessonKnowledgePoints(lesson.id, ids)
      onSaved()
    } catch (reason) {
      setError(lessonErrorText(reason))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section aria-label="Knowledge point của bài" className="adm-card ls-meta">
      <h2>Knowledge point của bài</h2>
      <p className="adm-muted">Bài chỉ xuất bản được khi gắn ít nhất một KP đang hoạt động.</p>
      {error ? <div className="adm-alert adm-alert--error" role="alert">{error}</div> : null}
      <KnowledgePointPicker onChange={(next) => setIds(next.map((item) => item.knowledgePointId))} value={ids.map((knowledgePointId) => ({ knowledgePointId, weight: 1 }))} />
      <button className="adm-btn adm-btn--primary" disabled={saving} onClick={() => void save()} type="button">{saving ? 'Đang lưu…' : 'Lưu KP'}</button>
    </section>
  )
}

type Editing = { mode: 'new'; blockType: BlockType } | { mode: 'edit'; block: LessonBlock } | null

function LessonEditorBody({ lesson, reload }: { lesson: LessonEditor; reload: () => void }) {
  const [editing, setEditing] = useState<Editing>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [problems, setProblems] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const isDraft = lesson.status === 'DRAFT'
  const exerciseLocked = !isDraft

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setActionError(null)
    setProblems([])
    try {
      await action()
    } catch (reason) {
      setActionError(lessonErrorText(reason))
      setProblems(publishProblems(reason))
    } finally {
      setBusy(false)
      reload()
    }
  }

  async function saveBlock(body: BlockRequest) {
    if (editing?.mode === 'edit') await updateBlock(lesson.id, editing.block.id, body)
    else await addBlock(lesson.id, body)
    setEditing(null)
    reload()
  }

  const moveBlock = (id: string, delta: -1 | 1) =>
    run(() => reorderBlocks(lesson.id, moveId(lesson.blocks.map((block) => block.id), id, delta)))

  const removeBlock = (block: LessonBlock) => {
    if (!window.confirm(`Xóa block "${BLOCK_LABEL[block.blockType]}"? Tiến độ của học viên ở block này sẽ không còn được tính.`)) return Promise.resolve()
    return run(() => deleteBlock(lesson.id, block.id))
  }

  const canTouch = (block: LessonBlock) => block.blockType !== 'EXERCISE' || !exerciseLocked

  return (
    <>
      <div className="ls-statusbar">
        <span className={statusBadgeClass(lesson.status)}>{STATUS_LABEL[lesson.status]}</span>
        <code>{lesson.code}</code>
        <span className="ls-statusbar__actions">
          {isDraft ? (
            <button className="adm-btn adm-btn--primary" disabled={busy} onClick={() => void run(() => publishLesson(lesson.id))} type="button">
              <Send aria-hidden="true" size={14} /> Xuất bản
            </button>
          ) : null}
          {lesson.status === 'PUBLISHED' ? (
            <button className="adm-btn" disabled={busy} onClick={() => void run(() => archiveLesson(lesson.id))} type="button">
              <Archive aria-hidden="true" size={14} /> Lưu trữ
            </button>
          ) : null}
        </span>
      </div>

      {actionError ? (
        <div className="adm-alert adm-alert--error" role="alert">
          {actionError}
          {problems.length > 0 ? <ul>{problems.map((problem) => <li key={problem}>{problem}</li>)}</ul> : null}
        </div>
      ) : null}
      {exerciseLocked ? <div className="adm-alert" role="note">{EXERCISE_LOCK_NOTE}</div> : null}

      <MetaForm key={`meta-${lesson.title}-${lesson.summary}-${lesson.estimatedMinutes}`} lesson={lesson} onSaved={reload} />
      <LessonResourcesEditor key={lesson.id} lessonId={lesson.id} />
      <KnowledgePointsPanel key={`kp-${lesson.knowledgePointIds.join(',')}`} lesson={lesson} onSaved={reload} />

      <section aria-label="Các block" className="ls-blocks">
        <h2>Các block ({lesson.blocks.length})</h2>
        {lesson.blocks.length === 0 ? <p className="adm-muted">Bài chưa có block nào.</p> : null}
        <ol className="ls-blocks__list">
          {lesson.blocks.map((block, index) => (
            <li className="adm-card ls-block" key={block.id}>
              <div className="ls-block__head">
                <span className="adm-badge">{BLOCK_LABEL[block.blockType]}</span>
                <span className="ls-block__summary">{blockSummary(block)}</span>
                <span className="ls-block__actions">
                  <button aria-label={`Đưa block ${index + 1} lên`} className="adm-btn adm-btn--small" disabled={busy || index === 0} onClick={() => void moveBlock(block.id, -1)} type="button">
                    <ArrowUp aria-hidden="true" size={14} />
                  </button>
                  <button aria-label={`Đưa block ${index + 1} xuống`} className="adm-btn adm-btn--small" disabled={busy || index === lesson.blocks.length - 1} onClick={() => void moveBlock(block.id, 1)} type="button">
                    <ArrowDown aria-hidden="true" size={14} />
                  </button>
                  <button
                    aria-label={`Sửa block ${index + 1}`}
                    className="adm-btn adm-btn--small"
                    disabled={busy || !canTouch(block)}
                    onClick={() => setEditing({ mode: 'edit', block })}
                    title={canTouch(block) ? undefined : 'Bài đã xuất bản: không đổi được câu hỏi của block bài tập.'}
                    type="button"
                  >
                    <Pencil aria-hidden="true" size={14} />
                  </button>
                  <button
                    aria-label={`Xóa block ${index + 1}`}
                    className="adm-btn adm-btn--small adm-btn--danger"
                    disabled={busy || !canTouch(block)}
                    onClick={() => void removeBlock(block)}
                    title={canTouch(block) ? undefined : 'Bài đã xuất bản: không xóa được block bài tập.'}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" size={14} />
                  </button>
                </span>
              </div>
              {block.blockType === 'EXERCISE' && block.questions.length > 0 ? (
                <ul className="ls-block__questions">
                  {block.questions.map((question) => (
                    <li key={question.questionVersionId}>
                      {question.stem ?? `Phiên bản ${question.questionVersionId.slice(0, 8)}`}{' '}
                      {question.status && question.status !== 'PUBLISHED' ? <span className="adm-badge adm-badge--warn">{STATUS_LABEL[question.status] ?? question.status}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ol>

        {editing ? (
          <BlockEditor
            block={editing.mode === 'edit' ? editing.block : undefined}
            blockType={editing.mode === 'edit' ? editing.block.blockType : editing.blockType}
            key={editing.mode === 'edit' ? editing.block.id : `new-${editing.blockType}`}
            onCancel={() => setEditing(null)}
            onSave={saveBlock}
          />
        ) : (
          <div className="ls-add">
            <span className="adm-muted">Thêm block:</span>
            {BLOCK_TYPES.map((type) => (
              <button
                className="adm-btn adm-btn--small"
                disabled={busy || (type === 'EXERCISE' && exerciseLocked)}
                key={type}
                onClick={() => setEditing({ mode: 'new', blockType: type })}
                title={type === 'EXERCISE' && exerciseLocked ? 'Bài đã xuất bản: không thêm được block bài tập.' : undefined}
                type="button"
              >
                <Plus aria-hidden="true" size={14} /> {BLOCK_LABEL[type]}
              </button>
            ))}
          </div>
        )}
      </section>
    </>
  )
}

/** The editor of one lesson: its details, slides and documents, knowledge points and blocks, saved as each part is saved. */
export function LessonEditorPanel({ lessonId }: { lessonId: string }) {
  const lesson = useAdminResource(`lesson|${lessonId}`, (signal) => fetchLesson(lessonId, signal))
  // Keep showing the last loaded lesson while a refresh runs, so the form does not flicker after every write.
  const [shown, setShown] = useState<LessonEditor | null>(null)

  if (lesson.status === 'success' && lesson.data && lesson.data !== shown) setShown(lesson.data)

  const current = lesson.status === 'success' ? lesson.data : shown

  return (
    <>
      <p className="adm-muted">Sửa từng block giữ nguyên mã block. Mọi thay đổi lưu ngay khi bấm lưu.</p>
      {!current && lesson.status === 'loading' ? <AdminLoading label="Đang tải bài học…" /> : null}
      {lesson.status === 'error' ? <AdminError message={lesson.error ?? 'Không tải được bài học.'} onRetry={lesson.reload} /> : null}
      {current ? <LessonEditorBody lesson={current} reload={lesson.reload} /> : null}
    </>
  )
}
