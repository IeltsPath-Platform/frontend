import { useState, type FormEvent } from 'react'
import { z } from 'zod'
import { AdminField } from '@/features/admin/components/AdminField'
import { requiredChoice, requiredText } from '@/lib/validation/fields'
import { useFormErrors } from '@/lib/validation/useFormErrors'
import { ERROR_CATEGORY_LABEL } from '@/features/admin/error-types/lib/errorTypeLabels'
import type { ErrorType } from '@/features/admin/error-types/types'
import { buildAnnotation, EXCERPT_MAX, SUGGESTION_MAX, type Range } from '../lib/annotations'
import type { Annotation } from '../types'

const errorFormSchema = z.object({
  excerpt: requiredText('Đoạn có lỗi', EXCERPT_MAX),
  code: requiredChoice('loại lỗi'),
  suggestion: requiredText('Gợi ý sửa', SUGGESTION_MAX),
})

/**
 * Marks one error: the quoted text (taken from the selection, or typed or pasted), what kind of error it is, and the
 * examiner's own correction. The kind of error is chosen from the error-type catalogue, never typed.
 */
export function ErrorForm({ essay, annotations, errorTypes, selection, onAdd }: {
  essay: string
  annotations: readonly Annotation[]
  errorTypes: readonly ErrorType[]
  selection: Range | null
  onAdd: (annotation: Annotation) => void
}) {
  const selected = selection ? essay.slice(selection.start, selection.end) : ''
  const [excerpt, setExcerpt] = useState(selected)
  const [category, setCategory] = useState('')
  const [code, setCode] = useState('')
  const [suggestion, setSuggestion] = useState('')
  /** What the essay says against the quoted text (not found, already marked); it belongs under the excerpt. */
  const [excerptProblem, setExcerptProblem] = useState<string | null>(null)
  const form = useFormErrors(errorFormSchema, { excerpt, code, suggestion })

  const categories = [...new Set(errorTypes.map((type) => type.category))]
  const options = category ? errorTypes.filter((type) => type.category === category) : errorTypes
  const chosen = errorTypes.find((type) => type.code === code)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!form.validate()) return
    const useSelection = selection !== null && excerpt === selected
    const result = buildAnnotation(essay, annotations, { excerpt, start: useSelection ? selection.start : null, errorCode: code, suggestion })
    if (!result.ok) { setExcerptProblem(result.message); return }
    onAdd(result.annotation)
    setExcerpt('')
    setSuggestion('')
    setExcerptProblem(null)
    form.reset()
  }

  return (
    <form aria-label="Ghi nhận lỗi" className="adm-eg-error-form" noValidate onSubmit={submit}>
      <AdminField label="Đoạn có lỗi (bôi đen trong bài, hoặc dán vào đây)" {...form.field('excerpt')} error={form.field('excerpt').error ?? excerptProblem ?? undefined}>
        <input className="adm-input" maxLength={EXCERPT_MAX} onChange={(event) => { setExcerpt(event.target.value); setExcerptProblem(null) }} value={excerpt} />
      </AdminField>
      <div className="adm-eg-row">
        <label className="adm-field">
          <span>Nhóm lỗi</span>
          <select className="adm-select" onChange={(event) => { setCategory(event.target.value); setCode('') }} value={category}>
            <option value="">Tất cả nhóm</option>
            {categories.map((value) => <option key={value} value={value}>{ERROR_CATEGORY_LABEL[value]}</option>)}
          </select>
        </label>
        <AdminField label="Loại lỗi" {...form.field('code')}>
          <select className="adm-select" onChange={(event) => setCode(event.target.value)} value={code}>
            <option value="">Chọn loại lỗi</option>
            {options.map((type) => <option key={type.code} value={type.code}>{type.name} · {type.code}</option>)}
          </select>
        </AdminField>
      </div>
      {chosen?.fixHint ? <p className="adm-muted">{chosen.fixHint}</p> : null}
      <AdminField label="Gợi ý sửa" {...form.field('suggestion')}>
        <input className="adm-input" maxLength={SUGGESTION_MAX} onChange={(event) => setSuggestion(event.target.value)} value={suggestion} />
      </AdminField>
      <button className="adm-btn adm-btn--primary" type="submit">Thêm lỗi</button>
    </form>
  )
}
