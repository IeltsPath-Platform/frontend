import { Plus } from 'lucide-react'
import { PACKAGE_STATUS_LABEL } from '../lib/packageLabels'
import type { PackageVersion } from '../types'

/** The bar above the content: which version is open, its package's state, and the way to start a new draft. */
export function VersionPicker({ versions, selectedId, locked, status, onChange, onCreate }: {
  versions: PackageVersion[]; selectedId: string; locked: boolean; status?: string; onChange: (id: string) => void; onCreate: () => void
}) {
  const hasDraft = versions.some((version) => version.status === 'DRAFT')
  return <section className="adm-pe-bar" aria-label="Phiên bản gói">
    <label className="adm-field adm-pe-bar__select"><span>Chọn phiên bản</span><select className="adm-select" value={selectedId} disabled={locked || versions.length === 0} onChange={(event) => onChange(event.target.value)}>
      {versions.length === 0 ? <option value="">Chưa có phiên bản</option> : null}
      {versions.length > 0 && !selectedId ? <option value="" disabled>Chọn lại phiên bản</option> : null}
      {[...versions].sort((a, b) => b.versionNumber - a.versionNumber).map((version) => <option key={version.id} value={version.id}>Bản {version.versionNumber} · {PACKAGE_STATUS_LABEL[version.status]}</option>)}
    </select></label>
    {status ? <span className="adm-badge adm-pe-bar__status">{status}</span> : null}
    {!hasDraft ? <button className="adm-btn adm-btn--small" type="button" disabled={locked} onClick={onCreate}><Plus size={14} aria-hidden="true" /> Tạo bản nháp mới</button> : null}
  </section>
}
