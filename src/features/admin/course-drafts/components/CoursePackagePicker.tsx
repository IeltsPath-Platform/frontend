import { useState } from 'react'
import { Eye, Search, X } from 'lucide-react'
import { AdminModal } from '../../components/AdminLayer'
import { AdminError, AdminLoading } from '../../components/AdminState'
import type { AdminResource } from '../../lib/useAdminResource'
import type { PackageListItem } from '../../packages/types'
import { CoursePackageDetail } from './CoursePackageDetail'

const LIMIT = 20

/**
 * The practice sets a lesson ends with: what is attached, as a table with a remove button per row, and a dialog to
 * choose more from the published sets that are not tied to a lesson yet. A set already used elsewhere in the draft is
 * shown but cannot be ticked.
 */
export function CoursePackagePicker({ value, onChange, catalog, usedIds, disabled }: {
  value: string[]; onChange: (next: string[]) => void; catalog: AdminResource<PackageListItem[]>; usedIds: readonly string[]; disabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [viewing, setViewing] = useState<string | null>(null)
  const packages = (catalog.data ?? []).filter((item) => !item.lessonId && !item.courseId)
  const needle = text.trim().toLowerCase()
  const shown = packages.filter((item) => !needle || item.code.toLowerCase().includes(needle) || item.title.toLowerCase().includes(needle))
  const atLimit = value.length >= LIMIT

  return <section aria-label="Gói luyện tập của bài" className="adm-sec">
    <div className="adm-sec__head">
      <h5 className="adm-sec__title">Gói luyện tập<span className="adm-count">{value.length}/{LIMIT}</span></h5>
      <button className="adm-btn adm-btn--small" disabled={disabled || catalog.status !== 'success'} onClick={() => setOpen(true)} type="button">{value.length ? 'Sửa lựa chọn' : 'Chọn gói luyện tập'}</button>
    </div>
    {catalog.status === 'loading' ? <AdminLoading label="Đang tải gói luyện tập…" /> : null}
    {catalog.status === 'error' ? <AdminError message={catalog.error ?? 'Không tải được gói luyện tập.'} onRetry={catalog.reload} /> : null}
    {catalog.status === 'success' ? <div className="adm-table-wrap adm-kp-table">
      <table aria-label="Gói luyện tập đã chọn" className="adm-table">
        <thead><tr><th className="adm-stt" scope="col">STT</th><th scope="col">Mã</th><th scope="col">Tên gói</th><th aria-label="Bỏ chọn" scope="col" /></tr></thead>
        <tbody>{value.length === 0 ? <tr><td className="adm-muted adm-kp-table__empty" colSpan={4}>Chưa gắn gói luyện tập nào.</td></tr> : value.map((id, index) => {
          const item = packages.find((candidate) => candidate.id === id)
          return <tr key={id}>
            <td className="adm-stt">{index + 1}</td><td><code>{item?.code ?? id.slice(0, 8)}</code></td>
            <td>{item?.title ?? <span className="adm-muted">Gói không còn trong danh sách đã xuất bản</span>}</td>
            <td className="adm-kp-table__remove adm-qrow__tools">
              {item ? <button aria-label={`Xem chi tiết gói ${item.code}`} onClick={() => setViewing(item.id)} type="button"><Eye aria-hidden="true" size={16} /></button> : null}
              <button aria-label={`Gỡ gói ${item?.code ?? id}`} disabled={disabled} onClick={() => onChange(value.filter((selected) => selected !== id))} type="button"><X aria-hidden="true" size={16} /></button>
            </td>
          </tr>
        })}</tbody>
      </table>
    </div> : null}
    {open ? <AdminModal title="Chọn gói luyện tập" description="Gói đã xuất bản và chưa gắn bài học nào" onClose={() => setOpen(false)} stacked>
      {(close) => <>
        <label className="adm-kp-search adm-pkg-search">
          <Search aria-hidden="true" size={16} />
          <input aria-label="Lọc gói luyện tập" className="adm-input" onChange={(event) => setText(event.target.value)} placeholder="Tìm theo mã hoặc tên" type="search" value={text} />
        </label>
        {packages.length === 0 ? <p className="adm-muted">Chưa có gói luyện tập nào đã xuất bản và chưa gắn bài học.</p> : null}
        <ul className="adm-pkg-list">{shown.map((item) => {
          const checked = value.includes(item.id)
          const used = !checked && usedIds.includes(item.id)
          return <li className="adm-pkg-item" key={item.id}><label className="adm-kp-card">
            <input checked={checked} disabled={disabled || used || (!checked && atLimit)} onChange={(event) => onChange(event.target.checked ? [...value, item.id] : value.filter((id) => id !== item.id))} type="checkbox" />
            <span className="adm-kp-card__text">
              <span className="adm-kp-card__title"><code>{item.code}</code> {item.title}</span>
              {used ? <small>Đã dùng ở bài khác trong bản nháp</small> : null}
            </span>
          </label><button aria-label={`Xem chi tiết gói ${item.code} trong hộp chọn`} className="adm-btn adm-btn--small" onClick={() => setViewing(item.id)} type="button">Xem</button></li>
        })}</ul>
        {packages.length > 0 && shown.length === 0 ? <p className="adm-muted">Không có gói khớp bộ lọc.</p> : null}
        <div className="adm-sec__foot"><span className="adm-muted">{value.length}/{LIMIT} đã chọn{atLimit ? ' · đã đạt tối đa' : ''}</span><button className="adm-btn adm-btn--primary" onClick={close} type="button">Lưu</button></div>
      </>}
    </AdminModal> : null}
    {viewing ? <CoursePackageDetail onClose={() => setViewing(null)} packageId={viewing} /> : null}
  </section>
}
