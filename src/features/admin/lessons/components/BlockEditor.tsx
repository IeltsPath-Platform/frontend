import { useState, type FormEvent } from 'react'
import { useAuthSession } from '@/features/auth/authSession'
import { hasAnyRole } from '@/features/auth/staffRoles'
import { buildBlockRequest, initialBlockState, type BlockFormState } from '../lib/blockForm'
import { BLOCK_LABEL } from '../lib/blockLabels'
import { lessonErrorText } from '../lib/lessonErrors'
import type { BlockRequest, BlockType, LessonBlock } from '../types'
import { MarkdownField } from '../../components/MarkdownField'
import { LessonKnowledgeField } from './LessonKnowledgeField'
import { QuestionChooser } from './QuestionChooser'
import { VocabularySensePicker } from './VocabularySensePicker'
import { useAdminError, useAdminErrorToast } from '../../lib/useAdminError'

export interface BlockEditorProps {
  blockType: BlockType
  /** Present when editing an existing block; its id stays the same. */
  block?: LessonBlock
  onSave: (body: BlockRequest) => Promise<void>
  onCancel: () => void
}

export function BlockEditor({ blockType, block, onSave, onCancel }: BlockEditorProps) {
  const [state, setState] = useState<BlockFormState>(() => initialBlockState(blockType, block))
  const { roles } = useAuthSession()
  const canCreateWords = hasAnyRole(roles, ['CONTENT_AUTHOR'])
  const [, setServerError] = useAdminError()
  const fail = useAdminErrorToast()
  const [saving, setSaving] = useState(false)
  const patch = (changes: Partial<BlockFormState>) => setState((current) => ({ ...current, ...changes }))

  async function submit(event: FormEvent) {
    event.preventDefault()
    const result = buildBlockRequest(state)
    if (!result.ok) {
      fail(result.problems.join('\n'))
      return
    }
    setServerError(null)
    setSaving(true)
    try {
      await onSave(result.body)
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
          <LessonKnowledgeField onChange={(knowledgePointIds) => patch({ knowledgePointIds })} title="Knowledge point mà block này dạy" value={state.knowledgePointIds} />
        </>
      ) : null}

      {blockType === 'ASSET' ? (
        <label className="adm-field">
          <span>Mã asset (UUID)</span>
          <input className="adm-input" onChange={(event) => patch({ assetId: event.target.value })} value={state.assetId} />
        </label>
      ) : null}

      {blockType === 'VOCABULARY' ? (
        <VocabularySensePicker canCreate={canCreateWords} onChange={(senseIds) => patch({ senseIds })} value={state.senseIds} />
      ) : null}

      {blockType === 'EXERCISE' ? (
        <QuestionChooser known={block?.questions ?? []} onChange={(questionVersionIds) => patch({ questionVersionIds })} value={state.questionVersionIds} />
      ) : null}

      <div className="adm-form-footer">
        <button className="adm-btn" disabled={saving} onClick={onCancel} type="button">Đóng</button>
        <button className="adm-btn adm-btn--primary" disabled={saving} type="submit">{saving ? 'Đang lưu…' : 'Lưu'}</button>
      </div>
    </form>
  )
}
