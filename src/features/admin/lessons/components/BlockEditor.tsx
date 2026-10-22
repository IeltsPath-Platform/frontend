import { useState, type FormEvent } from 'react'
import { KnowledgePointPicker } from '../../questions/components/KnowledgePointPicker'
import { buildBlockRequest, initialBlockState, type BlockFormState } from '../lib/blockForm'
import { BLOCK_LABEL } from '../lib/blockLabels'
import { lessonErrorText } from '../lib/lessonErrors'
import type { BlockRequest, BlockType, LessonBlock } from '../types'
import { QuestionChooser } from './QuestionChooser'
import { VocabularySensePicker } from './VocabularySensePicker'

export interface BlockEditorProps {
  blockType: BlockType
  /** Present when editing an existing block; its id stays the same. */
  block?: LessonBlock
  onSave: (body: BlockRequest) => Promise<void>
  onCancel: () => void
}

export function BlockEditor({ blockType, block, onSave, onCancel }: BlockEditorProps) {
  const [state, setState] = useState<BlockFormState>(() => initialBlockState(blockType, block))
  const [problems, setProblems] = useState<string[]>([])
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const patch = (changes: Partial<BlockFormState>) => setState((current) => ({ ...current, ...changes }))

  async function submit(event: FormEvent) {
    event.preventDefault()
    const result = buildBlockRequest(state)
    if (!result.ok) {
      setProblems(result.problems)
      return
    }
    setProblems([])
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
    <form aria-label={`${block ? 'Sửa' : 'Thêm'} block ${BLOCK_LABEL[blockType]}`} className="adm-card ls-block-form" noValidate onSubmit={(event) => void submit(event)}>
      <h3>{block ? 'Sửa' : 'Thêm'} block: {BLOCK_LABEL[blockType]}</h3>
      {problems.length > 0 ? (
        <div className="adm-alert adm-alert--error" role="alert">
          <ul>{problems.map((problem) => <li key={problem}>{problem}</li>)}</ul>
        </div>
      ) : null}
      {serverError ? <div className="adm-alert adm-alert--error" role="alert">{serverError}</div> : null}

      {blockType === 'TEXT' ? (
        <>
          <label className="adm-field">
            <span>Nội dung (Markdown)</span>
            <textarea className="adm-textarea ls-textarea" onChange={(event) => patch({ textContent: event.target.value })} value={state.textContent} />
          </label>
          <div className="adm-field">
            <span>Knowledge point mà block này dạy</span>
            <KnowledgePointPicker
              onChange={(next) => patch({ knowledgePointIds: next.map((item) => item.knowledgePointId) })}
              value={state.knowledgePointIds.map((knowledgePointId) => ({ knowledgePointId, weight: 1 }))}
            />
          </div>
        </>
      ) : null}

      {blockType === 'ASSET' ? (
        <label className="adm-field">
          <span>Mã asset (UUID)</span>
          <input className="adm-input" onChange={(event) => patch({ assetId: event.target.value })} value={state.assetId} />
          <small className="adm-muted">Asset được tạo ở API asset (`POST /api/content/assets`); màn này chưa tạo asset.</small>
        </label>
      ) : null}

      {blockType === 'VOCABULARY' ? (
        <VocabularySensePicker onChange={(senseIds) => patch({ senseIds })} value={state.senseIds} />
      ) : null}

      {blockType === 'EXERCISE' ? (
        <QuestionChooser known={block?.questions ?? []} onChange={(questionVersionIds) => patch({ questionVersionIds })} value={state.questionVersionIds} />
      ) : null}

      <div className="qb-form__actions">
        <button className="adm-btn adm-btn--primary" disabled={saving} type="submit">{saving ? 'Đang lưu…' : 'Lưu block'}</button>
        <button className="adm-btn" disabled={saving} onClick={onCancel} type="button">Hủy</button>
      </div>
    </form>
  )
}
