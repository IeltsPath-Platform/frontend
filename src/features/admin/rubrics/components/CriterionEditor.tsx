import { AdminField } from '../../components/AdminField'
import type { FieldState } from '@/lib/validation/useFormErrors'
import { RUBRIC_BANDS, RUBRIC_CRITERIA, type RubricCriterion, type WritingTask } from '../types'

/** `field` gives the error and the star of a field of this form by its key; keys are `c<index>_<part>`. */
export function CriterionEditor({ criterion, index, task, field, onChange }: {
  criterion: RubricCriterion; index: number; task: WritingTask; field: (name: string) => FieldState; onChange: (next: RubricCriterion) => void
}) {
  const label = index + 1
  const codes = task === 'SPEAKING' ? RUBRIC_CRITERIA.filter((code) => ['FC', 'LR', 'GRA', 'PR'].includes(code)) : RUBRIC_CRITERIA.filter((code) => ['TA', 'TR', 'CC', 'LR', 'GRA'].includes(code))
  const bandsError = field(`c${index}_bandDescriptors`).error
  return <fieldset className="adm-card adm-rubric-criterion">
    <legend>Tiêu chí {label}</legend>
    <AdminField label={`Mã tiêu chí ${label}`} {...field(`c${index}_code`)}><select className="adm-select" value={criterion.code} onChange={(event) => onChange({ ...criterion, code: event.target.value as RubricCriterion['code'] })}>{codes.map((code) => <option key={code} value={code}>{code}</option>)}</select></AdminField>
    <AdminField label={`Tên tiêu chí ${label}`} {...field(`c${index}_name`)}><input className="adm-input" maxLength={120} value={criterion.name} onChange={(event) => onChange({ ...criterion, name: event.target.value })} /></AdminField>
    <AdminField label={`Mô tả tiêu chí ${label}`} {...field(`c${index}_description`)}><textarea className="adm-textarea" maxLength={20000} value={criterion.description} onChange={(event) => onChange({ ...criterion, description: event.target.value })} /></AdminField>
    {criterion.bandDescriptors.map((item, bandIndex) => <div className="adm-rubric-band" key={bandIndex}>
      <AdminField label={`Band ${bandIndex + 1} của tiêu chí ${label}`} {...field(`c${index}_b${bandIndex}_band`)}><select className="adm-select" value={item.band} onChange={(event) => onChange({ ...criterion, bandDescriptors: criterion.bandDescriptors.map((band, position) => position === bandIndex ? { ...band, band: Number(event.target.value) } : band) })}>{RUBRIC_BANDS.map((band) => <option key={band} value={band}>{band.toFixed(1)}</option>)}</select></AdminField>
      <AdminField label={`Mô tả band ${bandIndex + 1} của tiêu chí ${label}`} {...field(`c${index}_b${bandIndex}_descriptor`)}><textarea className="adm-textarea" maxLength={20000} value={item.descriptor} onChange={(event) => onChange({ ...criterion, bandDescriptors: criterion.bandDescriptors.map((band, position) => position === bandIndex ? { ...band, descriptor: event.target.value } : band) })} /></AdminField>
      <button className="adm-btn adm-btn--danger" type="button" onClick={() => onChange({ ...criterion, bandDescriptors: criterion.bandDescriptors.filter((_, position) => position !== bandIndex) })}>Xóa band {bandIndex + 1} của tiêu chí {label}</button>
    </div>)}
    {bandsError ? <p className="adm-field__error" role="alert">{bandsError}</p> : null}
    <button className="adm-btn" type="button" disabled={criterion.bandDescriptors.length >= RUBRIC_BANDS.length} onClick={() => onChange({ ...criterion, bandDescriptors: [...criterion.bandDescriptors, { band: RUBRIC_BANDS.find((band) => !criterion.bandDescriptors.some((item) => item.band === band)) ?? 0, descriptor: '' }] })}>Thêm band cho tiêu chí {label}</button>
  </fieldset>
}
