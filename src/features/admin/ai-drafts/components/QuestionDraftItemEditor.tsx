import { useMemo, useState, type FormEvent } from 'react'
import { Save, X } from 'lucide-react'
import { z } from 'zod'
import { AdminField } from '../../components/AdminField'
import { requiredText } from '@/lib/validation/fields'
import { useFormErrors } from '@/lib/validation/useFormErrors'
import { questionDraftItemPatchSchema, type QuestionDraftItem, type QuestionDraftItemPatch } from '../types'
import { useAdminError } from '../../lib/useAdminError'

/**
 * The stem and the explanation always; a choice question also needs a key and a content for each option (the keys must
 * differ) and a correct one; a fill question needs at least one accepted answer. The option fields are named `o<i>_key`
 * and `o<i>_content`.
 */
function itemSchema(choice: boolean, optionCount: number) {
  const shape: Record<string, z.ZodType> = {
    stem: requiredText('Nội dung câu hỏi', 4000),
    explanation: requiredText('Giải thích', 4000),
    correct: z.string(),
    accepted: z.string(),
  }
  if (choice) {
    for (let i = 0; i < optionCount; i += 1) {
      shape[`o${i}_key`] = requiredText(`Mã lựa chọn ${i + 1}`, 100)
      shape[`o${i}_content`] = requiredText(`Nội dung lựa chọn ${i + 1}`, 4000)
    }
    shape.correct = z.string({ error: 'Chọn đáp án đúng.' }).min(1, 'Chọn đáp án đúng.')
  } else {
    shape.accepted = z.string({ error: 'Nhập ít nhất một đáp án được chấp nhận.' }).refine((value) => value.split('\n').some((line) => line.trim() !== ''), 'Nhập ít nhất một đáp án được chấp nhận.')
  }
  return z.object(shape).superRefine((values, ctx) => {
    if (!choice) return
    const keys = Array.from({ length: optionCount }, (_, i) => String(values[`o${i}_key`] ?? ''))
    keys.forEach((key, i) => {
      if (key !== '' && keys.indexOf(key) !== i) ctx.addIssue({ code: 'custom', path: [`o${i}_key`], message: `Mã lựa chọn ${i + 1} bị trùng.` })
    })
    const correct = String(values.correct ?? '')
    if (correct !== '' && !keys.includes(correct)) ctx.addIssue({ code: 'custom', path: ['correct'], message: 'Chọn đáp án đúng trong các lựa chọn.' })
  })
}

