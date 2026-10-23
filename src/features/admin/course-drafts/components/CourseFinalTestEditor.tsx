import type { CourseFinalTest } from '../types'

export function CourseFinalTestEditor({ value, onChange, label, disabled }: {
  value: CourseFinalTest | null; onChange: (next: CourseFinalTest | null) => void; label: string; disabled: boolean
}) {
  return <section className="adm-course-draft-final" aria-label={label}>
    <h4>{label}</h4>
    {value ? <>
      <label className="adm-field"><span>Mã {label.toLowerCase()}</span><input className="adm-input" required maxLength={100} value={value.code} onChange={(event) => onChange({ ...value, code: event.target.value })} /></label>
      <label className="adm-field"><span>Tiêu đề {label.toLowerCase()}</span><input className="adm-input" required maxLength={255} value={value.title} onChange={(event) => onChange({ ...value, title: event.target.value })} /></label>
      <button className="adm-btn" type="button" disabled={disabled} onClick={() => onChange(null)}>Gỡ {label.toLowerCase()}</button>
    </> : <button className="adm-btn" type="button" disabled={disabled} onClick={() => onChange({ code: '', title: '' })}>Thêm {label.toLowerCase()}</button>}
  </section>
}
