import { PACKAGE_STATUS_LABEL } from '../lib/packageLabels'
import type { PackageVersion } from '../types'

export function VersionPicker({ versions, selectedId, locked, onChange, onCreate }: {
  versions: PackageVersion[]; selectedId: string; locked: boolean; onChange: (id: string) => void; onCreate: () => void
}) {
  const hasDraft = versions.some((version) => version.status === 'DRAFT')
  return <section className="adm-card" aria-label="Phiên bản gói">
    <label className="adm-field"><span>Chọn phiên bản</span><select className="adm-select" value={selectedId} disabled={locked || versions.length === 0} onChange={(event) => onChange(event.target.value)}>
      {versions.length === 0 ? <option value="">Chưa có phiên bản</option> : null}
      {versions.length > 0 && !selectedId ? <option value="" disabled>Chọn lại phiên bản</option> : null}
      {[...versions].sort((a, b) => b.versionNumber - a.versionNumber).map((version) => <option key={version.id} value={version.id}>Bản {version.versionNumber} · {PACKAGE_STATUS_LABEL[version.status]}</option>)}
    </select></label>
    {!hasDraft ? <><button className="adm-btn" type="button" disabled={locked} onClick={onCreate}>Tạo bản nháp mới</button><p className="adm-muted">Bản nháp mới bắt đầu với danh sách phần rỗng.</p></> : <p className="adm-muted">Gói đã có bản nháp. Lưu hoặc hủy form đang mở trước khi chuyển phiên bản.</p>}
  </section>
}
