import { useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, BookA, ChevronDown, FileText, Image as ImageIcon, ListChecks, Pencil, Plus, Trash2 } from 'lucide-react'
import { AdminModal } from '../../components/AdminLayer'
import { useAdminConfirm } from '../../lib/useAdminConfirm'
import { MarkdownField } from '../../components/MarkdownField'
import { STATUS_LABEL } from '../../questions/lib/labels'
import {
  addBlock, deleteBlock, reorderBlocks, setLessonKnowledgePoints, updateBlock, updateLesson,
} from '../api/lessonApi'
import { BlockEditor } from '../components/BlockEditor'
import { LessonKnowledgeField } from '../components/LessonKnowledgeField'
import { LessonResourcesEditor } from '../components/LessonResourcesEditor'
import { BLOCK_LABEL } from '../lib/blockLabels'
import { moveId } from '../lib/blockForm'
import { lessonErrorText } from '../lib/lessonErrors'
import { BLOCK_TYPES, type BlockRequest, type BlockType, type LessonBlock, type LessonEditor } from '../types'
import '../../course-drafts/course-drafts.css'
import '../lessons.css'
import { useAdminError, useAdminErrorToast } from '../../lib/useAdminError'

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

const BLOCK_ICON = { TEXT: FileText, ASSET: ImageIcon, VOCABULARY: BookA, EXERCISE: ListChecks } as const

function MetaForm({ lesson, onSaved }: { lesson: LessonEditor; onSaved: () => void }) {
  const [title, setTitle] = useState(lesson.title)
  const [markdown, setMarkdown] = useState(lesson.summaryMarkdown)
  const [minutes, setMinutes] = useState(lesson.estimatedMinutes?.toString() ?? '')
  const [, setError] = useAdminError()
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
      await updateLesson(lesson.id, { title: title.trim(), summary: lesson.summary, summaryMarkdown: markdown, estimatedMinutes: parsed })
      onSaved()
    } catch (reason) {
      setError(lessonErrorText(reason))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form aria-label="Thông tin bài học" className="adm-sec" noValidate onSubmit={(event) => void submit(event)}>
      <div className="adm-sec__head"><h3 className="adm-sec__title">Thông tin bài học</h3></div>
      <div className="ls-grid">
        <label className="adm-field">
          <span>Tiêu đề<span aria-hidden="true" className="adm-required" /></span>
          <input className="adm-input" onChange={(event) => setTitle(event.target.value)} value={title} />
        </label>
        <label className="adm-field">
          <span>Số phút ước tính</span>
          <input className="adm-input" inputMode="numeric" onChange={(event) => setMinutes(event.target.value)} value={minutes} />
        </label>
      </div>
      <MarkdownField label="Tóm tắt chi tiết (Markdown)" onChange={setMarkdown} textareaClassName="adm-textarea ls-textarea" value={markdown} />
      <div className="adm-sec__foot ls-foot">
        <button aria-label="Lưu thông tin" className="adm-btn adm-btn--primary" disabled={saving} type="submit">{saving ? 'Đang lưu…' : 'Lưu'}</button>
      </div>
    </form>
  )
}

function KnowledgePointsPanel({ lesson, onSaved }: { lesson: LessonEditor; onSaved: () => void }) {
  const [ids, setIds] = useState(lesson.knowledgePointIds)
  const [, setError] = useAdminError()
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
    <section aria-label="Knowledge point của bài" className="adm-sec">
      <LessonKnowledgeField onChange={setIds} title="Knowledge point của bài" value={ids} />
      <div className="adm-sec__foot ls-foot">
        <button aria-label="Lưu KP" className="adm-btn adm-btn--primary" disabled={saving} onClick={() => void save()} type="button">{saving ? 'Đang lưu…' : 'Lưu'}</button>
      </div>
    </section>
  )
}

type Editing = { mode: 'new'; blockType: BlockType } | { mode: 'edit'; block: LessonBlock } | null

