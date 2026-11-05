import { useId, useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, BookA, ChevronDown, Eye, FileText, Image as ImageIcon, ListChecks, Pencil, Plus, Trash2 } from 'lucide-react'
import { AdminDrawer } from '../../components/AdminLayer'
import { useAdminConfirm } from '../../lib/useAdminConfirm'
import { MarkdownField } from '../../components/MarkdownField'
import { STATUS_LABEL } from '../../questions/lib/labels'
import {
  addBlock, deleteBlock, reorderBlocks, setLessonKnowledgePoints, updateBlock, updateLesson,
} from '../api/lessonApi'
import { AssetBlockPreview } from '../components/AssetBlockPreview'
import { BlockQuestionDetail } from '../components/BlockQuestionDetail'
import { BlockEditor } from '../components/BlockEditor'
import { LessonKnowledgeField } from '../components/LessonKnowledgeField'
import { LessonResourcesEditor } from '../components/LessonResourcesEditor'
import { VocabularyBlockTable } from './VocabularyBlockTable'
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

const sameIds = (left: readonly string[], right: readonly string[]) => left.length === right.length && left.every((id, index) => id === right[index])

/**
 * The lesson's own fields and its knowledge points, saved together with one button. The slides, documents and blocks
 * below are saved from their own popups, as each one is added or changed.
 */
