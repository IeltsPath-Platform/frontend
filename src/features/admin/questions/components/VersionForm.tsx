import { useState, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  MAX_HINT_CHARS,
  PASS_BANDS,
  answerShapeOf,
  buildVersionRequest,
  initialFormState,
  type VersionFormState,
} from '../lib/versionForm'
import { questionErrorText } from '../lib/labels'
import { DIFFICULTIES, type VersionRequest } from '../types'
import { DIFFICULTY_LABEL } from '../lib/labels'
import { KnowledgePointPicker } from './KnowledgePointPicker'

export interface VersionFormProps {
  questionType: string
  nextVersionNumber: number
  onSubmit: (body: VersionRequest) => Promise<void>
  onCancel: () => void
}

/** A new version of a question. The answer fields follow the question type; the version starts as a draft. */
export function VersionForm({ questionType, nextVersionNumber, onSubmit, onCancel }: VersionFormProps) {
  const [form, setForm] = useState<VersionFormState>(() => initialFormState(questionType, nextVersionNumber))
  const [problems, setProblems] = useState<string[]>([])
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const shape = answerShapeOf(questionType)
  const fixedOptions = questionType === 'TRUE_FALSE_NOT_GIVEN'

  const patch = (changes: Partial<VersionFormState>) => setForm((current) => ({ ...current, ...changes }))
  const patchOption = (index: number, changes: Partial<VersionFormState['options'][number]>) =>
    patch({ options: form.options.map((option, position) => (position === index ? { ...option, ...changes } : option)) })

  async function submit(event: FormEvent) {
    event.preventDefault()
    const result = buildVersionRequest(questionType, form)
    if (!result.ok) {
      setProblems(result.problems)
      return
    }
    setProblems([])
    setServerError(null)
    setSaving(true)
    try {
      await onSubmit(result.body)
    } catch (reason) {
      setServerError(questionErrorText(reason))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form aria-label="Phiên bản mới" className="qb-form" noValidate onSubmit={(event) => void submit(event)}>

      {problems.length > 0 ? (
        <div className="adm-alert adm-alert--error" role="alert">
          Chưa lưu được:
          <ul>{problems.map((problem) => <li key={problem}>{problem}</li>)}</ul>
        </div>
      ) : null}
      {serverError ? <div className="adm-alert adm-alert--error" role="alert">{serverError}</div> : null}

      <label className="adm-field">
        <span>Số phiên bản</span>
        <input className="adm-input" min={1} onChange={(event) => patch({ versionNumber: Number(event.target.value) })} type="number" value={form.versionNumber} />
      </label>
      <label className="adm-field">
        <span>Nội dung câu hỏi</span>
        <textarea className="adm-textarea" onChange={(event) => patch({ stem: event.target.value })} value={form.stem} />
      </label>

      {shape === 'CHOICE' ? (
        <fieldset className="qb-options">
          <legend>Các lựa chọn (chọn nút tròn cho đáp án đúng)</legend>
          {form.options.map((option, index) => (
            <div className="qb-option" key={index}>
              <input
                aria-label={`Đáp án đúng là lựa chọn ${index + 1}`}
                checked={option.key !== '' && form.correctKey === option.key}
                disabled={option.key.trim() === ''}
                name="correct"
                onChange={() => patch({ correctKey: option.key })}
                type="radio"
              />
              <input
                aria-label={`Mã lựa chọn ${index + 1}`}
                className="adm-input qb-option__key"
                disabled={fixedOptions}
                onChange={(event) => patchOption(index, { key: event.target.value })}
                value={option.key}
              />
              <input
                aria-label={`Nội dung lựa chọn ${index + 1}`}
                className="adm-input"
                disabled={fixedOptions}
                onChange={(event) => patchOption(index, { content: event.target.value })}
                value={option.content}
              />
              {!fixedOptions && form.options.length > 2 ? (
                <button
                  aria-label={`Xóa lựa chọn ${index + 1}`}
                  className="adm-btn adm-btn--small"
                  onClick={() => patch({ options: form.options.filter((_, position) => position !== index), correctKey: form.correctKey === option.key ? '' : form.correctKey })}
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={14} />
                </button>
              ) : null}
            </div>
          ))}
          {!fixedOptions ? (
            <button className="adm-btn adm-btn--small" onClick={() => patch({ options: [...form.options, { key: '', content: '' }] })} type="button">
              <Plus aria-hidden="true" size={14} /> Thêm lựa chọn
            </button>
          ) : null}
        </fieldset>
      ) : null}

      {shape === 'FILL' ? (
        <>
          <label className="adm-field">
            <span>Đáp án được chấp nhận (mỗi dòng một đáp án)</span>
            <textarea className="adm-textarea" onChange={(event) => patch({ accepted: event.target.value })} value={form.accepted} />
          </label>
          <label className="adm-field">
            <span>Giới hạn số từ (không bắt buộc)</span>
            <input className="adm-input" inputMode="numeric" onChange={(event) => patch({ maxWords: event.target.value })} value={form.maxWords} />
          </label>
        </>
      ) : null}

      {shape === 'ESSAY' ? (
        <>
          <label className="adm-field">
            <span>Dạng bài</span>
            <select className="adm-select" onChange={(event) => patch({ essayTask: event.target.value as 'TASK_1' | 'TASK_2', minWords: event.target.value === 'TASK_1' ? '150' : '250' })} value={form.essayTask}>
              <option value="TASK_2">Task 2</option>
              <option value="TASK_1">Task 1</option>
            </select>
          </label>
          <label className="adm-field">
            <span>Số từ tối thiểu</span>
            <input className="adm-input" inputMode="numeric" onChange={(event) => patch({ minWords: event.target.value })} value={form.minWords} />
          </label>
          <label className="adm-field">
            <span>Band đạt</span>
            <select className="adm-select" onChange={(event) => patch({ passBand: event.target.value })} value={form.passBand}>
              {PASS_BANDS.map((band) => <option key={band} value={String(band)}>{band.toFixed(1)}</option>)}
            </select>
          </label>
          {form.essayTask === 'TASK_1' ? (
            <label className="adm-field">
              <span>Số liệu và đặc điểm chính của biểu đồ (AI chấm đọc phần này thay cho ảnh)</span>
              <textarea className="adm-textarea" onChange={(event) => patch({ chartFacts: event.target.value })} value={form.chartFacts} />
              <small className="adm-muted">Ảnh biểu đồ gắn vào phiên bản bằng API asset, chưa có trong màn này.</small>
            </label>
          ) : null}
        </>
      ) : null}

      {shape === 'NONE' ? (
        <p className="adm-muted">Dạng câu này chưa có đáp án chấm tự động theo hợp đồng hiện tại, nên không cần nhập đáp án.</p>
      ) : null}

      <label className="adm-field">
        <span>Độ khó (bắt buộc để xuất bản)</span>
        <select className="adm-select" onChange={(event) => patch({ difficulty: event.target.value as VersionFormState['difficulty'] })} value={form.difficulty}>
          <option value="">Chưa chọn</option>
          {DIFFICULTIES.map((level) => <option key={level} value={level}>{DIFFICULTY_LABEL[level]}</option>)}
        </select>
      </label>
      <label className="adm-field">
        <span>Giải thích</span>
        <textarea className="adm-textarea" onChange={(event) => patch({ explanation: event.target.value })} value={form.explanation} />
      </label>
      <label className="adm-field">
        <span>Gợi ý (tối đa {MAX_HINT_CHARS} ký tự)</span>
        <textarea className="adm-textarea" onChange={(event) => patch({ hint: event.target.value })} value={form.hint} />
      </label>

      <div className="adm-field">
        <span>Knowledge point liên quan</span>
        <KnowledgePointPicker onChange={(next) => patch({ knowledgePoints: next })} value={form.knowledgePoints} />
      </div>

      <div className="adm-form-footer">
        <button className="adm-btn" disabled={saving} onClick={onCancel} type="button">Hủy</button>
        <button className="adm-btn adm-btn--primary" disabled={saving} type="submit">{saving ? 'Đang lưu…' : 'Lưu bản nháp'}</button>
      </div>
    </form>
  )
}
