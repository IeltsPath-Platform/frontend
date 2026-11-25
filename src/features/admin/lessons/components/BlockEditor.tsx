import { useState, type FormEvent } from 'react'
import { useAuthSession } from '@/features/auth/authSession'
import { hasAnyRole } from '@/features/auth/staffRoles'
import { buildBlockRequest, initialBlockState, type BlockFormState } from '../lib/blockForm'
import { BLOCK_LABEL } from '../lib/blockLabels'
import { lessonErrorText } from '../lib/lessonErrors'
import type { BlockRequest, BlockType, LessonBlock } from '../types'
import { AdminField } from '../../components/AdminField'
import { MarkdownField } from '../../components/MarkdownField'
import { QuestionChooser } from './QuestionChooser'
import { VocabularySensePicker } from './VocabularySensePicker'
import { useAdminError } from '../../lib/useAdminError'

export interface BlockEditorProps {
  blockType: BlockType
  /** Present when editing an existing block; its id stays the same. */
  block?: LessonBlock
  onSave: (body: BlockRequest) => Promise<void>
  onCancel: () => void
  /** The skill of the topic the lesson is in: the question picker opens on it. */
  skill?: string | null
  lessonKnowledgePointIds?: string[]
}

export function BlockEditor({ blockType, block, onSave, onCancel, skill, lessonKnowledgePointIds }: BlockEditorProps) {
  const [state, setState] = useState<BlockFormState>(() => initialBlockState(blockType, block))
  const { roles } = useAuthSession()
  const canCreateWords = hasAnyRole(roles, ['CONTENT_AUTHOR'])
  const [, setServerError] = useAdminError()
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const patch = (changes: Partial<BlockFormState>) => setState((current) => ({ ...current, ...changes }))
  // What is wrong with the block, if anything: one message, under the content of this kind of block, after a send attempt.
  const built = buildBlockRequest(state)
  const problem = submitted && !built.ok ? built.problems[0] : undefined
  const problemText = problem ? <p className="adm-field__error" role="alert">{problem}</p> : null

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    const result = built
    if (!result.ok) return
    setServerError(null)
    setSaving(true)
    try {
      await onSave({ ...result.body, ...(blockType === 'EXERCISE' && block ? { expectedQuestionVersionIds: block.questions.map((question) => question.questionVersionId) } : {}) })
    } catch (reason) {
      setServerError(lessonErrorText(reason))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form aria-label={`${block ? 'Sửa' : 'Thêm'} block ${BLOCK_LABEL[blockType]}`} noValidate onSubmit={(event) => void submit(event)}>

      {blockType === 'TEXT' ? (
        <>
          <MarkdownField label="Nội dung (Markdown)" onChange={(textContent) => patch({ textContent })} textareaClassName="adm-textarea ls-textarea" value={state.textContent} />
          {problemText}
          {/* The knowledge points of a text block are not edited here for now; a block that already has some keeps them, since the form state carries them back on save. */}
        </>
      ) : null}

      {blockType === 'ASSET' ? (
        <AdminField label="Mã asset (UUID)" error={problem} required>
          <input className="adm-input" onChange={(event) => patch({ assetId: event.target.value })} value={state.assetId} />
        </AdminField>
      ) : null}

      {blockType === 'VOCABULARY' ? (
        <>
          <VocabularySensePicker canCreate={canCreateWords} onChange={(senseIds) => patch({ senseIds })} value={state.senseIds} />
          {problemText}
        </>
      ) : null}

      {blockType === 'EXERCISE' ? (
        <>
          <QuestionChooser blockId={block?.id} defaultSkill={skill} includeOwnershipPreview known={block?.questions ?? []} lessonKnowledgePointIds={lessonKnowledgePointIds} onChange={(questionVersionIds) => patch({ questionVersionIds })} value={state.questionVersionIds} />
          {problemText}
        </>
      ) : null}

      <div className="adm-form-footer">
        <button className="adm-btn" disabled={saving} onClick={onCancel} type="button">Đóng</button>
        <button className="adm-btn adm-btn--primary" disabled={saving} type="submit">{saving ? 'Đang lưu…' : 'Lưu'}</button>
      </div>
    </form>
  )
}