function InfoForm({ lesson, formId, saving, onSavingChange, onSaved }: {
  lesson: LessonEditor
  /** The Lưu button sits at the foot of the whole editor, outside this form, and submits it through this id. */
  formId: string
  saving: boolean
  onSavingChange: (saving: boolean) => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState(lesson.title)
  const [markdown, setMarkdown] = useState(lesson.summaryMarkdown)
  const [minutes, setMinutes] = useState(lesson.estimatedMinutes?.toString() ?? '')
  const [knowledgePointIds, setKnowledgePointIds] = useState(lesson.knowledgePointIds)
  const [, setError] = useAdminError()

  async function submit(event: FormEvent) {
    event.preventDefault()
    // The knowledge picker draws its own popup in a portal, so a submit from inside it reaches this form too.
    if (event.target !== event.currentTarget || saving) return
    if (!title.trim()) {
      setError('Tiêu đề không được để trống.')
      return
    }
    const parsed = minutes.trim() === '' ? null : Number(minutes)
    if (parsed !== null && (!Number.isInteger(parsed) || parsed <= 0)) {
      setError('Số phút phải là số nguyên dương.')
      return
    }
    onSavingChange(true)
    setError(null)
    try {
      await updateLesson(lesson.id, { title: title.trim(), summary: lesson.summary, summaryMarkdown: markdown, estimatedMinutes: parsed })
    } catch (reason) {
      setError(lessonErrorText(reason))
      onSavingChange(false)
      return
    }
    if (!sameIds(knowledgePointIds, lesson.knowledgePointIds)) {
      try {
        await setLessonKnowledgePoints(lesson.id, knowledgePointIds)
      } catch (reason) {
        // The details are already stored; the chosen points stay on screen so the author can press Lưu again.
        setError(`Đã lưu thông tin bài, chưa lưu được điểm kiến thức. ${lessonErrorText(reason)}`)
        onSavingChange(false)
        return
      }
    }
    onSavingChange(false)
    onSaved()
  }

  return (
    <form aria-label="Thông tin bài học" className="adm-sec" id={formId} noValidate onSubmit={(event) => void submit(event)}>
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
      <section aria-label="Knowledge point của bài">
        <LessonKnowledgeField onChange={setKnowledgePointIds} title="Knowledge point của bài" value={knowledgePointIds} />
      </section>
    </form>
  )
}

type Editing = { mode: 'new'; blockType: BlockType } | { mode: 'edit'; block: LessonBlock } | null

/** The editor of one lesson: its details with their knowledge points (one Lưu, at the foot), then the slides, documents and blocks, each saved from its own popup. */
export function LessonEditorPanel({ lesson, reload, onClose }: { lesson: LessonEditor; reload: () => void; onClose: () => void }) {
  const { confirm, confirmDialog } = useAdminConfirm()
  const infoFormId = useId()
  const [infoSaving, setInfoSaving] = useState(false)
  const [editing, setEditing] = useState<Editing>(null)
  const [viewingQuestion, setViewingQuestion] = useState<{ questionId: string; questionVersionId: string } | null>(null)
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

      <InfoForm formId={infoFormId} key={`info-${lesson.title}-${lesson.summary}-${lesson.estimatedMinutes}-${lesson.knowledgePointIds.join(',')}`} lesson={lesson} onSaved={reload} onSavingChange={setInfoSaving} saving={infoSaving} />
      <LessonResourcesEditor key={lesson.id} lessonId={lesson.id} />

      {lesson.blocks.some((block) => block.blockType === 'VOCABULARY') ? lesson.blocks.map((block, index) => (
        block.blockType === 'VOCABULARY'
          ? <VocabularyBlockTable block={block} key={block.id} lessonId={lesson.id} number={index + 1} onChanged={reload} />
          : null
      )) : <VocabularyBlockTable lessonId={lesson.id} onChanged={reload} />}

      <section aria-label="Các block" className="adm-sec">
        <div className="adm-sec__head">
          <h3 className="adm-sec__title">Các block<span className="adm-count">{lesson.blocks.length}</span></h3>
          <div className="adm-sec__tools">
            {/* Asset blocks are no longer created here: they pointed at a pasted asset id. Existing ones still show and can be removed. */}
            {BLOCK_TYPES.filter((type) => type !== 'VOCABULARY' && type !== 'ASSET').map((type) => (
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
                    disabled={busy || !canTouch(block) || block.blockType === 'ASSET'}
                    onClick={() => setEditing({ mode: 'edit', block })}
                    title={block.blockType === 'ASSET' ? 'Tài nguyên không có gì để sửa: xem nội dung ngay trong block.' : canTouch(block) ? undefined : 'Bài đã xuất bản: không đổi được câu hỏi của block bài tập.'}
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
                  {block.blockType === 'ASSET'
                    ? <AssetBlockPreview assetId={block.assetId} />
                    : <p className="ls-block__summary">{blockSummary(block)}</p>}
                  {block.blockType === 'EXERCISE' && exerciseLocked
                    ? <p className="ls-block__locked">Bài đã xuất bản nên không sửa hay xóa được block bài tập (học viên đã có tiến độ theo block).</p>
                    : null}
                  {block.blockType === 'EXERCISE' && block.questions.length > 0 ? (
                    <ul className="ls-block__questions">
                      {block.questions.map((question) => (
                        <li key={question.questionVersionId}>
                          {question.stem ?? `Phiên bản ${question.questionVersionId.slice(0, 8)}`}{' '}
                          {question.status && question.status !== 'PUBLISHED' ? <span className="adm-badge adm-badge--warn">{STATUS_LABEL[question.status] ?? question.status}</span> : null}
                          {question.questionId ? (
                            <button
                              aria-label={`Xem chi tiết câu hỏi: ${question.stem ?? question.questionVersionId.slice(0, 8)}`}
                              className="adm-icon-btn"
                              onClick={() => setViewingQuestion({ questionId: question.questionId as string, questionVersionId: question.questionVersionId })}
                              type="button"
                            >
                              <Eye aria-hidden="true" size={16} />
                            </button>
                          ) : null}
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

      {viewingQuestion ? <BlockQuestionDetail {...viewingQuestion} onClose={() => setViewingQuestion(null)} /> : null}

      {editing ? (
        <AdminDrawer
          description={lesson.title}
          onClose={() => setEditing(null)}
          size="lg"
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
        </AdminDrawer>
      ) : null}

      {/* The one Lưu of the editor: it stays at the foot of the popup while the long editor scrolls, and saves the lesson information above. */}
      <div className="adm-form-footer">
        <button className="adm-btn" onClick={onClose} type="button">Đóng</button>
        <button aria-label="Lưu thông tin" className="adm-btn adm-btn--primary" disabled={infoSaving} form={infoFormId} type="submit">{infoSaving ? 'Đang lưu…' : 'Lưu'}</button>
      </div>
    </div>
  )
}