/** The form of one generated question, opened in a drawer. A save that succeeds closes the drawer through its owner. */
export function QuestionDraftItemEditor({ item, index, disabled, onSave, onCancel }: {
  item: QuestionDraftItem; index: number; disabled: boolean
  onSave: (body: QuestionDraftItemPatch) => Promise<boolean>; onCancel: () => void
}) {
  const [stem, setStem] = useState(item.stem)
  const [explanation, setExplanation] = useState(item.explanation)
  const [options, setOptions] = useState(() => [...item.options].sort((a, b) => a.sortOrder - b.sortOrder).map((option) => ({
    optionKey: option.optionKey, content: option.content,
    errorCode: item.answerSpec.type === 'CHOICE' ? item.answerSpec.distractors?.[option.optionKey] ?? '' : '',
  })))
  const [correct, setCorrect] = useState(item.answerSpec.type === 'CHOICE' ? item.answerSpec.correct : '')
  const [accepted, setAccepted] = useState(item.answerSpec.type === 'FILL' ? item.answerSpec.accepted.join('\n') : '')
  const [, setError] = useAdminError()
  const choice = item.answerSpec.type === 'CHOICE'
  const schema = useMemo(() => itemSchema(choice, options.length), [choice, options.length])
  const form = useFormErrors(schema, {
    stem, explanation, correct, accepted,
    ...Object.fromEntries(options.flatMap((option, oi) => [[`o${oi}_key`, option.optionKey], [`o${oi}_content`, option.content]])),
  })

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (disabled) return
    setError(null)
    if (!form.validate()) return
    const answers = accepted.split('\n').map((answer) => answer.trim()).filter(Boolean)
    const body = choice ? {
      stem, explanation, options: options.map(({ optionKey, content }) => ({ optionKey, content })), correct,
      distractors: Object.fromEntries(options.filter((option) => option.optionKey !== correct && option.errorCode.trim()).map((option) => [option.optionKey, option.errorCode.trim()])),
    } : { stem, explanation, accepted: answers }
    const parsed = questionDraftItemPatchSchema.safeParse(body)
    if (!parsed.success) return
    await onSave(parsed.data)
  }

  return <form aria-label={`Sửa câu ${index + 1}`} className="dr-edit" noValidate onSubmit={(event) => void submit(event)}>
    <fieldset className="dr-edit__fields" disabled={disabled}>
      <AdminField label="Nội dung câu hỏi" {...form.field('stem')}><textarea className="adm-textarea" maxLength={4000} value={stem} onChange={(event) => setStem(event.target.value)} /></AdminField>
      {choice ? <>
        {options.map((option, oi) => <fieldset className="dr-edit__option" key={oi}>
          <legend>Lựa chọn {oi + 1}</legend>
          <div className="dr-edit__row">
            <AdminField label={`Mã lựa chọn ${oi + 1}`} {...form.field(`o${oi}_key`)}><input className="adm-input" maxLength={100} value={option.optionKey} onChange={(event) => {
              const nextKey = event.target.value
              if (correct === option.optionKey) setCorrect(nextKey)
              setOptions((current) => current.map((value, vi) => vi === oi ? { ...value, optionKey: nextKey } : value))
            }} /></AdminField>
            {option.optionKey !== correct ? <label className="adm-field"><span>Mã lỗi lựa chọn {oi + 1} (không bắt buộc)</span><input className="adm-input" maxLength={100} value={option.errorCode} onChange={(event) => setOptions((current) => current.map((value, vi) => vi === oi ? { ...value, errorCode: event.target.value } : value))} /></label> : null}
          </div>
          <AdminField label={`Nội dung lựa chọn ${oi + 1}`} {...form.field(`o${oi}_content`)}><textarea className="adm-textarea" maxLength={4000} value={option.content} onChange={(event) => setOptions((current) => current.map((value, vi) => vi === oi ? { ...value, content: event.target.value } : value))} /></AdminField>
          <button className="adm-btn adm-btn--small" type="button" disabled={disabled || options.length <= 2} onClick={() => setOptions((current) => current.filter((_, vi) => vi !== oi))}>Gỡ lựa chọn {oi + 1}</button>
        </fieldset>)}
        <div className="dr-edit__bar">
          <button className="adm-btn" type="button" disabled={disabled || options.length >= 6} onClick={() => setOptions((current) => [...current, { optionKey: '', content: '', errorCode: '' }])}>Thêm lựa chọn</button>
          <AdminField label="Đáp án đúng" {...form.field('correct')}><select className="adm-select" value={correct} onChange={(event) => setCorrect(event.target.value)}><option value="">Chọn đáp án</option>{options.map((option, oi) => <option key={oi} value={option.optionKey}>{option.optionKey || `Lựa chọn ${oi + 1}`}</option>)}</select></AdminField>
        </div>
      </> : <AdminField label="Đáp án được chấp nhận (mỗi dòng một đáp án)" {...form.field('accepted')}><textarea className="adm-textarea" value={accepted} onChange={(event) => setAccepted(event.target.value)} /></AdminField>}
      <AdminField label="Giải thích" {...form.field('explanation')}><textarea className="adm-textarea" maxLength={4000} value={explanation} onChange={(event) => setExplanation(event.target.value)} /></AdminField>
    </fieldset>
    <div className="adm-form-footer">
      <button className="adm-btn adm-btn--danger" disabled={disabled} onClick={onCancel} type="button"><X aria-hidden="true" size={16} /> Đóng</button>
      <button className="adm-btn adm-btn--primary" disabled={disabled} type="submit"><Save aria-hidden="true" size={16} /> {disabled ? 'Đang lưu…' : 'Lưu'}</button>
    </div>
  </form>
}
