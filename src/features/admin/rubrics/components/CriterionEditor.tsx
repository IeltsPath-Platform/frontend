import { RUBRIC_BANDS, type RubricCriterion } from '../types'

export function CriterionEditor({ criterion, index, onChange }: { criterion: RubricCriterion; index: number; onChange: (next: RubricCriterion) => void }) {
  const label = index + 1
  return <fieldset className="adm-card adm-rubric-criterion">
    <legend>Tiêu chí {label}</legend>
    <label className="adm-field"><span>Mã tiêu chí {label}</span><input className="adm-input" maxLength={100} required value={criterion.code} onChange={(event) => onChange({ ...criterion, code: event.target.value })} /></label>
    <label className="adm-field"><span>Tên tiêu chí {label}</span><input className="adm-input" maxLength={255} required value={criterion.name} onChange={(event) => onChange({ ...criterion, name: event.target.value })} /></label>
    <label className="adm-field"><span>Mô tả tiêu chí {label}</span><textarea className="adm-textarea" maxLength={20000} required value={criterion.description} onChange={(event) => onChange({ ...criterion, description: event.target.value })} /></label>
    {criterion.bandDescriptors.map((item, bandIndex) => <div className="adm-rubric-band" key={bandIndex}>
      <label className="adm-field"><span>Band {bandIndex + 1} của tiêu chí {label}</span><select className="adm-select" value={item.band} onChange={(event) => onChange({ ...criterion, bandDescriptors: criterion.bandDescriptors.map((band, position) => position === bandIndex ? { ...band, band: Number(event.target.value) } : band) })}>{RUBRIC_BANDS.map((band) => <option key={band} value={band}>{band.toFixed(1)}</option>)}</select></label>
      <label className="adm-field"><span>Mô tả band {bandIndex + 1} của tiêu chí {label}</span><textarea className="adm-textarea" maxLength={20000} required value={item.descriptor} onChange={(event) => onChange({ ...criterion, bandDescriptors: criterion.bandDescriptors.map((band, position) => position === bandIndex ? { ...band, descriptor: event.target.value } : band) })} /></label>
      <button className="adm-btn adm-btn--danger" type="button" onClick={() => onChange({ ...criterion, bandDescriptors: criterion.bandDescriptors.filter((_, position) => position !== bandIndex) })}>Xóa band {bandIndex + 1} của tiêu chí {label}</button>
    </div>)}
    <button className="adm-btn" type="button" disabled={criterion.bandDescriptors.length >= RUBRIC_BANDS.length} onClick={() => onChange({ ...criterion, bandDescriptors: [...criterion.bandDescriptors, { band: RUBRIC_BANDS.find((band) => !criterion.bandDescriptors.some((item) => item.band === band)) ?? 0, descriptor: '' }] })}>Thêm band cho tiêu chí {label}</button>
  </fieldset>
}
