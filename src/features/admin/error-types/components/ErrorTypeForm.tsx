import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { z } from 'zod'
import { AdminField } from '../../components/AdminField'
import { requiredText } from '@/lib/validation/fields'
import { useFormErrors } from '@/lib/validation/useFormErrors'
import { fetchCodeSuggestion } from '../../code-settings/api/codeSettingsApi'
import { useGeneratedCode } from '../../code-settings/lib/useGeneratedCode'
import { KnowledgePointPicker } from '../../questions/components/KnowledgePointPicker'
import { createErrorType, updateErrorType } from '../api/errorTypeApi'
import { ERROR_CATEGORY_LABEL, SEVERITY_LABEL, errorTypeMessage } from '../lib/errorTypeLabels'
import { ERROR_CATEGORIES, type ErrorCategory, type ErrorType, type ErrorTypeCreate } from '../types'
import { useAdminError } from '../../lib/useAdminError'

const CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,59}$/
const CODE_MESSAGE = 'Mã bắt đầu bằng chữ in hoa, chỉ gồm A–Z, số và dấu gạch dưới, tối đa 60 ký tự.'

/** The code is required when the author types it; when it is generated it may still be empty (the name is not typed yet). */
function errorTypeSchema(codeRequired: boolean) {
  return z.object({
    code: codeRequired
      ? requiredText('Mã lỗi', 60).regex(CODE_PATTERN, CODE_MESSAGE)
      : z.string().trim().refine((value) => value === '' || CODE_PATTERN.test(value), CODE_MESSAGE),
    name: requiredText('Tên mã lỗi', 255),
    hint: requiredText('Gợi ý sửa', 20000),
  })
}

export function ErrorTypeForm({ item, onSaved, onCancel }: { item?: ErrorType; onSaved: () => void; onCancel: () => void }) {
  const [name, setName] = useState(item?.name ?? '')
  const [debouncedName, setDebouncedName] = useState(name)
  const [category, setCategory] = useState<ErrorCategory>(item?.category ?? 'GRAMMAR')
  const [severity, setSeverity] = useState(item?.severity ?? 1)
  const [kp, setKp] = useState<string | null>(item?.knowledgePointId ?? null)
  const [hint, setHint] = useState(item?.fixHint ?? '')
  const [status, setStatus] = useState(item?.status ?? 'ACTIVE')
  const [review, setReview] = useState(item?.reviewStatus ?? 'DRAFT')
  const [saving, setSaving] = useState(false)
  const [, setError] = useAdminError()
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedName(name), 400)
    return () => window.clearTimeout(timer)
  }, [name])
  const generated = useGeneratedCode({
    kind: 'ERROR_TYPE', enabled: !item, initial: item?.code ?? '', contextKey: debouncedName.trim(),
    ready: () => debouncedName.trim() !== '',
    suggest: (signal) => fetchCodeSuggestion({ kind: 'ERROR_TYPE', name: debouncedName }, signal),
  })
  const { code } = generated
  const schema = useMemo(() => errorTypeSchema(!item && generated.required), [item, generated.required])
  const form = useFormErrors(schema, { code, name, hint })
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    if (!form.validate()) return
    const body: Omit<ErrorTypeCreate, 'code'> = { name: name.trim(), category, severity, knowledgePointId: kp, fixHint: hint.trim() }
    setSaving(true)
    setError(null)
    try {
      if (item) await updateErrorType(item.id, { ...body, status, reviewStatus: review })
      else await createErrorType({ ...body, ...(generated.codeToSend !== undefined ? { code: generated.codeToSend } : {}) })
      onSaved()
    } catch (reason) { setError(errorTypeMessage(reason)) } finally { setSaving(false) }
  }
  return <form aria-label={item ? 'Sửa mã lỗi' : 'Tạo mã lỗi'} className="adm-error-form" noValidate onSubmit={(event) => void submit(event)}>
    <fieldset className="adm-error-fields" disabled={saving}>
      <AdminField label="Mã lỗi" {...form.field('code')} required={!item && generated.required}><input className="adm-input" maxLength={60} disabled={!!item || generated.locked} value={code} onChange={(event) => generated.onType(event.target.value)} /></AdminField>
      <AdminField label="Tên mã lỗi" {...form.field('name')}><input className="adm-input" maxLength={255} value={name} onChange={(event) => setName(event.target.value)} /></AdminField>
      <label className="adm-field"><span>Nhóm lỗi</span><select className="adm-select" value={category} onChange={(event) => setCategory(event.target.value as ErrorCategory)}>{ERROR_CATEGORIES.map((value) => <option key={value} value={value}>{ERROR_CATEGORY_LABEL[value]}</option>)}</select></label>
      <label className="adm-field"><span>Mức độ</span><select className="adm-select" value={severity} onChange={(event) => setSeverity(Number(event.target.value))}>{[1, 2, 3].map((value) => <option key={value} value={value}>{SEVERITY_LABEL[value]}</option>)}</select></label>
      <h3>Kiến thức liên quan (tùy chọn)</h3><p className="adm-muted">Mỗi mã lỗi gắn với tối đa một điểm kiến thức. Chọn điểm khác để thay thế.</p>
      <KnowledgePointPicker value={kp ? [{ knowledgePointId: kp, weight: 1 }] : []} onChange={(next) => setKp(next.at(-1)?.knowledgePointId ?? null)} />
      {kp ? <button className="adm-btn" type="button" onClick={() => setKp(null)}>Gỡ điểm kiến thức</button> : null}
      <AdminField label="Gợi ý sửa" {...form.field('hint')}><textarea className="adm-textarea" maxLength={20000} value={hint} onChange={(event) => setHint(event.target.value)} /></AdminField>
      {item ? <><label className="adm-field"><span>Trạng thái mã lỗi</span><select className="adm-select" value={status} onChange={(event) => setStatus(event.target.value as ErrorType['status'])}><option value="ACTIVE">Đang dùng</option><option value="INACTIVE">Ngừng dùng</option></select></label><label className="adm-field"><span>Trạng thái duyệt</span><select className="adm-select" value={review} onChange={(event) => setReview(event.target.value as ErrorType['reviewStatus'])}><option value="DRAFT">Chưa duyệt</option><option value="APPROVED">Đã duyệt</option></select></label></> : null}
      <div className="adm-form-footer"><button className="adm-btn" type="button" onClick={onCancel}>Hủy</button><button className="adm-btn adm-btn--primary" type="submit">{saving ? 'Đang lưu…' : 'Lưu mã lỗi'}</button></div>
    </fieldset>
  </form>
}
