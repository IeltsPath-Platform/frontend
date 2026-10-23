import { AdminError, AdminLoading } from '../../components/AdminState'
import type { AdminResource } from '../../lib/useAdminResource'
import type { PackageListItem } from '../../packages/types'

export function CoursePackagePicker({ value, onChange, catalog, usedIds, disabled }: {
  value: string[]; onChange: (next: string[]) => void; catalog: AdminResource<PackageListItem[]>; usedIds: readonly string[]; disabled: boolean
}) {
  const packages = (catalog.data ?? []).filter((item) => !item.lessonId && !item.courseId)
  return <section className="adm-course-draft-picker" aria-label="Gói luyện tập của bài">
    <h5>Gói luyện tập ({value.length}/20)</h5>
    <p className="adm-muted">Chọn gói đã xuất bản, chưa gắn bài học. Mỗi gói chỉ dùng một lần trong bản nháp.</p>
    {catalog.status === 'loading' ? <AdminLoading label="Đang tải gói luyện tập…" /> : null}
    {catalog.status === 'error' ? <AdminError message={catalog.error!} onRetry={catalog.reload} /> : null}
    {value.length ? <ul>{value.map((id) => <li key={id} className="adm-course-draft-selected"><span>{packages.find((item) => item.id === id)?.title ?? id}</span><button className="adm-btn" type="button" disabled={disabled} onClick={() => onChange(value.filter((selected) => selected !== id))}>Gỡ gói {packages.find((item) => item.id === id)?.code ?? id}</button></li>)}</ul> : null}
    {catalog.status === 'success' && !packages.length ? <p className="adm-muted">Chưa có gói luyện tập đã xuất bản và chưa gắn bài học.</p> : null}
    <ul className="adm-course-draft-options">{packages.map((item) => {
      const checked = value.includes(item.id)
      const used = !checked && usedIds.includes(item.id)
      return <li key={item.id}><label className="adm-check"><input type="checkbox" checked={checked} disabled={disabled || used || (!checked && value.length >= 20)} onChange={(event) => onChange(event.target.checked ? [...value, item.id] : value.filter((id) => id !== item.id))} /><span><code>{item.code}</code> · {item.title}{used ? ' · Đã dùng trong bản nháp' : ''}</span></label></li>
    })}</ul>
  </section>
}
