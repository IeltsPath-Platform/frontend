import { useState } from 'react'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { adminErrorMessage } from '../../lib/adminErrors'
import { useAdminResource } from '../../lib/useAdminResource'
import { getQuestion, listQuestions } from '../../questions/api/questionApi'
import { SKILL_LABEL, TYPE_LABEL } from '../../questions/lib/labels'
import { SKILLS } from '../../questions/types'
import type { LessonBlock } from '../types'

export interface QuestionChooserProps {
  value: string[]
  onChange: (next: string[]) => void
  /** The questions the block already has, so their text can be shown without another call. */
  known: LessonBlock['questions']
}

/** Chooses the questions of an exercise block from the published learning questions of the bank. */
export function QuestionChooser({ value, onChange, known }: QuestionChooserProps) {
  const [skill, setSkill] = useState('')
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [previewError, setPreviewError] = useState<string | null>(null)
  const list = useAdminResource(`exercise-questions|${skill}`, (signal) =>
    listQuestions({ status: 'PUBLISHED', purpose: 'LEARNING', skill, size: 100 }, signal))

  async function preview(questionId: string) {
    setPreviewError(null)
    try {
      const detail = await getQuestion(questionId)
      const current = detail.versions?.find((version) => version.id === detail.currentPublishedVersionId)
      setPreviews((existing) => ({ ...existing, [questionId]: current?.stem ?? '(không có nội dung)' }))
    } catch (reason) {
      setPreviewError(adminErrorMessage(reason))
    }
  }

  const knownByVersion = new Map(known.map((question) => [question.questionVersionId, question]))
  const questions = list.data?.content ?? []
  const versionLabels = new Map<string, string>()
  for (const question of questions) {
    if (question.currentPublishedVersionId) {
      versionLabels.set(question.currentPublishedVersionId, `${TYPE_LABEL[question.questionType] ?? question.questionType} · ${question.id.slice(0, 8)}`)
    }
  }

  function toggle(versionId: string, checked: boolean) {
    onChange(checked ? [...value, versionId] : value.filter((id) => id !== versionId))
  }

  return (
    <div className="ls-questions">
      <h4>Câu hỏi đã chọn ({value.length})</h4>
      {value.length === 0 ? <p className="adm-muted">Chưa chọn câu hỏi nào.</p> : null}
      <ol>
        {value.map((versionId) => {
          const existing = knownByVersion.get(versionId)
          return (
            <li key={versionId}>
              {existing?.stem ?? versionLabels.get(versionId) ?? `Phiên bản ${versionId.slice(0, 8)}`}
              <button className="adm-btn adm-btn--small" onClick={() => toggle(versionId, false)} type="button">Bỏ</button>
            </li>
          )
        })}
      </ol>

      <label className="adm-field">
        <span>Lọc kỹ năng</span>
        <select className="adm-select" onChange={(event) => setSkill(event.target.value)} value={skill}>
          <option value="">Tất cả</option>
          {SKILLS.map((item) => <option key={item} value={item}>{SKILL_LABEL[item]}</option>)}
        </select>
      </label>

      {list.status === 'loading' ? <AdminLoading label="Đang tải câu hỏi đã xuất bản…" /> : null}
      {list.status === 'error' ? <AdminError message={list.error ?? 'Không tải được câu hỏi.'} onRetry={list.reload} /> : null}
      {previewError ? <div className="adm-alert adm-alert--error" role="alert">{previewError}</div> : null}
      {list.status === 'success' && questions.length === 0 ? (
        <p className="adm-muted">Chưa có câu hỏi đã xuất bản dành cho bài học. Xuất bản câu hỏi ở mục Ngân hàng câu hỏi trước.</p>
      ) : null}
      <ul className="ls-questions__list">
        {questions.filter((question) => question.currentPublishedVersionId).map((question) => {
          const versionId = question.currentPublishedVersionId as string
          return (
            <li key={question.id}>
              <label className="adm-check">
                <input checked={value.includes(versionId)} onChange={(event) => toggle(versionId, event.target.checked)} type="checkbox" />
                <span>
                  {TYPE_LABEL[question.questionType] ?? question.questionType}
                  {question.skill ? ` · ${SKILL_LABEL[question.skill] ?? question.skill}` : ''} · <code>{question.id.slice(0, 8)}</code>
                </span>
              </label>
              {previews[question.id] ? (
                <p className="ls-questions__stem">{previews[question.id]}</p>
              ) : (
                <button className="adm-btn adm-btn--small" onClick={() => void preview(question.id)} type="button">Xem nội dung</button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