/** The editor of one lesson: its details, slides and documents, knowledge points and blocks, saved as each part is saved. */
export function LessonEditorPanel({ lesson, reload }: { lesson: LessonEditor; reload: () => void }) {
  const { confirm, confirmDialog } = useAdminConfirm()
  const [editing, setEditing] = useState<Editing>(null)
  // Blocks folded to their header, by id; every block starts open.
  const [folded, setFolded] = useState<ReadonlySet<string>>(new Set())
  const fail = useAdminErrorToast()
  const [busy, setBusy] = useState(false)
  const isDraft = lesson.status === 'DRAFT'
  const exerciseLocked = !isDraft

  async function run(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
    } catch (reason) {
      fail(lessonErrorText(reason))
    } finally {
      setBusy(false)
      reload()
    }
  }

  async function saveBlock(body: BlockRequest) {
    if (editing?.mode === 'edit') await updateBlock(lesson.id, editing.block.id, body)
    else await addBlock(lesson.id, body)
    reload()
  }

  const fold = (id: string) => setFolded((current) => {
    const next = new Set(current)
    if (!next.delete(id)) next.add(id)
    return next
  })

  const moveBlock = (id: string, delta: -1 | 1) =>
    run(() => reorderBlocks(lesson.id, moveId(lesson.blocks.map((block) => block.id), id, delta)))

  const removeBlock = async (block: LessonBlock) => {
    if (!(await confirm({
      title: 'Xóa block này?',
      message: `Xóa block “${BLOCK_LABEL[block.blockType]}”? Tiến độ của học viên ở block này sẽ không còn được tính.`,
      confirmLabel: 'Xóa block',
      tone: 'danger',
    }))) return
    await run(() => deleteBlock(lesson.id, block.id))
  }

  const canTouch = (block: LessonBlock) => block.blockType !== 'EXERCISE' || !exerciseLocked

  return (
    <div className="adm-course-draft-lesson">
      {confirmDialog}
      {exerciseLocked ? <div className="adm-alert" role="note">{EXERCISE_LOCK_NOTE}</div> : null}

      <MetaForm key={`meta-${lesson.title}-${lesson.summary}-${lesson.estimatedMinutes}`} lesson={lesson} onSaved={reload} />
      <LessonResourcesEditor key={lesson.id} lessonId={lesson.id} />
      <KnowledgePointsPanel key={`kp-${lesson.knowledgePointIds.join(',')}`} lesson={lesson} onSaved={reload} />

      <section aria-label="Các block" className="adm-sec">
        <div className="adm-sec__head">
          <h3 className="adm-sec__title">Các block<span className="adm-count">{lesson.blocks.length}</span></h3>
          <div className="adm-sec__tools">
            {lesson.blocks.length > 1 ? <>
              <button className="adm-btn adm-btn--small" onClick={() => setFolded(new Set(lesson.blocks.map((block) => block.id)))} type="button">Thu gọn tất cả</button>
              <button className="adm-btn adm-btn--small" disabled={folded.size === 0} onClick={() => setFolded(new Set())} type="button">Mở tất cả</button>
            </> : null}
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
        </div>
        {lesson.blocks.length === 0 ? <p className="adm-muted">Bài chưa có block nào.</p> : null}
        {lesson.blocks.map((block, index) => {
          const Icon = BLOCK_ICON[block.blockType]
          const open = !folded.has(block.id)
          return (
            <section aria-label={`Block ${index + 1}`} className="adm-bcard" key={block.id}>
              <header className="adm-bcard__head">
                <span aria-hidden="true" className="adm-bcard__icon"><Icon size={16} /></span>
                <h4>
                  <button aria-expanded={open} className="adm-bcard__toggle" onClick={() => fold(block.id)} type="button">
                    <ChevronDown aria-hidden="true" size={16} />Block {index + 1} · {BLOCK_LABEL[block.blockType]}
                  </button>
                </h4>
                <div className="adm-tcard__actions">
                  <button aria-label={`Đưa block ${index + 1} lên`} className="adm-icon-btn" disabled={busy || index === 0} onClick={() => void moveBlock(block.id, -1)} type="button">
                    <ArrowUp aria-hidden="true" size={16} />
                  </button>
                  <button aria-label={`Đưa block ${index + 1} xuống`} className="adm-icon-btn" disabled={busy || index === lesson.blocks.length - 1} onClick={() => void moveBlock(block.id, 1)} type="button">
                    <ArrowDown aria-hidden="true" size={16} />
                  </button>
                  <button
                    aria-label={`Sửa block ${index + 1}`}
                    className="adm-icon-btn"
                    disabled={busy || !canTouch(block)}
                    onClick={() => setEditing({ mode: 'edit', block })}
                    title={canTouch(block) ? undefined : 'Bài đã xuất bản: không đổi được câu hỏi của block bài tập.'}
                    type="button"
                  >
                    <Pencil aria-hidden="true" size={16} />
                  </button>
                  <button
                    aria-label={`Xóa block ${index + 1}`}
                    className="adm-icon-btn adm-icon-btn--danger"
                    disabled={busy || !canTouch(block)}
                    onClick={() => void removeBlock(block)}
                    title={canTouch(block) ? undefined : 'Bài đã xuất bản: không xóa được block bài tập.'}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" size={16} />
                  </button>
                </div>
              </header>
              {open ? (
                <>
                  <p className="ls-block__summary">{blockSummary(block)}</p>
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
                </>
              ) : null}
            </section>
          )
        })}
      </section>

      {editing ? (
        <AdminModal
          description={lesson.title}
          onClose={() => setEditing(null)}
          size="wide"
          stacked
          title={editing.mode === 'edit' ? `Sửa block: ${BLOCK_LABEL[editing.block.blockType]}` : `Thêm block: ${BLOCK_LABEL[editing.blockType]}`}
        >
          {(close) => (
            <BlockEditor
              block={editing.mode === 'edit' ? editing.block : undefined}
              blockType={editing.mode === 'edit' ? editing.block.blockType : editing.blockType}
              key={editing.mode === 'edit' ? editing.block.id : `new-${editing.blockType}`}
              onCancel={close}
              onSave={async (body) => { await saveBlock(body); close() }}
            />
          )}
        </AdminModal>
      ) : null}
    </div>
  )
}
