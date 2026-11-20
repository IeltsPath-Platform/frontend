import { Fragment, useMemo, useState, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { z } from 'zod'
import { AdminField } from '../../components/AdminField'
import { positiveIntegerText, requiredText } from '@/lib/validation/fields'
import { useFormErrors } from '@/lib/validation/useFormErrors'
import {
  MAX_CHART_FACTS_CHARS,
  MAX_HINT_CHARS,
  PASS_BANDS,
  answerShapeOf,
  buildVersionRequest,
  type AnswerShape,
  initialFormState,
  type VersionFormState,
} from '../lib/versionForm'
import { questionErrorText } from '../lib/labels'
import { DIFFICULTIES, type VersionRequest } from '../types'
import { DIFFICULTY_LABEL } from '../lib/labels'
import { KnowledgePointPicker } from './KnowledgePointPicker'
import { useAdminError } from '../../lib/useAdminError'

/**
 * What the author must fill in for the answer shape. An unused option row (no content) is simply left out; the used
 * rows need a key each, different from the others, at least two of them, and one of them marked correct. The option
 * fields are named `o<i>_key` and `o<i>_content`; the group messages sit on `options` and `correctKey`.
 */
function versionSchema(shape: AnswerShape, optionCount: number, essayTask: 'TASK_1' | 'TASK_2') {
  const fields: Record<string, z.ZodType> = {
    versionNumber: positiveIntegerText('Số phiên bản'),
    stem: requiredText('Nội dung câu hỏi', 50000),
    hint: z.string().max(MAX_HINT_CHARS, `Gợi ý tối đa ${MAX_HINT_CHARS} ký tự.`),
    options: z.unknown(),
    correctKey: z.string(),
    accepted: z.string(),
    maxWords: z.string(),
    minWords: z.string(),
    passBand: z.string(),
    chartFacts: z.string(),
  }
  for (let i = 0; i < optionCount; i += 1) { fields[`o${i}_key`] = z.string(); fields[`o${i}_content`] = z.string() }
  if (shape === 'FILL') {
    fields.accepted = z.string({ error: 'Nhập ít nhất một đáp án được chấp nhận.' }).refine((value) => value.split('\n').some((line) => line.trim() !== ''), 'Nhập ít nhất một đáp án được chấp nhận.')
    fields.maxWords = positiveIntegerText('Giới hạn số từ', { optional: true })
  }
  if (shape === 'ESSAY') {
    fields.minWords = positiveIntegerText('Số từ tối thiểu')
    fields.passBand = z.string().refine((value) => { const band = Number(value); return value.trim() !== '' && band >= 4 && band <= 9 && Number.isInteger(band * 2) }, 'Band đạt phải từ 4,0 đến 9,0, mỗi bước 0,5.')
    if (essayTask === 'TASK_1') fields.chartFacts = requiredText('Số liệu biểu đồ', MAX_CHART_FACTS_CHARS)
  }
  return z.object(fields).superRefine((values, ctx) => {
    if (shape !== 'CHOICE') return
    const used: Array<{ index: number; key: string }> = []
    for (let i = 0; i < optionCount; i += 1) {
      if (String(values[`o${i}_content`] ?? '').trim() === '') continue
      const key = String(values[`o${i}_key`] ?? '').trim()
      used.push({ index: i, key })
      if (key === '') ctx.addIssue({ code: 'custom', path: [`o${i}_key`], message: `Mã lựa chọn ${i + 1} không được để trống.` })
    }
    used.forEach(({ index, key }, position) => {
      if (key !== '' && used.findIndex((other) => other.key === key) !== position) ctx.addIssue({ code: 'custom', path: [`o${index}_key`], message: `Mã lựa chọn ${index + 1} bị trùng.` })
    })
    if (used.length < 2) ctx.addIssue({ code: 'custom', path: ['options'], message: 'Nhập nội dung cho ít nhất 2 lựa chọn.' })
    if (!used.some((option) => option.key === String(values.correctKey ?? '').trim())) ctx.addIssue({ code: 'custom', path: ['correctKey'], message: 'Chọn đáp án đúng trong các lựa chọn.' })
  })
}

export interface VersionFormProps {
  questionType: string
  nextVersionNumber: number
  onSubmit: (body: VersionRequest) => Promise<void>
  onCancel: () => void
  /** Starts the form from an existing version instead of an empty one. */
  initialState?: VersionFormState
}

/** A new version of a question. The answer fields follow the question type; the version starts as a draft. */
export function VersionForm({ questionType, nextVersionNumber, onSubmit, onCancel, initialState }: VersionFormProps) {
  const [form, setForm] = useState<VersionFormState>(() => initialState ?? initialFormState(questionType, nextVersionNumber))
  const [, setServerError] = useAdminError()
  const [saving, setSaving] = useState(false)
  const shape = answerShapeOf(questionType)
  const fixedOptions = questionType === 'TRUE_FALSE_NOT_GIVEN'
  const schema = useMemo(() => versionSchema(shape, form.options.length, form.essayTask), [shape, form.options.length, form.essayTask])
  const errors = useFormErrors(schema, {
    versionNumber: String(form.versionNumber), stem: form.stem, hint: form.hint, correctKey: form.correctKey,
    accepted: form.accepted, maxWords: form.maxWords, minWords: form.minWords, passBand: form.passBand, chartFacts: form.chartFacts,
    options: form.options,
    ...Object.fromEntries(form.options.flatMap((option, index) => [[`o${index}_key`, option.key], [`o${index}_content`, option.content]])),
  })
  const optionsError = errors.field('options').error
  const correctError = errors.field('correctKey').error

  const patch = (changes: Partial<VersionFormState>) => setForm((current) => ({ ...current, ...changes }))
  const patchOption = (index: number, changes: Partial<VersionFormState['options'][number]>) =>
    patch({ options: form.options.map((option, position) => (position === index ? { ...option, ...changes } : option)) })

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!errors.validate()) return
    const result = buildVersionRequest(questionType, form)
    if (!result.ok) return
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


      <AdminField label="Số phiên bản" {...errors.field('versionNumber')}>
        <input className="adm-input" min={1} onChange={(event) => patch({ versionNumber: Number(event.target.value) })} type="number" value={form.versionNumber} />
      </AdminField>
      <AdminField label="Nội dung câu hỏi" {...errors.field('stem')}>
        <textarea className="adm-textarea" onChange={(event) => patch({ stem: event.target.value })} value={form.stem} />
      </AdminField>

      {shape === 'CHOICE' ? (
        <fieldset className="qb-options">
          <legend>Các lựa chọn (chọn nút tròn cho đáp án đúng)</legend>
          {form.options.map((option, index) => (
            <Fragment key={index}>
            <div className="qb-option">
              <input
                aria-label={`Đáp án đúng là lựa chọn ${index + 1}`}
                checked={option.key !== '' && form.correctKey === option.key}
                disabled={option.key.trim() === ''}
                name="correct"
                onChange={() => patch({ correctKey: option.key })}
                type="radio"
              />
              <input
                aria-invalid={errors.field(`o${index}_key`).error ? true : undefined}
                aria-label={`Mã lựa chọn ${index + 1}`}
                onBlur={errors.field(`o${index}_key`).onTouch}
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
            {errors.field(`o${index}_key`).error ? <p className="adm-field__error" role="alert">{errors.field(`o${index}_key`).error}</p> : null}
            </Fragment>
          ))}
          {!fixedOptions ? (
            <button className="adm-btn adm-btn--small" onClick={() => patch({ options: [...form.options, { key: '', content: '' }] })} type="button">
              <Plus aria-hidden="true" size={14} /> Thêm lựa chọn
            </button>
          ) : null}
          {optionsError ? <p className="adm-field__error" role="alert">{optionsError}</p> : null}
          {correctError ? <p className="adm-field__error" role="alert">{correctError}</p> : null}
        </fieldset>
      ) : null}

      {shape === 'FILL' ? (
        <>
          <AdminField label="Đáp án được chấp nhận (mỗi dòng một đáp án)" {...errors.field('accepted')}>
            <textarea className="adm-textarea" onChange={(event) => patch({ accepted: event.target.value })} value={form.accepted} />
          </AdminField>
          <AdminField label="Giới hạn số từ (không bắt buộc)" {...errors.field('maxWords')}>
            <input className="adm-input" inputMode="numeric" onChange={(event) => patch({ maxWords: event.target.value })} value={form.maxWords} />
          </AdminField>
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
          <AdminField label="Số từ tối thiểu" {...errors.field('minWords')}>
            <input className="adm-input" inputMode="numeric" onChange={(event) => patch({ minWords: event.target.value })} value={form.minWords} />
          </AdminField>
          <label className="adm-field">
            <span>Band đạt</span>
            <select className="adm-select" onChange={(event) => patch({ passBand: event.target.value })} value={form.passBand}>
              {PASS_BANDS.map((band) => <option key={band} value={String(band)}>{band.toFixed(1)}</option>)}
            </select>
          </label>
          {form.essayTask === 'TASK_1' ? (
            <AdminField label="Số liệu và đặc điểm chính của biểu đồ (AI chấm đọc phần này thay cho ảnh)" {...errors.field('chartFacts')}>
              <textarea className="adm-textarea" onChange={(event) => patch({ chartFacts: event.target.value })} value={form.chartFacts} />
            </AdminField>
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
      <AdminField label={`Gợi ý (tối đa ${MAX_HINT_CHARS} ký tự)`} {...errors.field('hint')}>
        <textarea className="adm-textarea" onChange={(event) => patch({ hint: event.target.value })} value={form.hint} />
      </AdminField>

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
