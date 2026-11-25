import { useMemo, useState, type FormEvent } from 'react'
import { z } from 'zod'
import { AdminField } from '../../components/AdminField'
import { AdminSwitch } from '../../components/AdminSwitch'
import { requiredText } from '@/lib/validation/fields'
import { useFormErrors } from '@/lib/validation/useFormErrors'
import { useAdminErrorToast } from '../../lib/useAdminError'
import { updatePackageInfo } from '../api/packageApi'
import { packageError } from '../lib/packageLabels'
import { PLACEMENT_POOLS } from '@/features/learning-path/placement/placementPools'
import type { PackageListItem, PracticeSource, UpdatePackageInfoRequest } from '../types'
import type { PlacementPool } from '~types/learningPath'

/**
 * Edits what an author can change after creating a test: its title, Premium access, source (practice) and band pool
 * (placement, only while never published). Only the fields that changed are sent.
 */
export function PackageInfoDrawer({ pkg, sources, onSaved, onClose }: {
  pkg: PackageListItem
  sources: readonly PracticeSource[]
  onSaved: () => void
  onClose: () => void
}) {
  const [title, setTitle] = useState(pkg.title)
  const [premium, setPremium] = useState(pkg.accessLevel === 'PREMIUM')
  const [sourceCode, setSourceCode] = useState(pkg.sourceCode ?? '')
  const [pool, setPool] = useState<PlacementPool | ''>(pkg.placementPool ?? '')
  const [pending, setPending] = useState(false)
  const fail = useAdminErrorToast()
  // Mirrors the server rule: a placement test can change its pool only before its first publication.
  const poolLocked = pkg.packageType === 'PLACEMENT_TEST' && (pkg.status !== 'DRAFT' || pkg.currentPublishedVersionId !== null)
  const schema = useMemo(() => z.object({ title: requiredText('Tiêu đề gói', 255) }), [])
  const form = useFormErrors(schema, { title })

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pending || !form.validate()) return
    const body: UpdatePackageInfoRequest = {}
    if (title.trim() !== pkg.title) body.title = title.trim()
    if (premium !== (pkg.accessLevel === 'PREMIUM')) body.accessLevel = premium ? 'PREMIUM' : 'FREE'
    if (pkg.packageType === 'PRACTICE_TEST' && sourceCode !== (pkg.sourceCode ?? '')) body.sourceCode = sourceCode
    if (pkg.packageType === 'PLACEMENT_TEST' && !poolLocked && pool && pool !== pkg.placementPool) body.placementPool = pool
    if (Object.keys(body).length === 0) { onClose(); return }
    setPending(true)
    try {
      await updatePackageInfo(pkg.id, body)
      onSaved()
      onClose()
    } catch (reason) {
      fail(packageError(reason))
    } finally {
      setPending(false)
    }
  }

  return <form aria-label="Sửa thông tin gói" className="adm-package-create" noValidate onSubmit={(event) => void submit(event)}>
    <fieldset className="adm-package-fields" disabled={pending}>
      <AdminField label="Tiêu đề" {...form.field('title')}>
        <input className="adm-input" maxLength={255} value={title} onChange={(event) => setTitle(event.target.value)} />
      </AdminField>
      <AdminSwitch checked={premium} onChange={setPremium}>Chỉ học viên Premium làm được</AdminSwitch>
      {pkg.packageType === 'PRACTICE_TEST' ? (
        <label className="adm-field"><span>Nguồn đề</span>
          <select className="adm-select" value={sourceCode} onChange={(event) => setSourceCode(event.target.value)}>
            <option value="">Không có nguồn (nội bộ, không hiện cho học viên)</option>
            {sources.map((source) => <option key={source.code} value={source.code}>{source.name}</option>)}
            {sourceCode && !sources.some((source) => source.code === sourceCode) ? <option value={sourceCode}>{sourceCode}</option> : null}
          </select>
        </label>
      ) : null}
      {pkg.packageType === 'PLACEMENT_TEST' ? (
        <label className="adm-field"><span>Kho band</span>
          <select className="adm-select" disabled={poolLocked} value={pool} onChange={(event) => setPool(event.target.value as PlacementPool)}>
            {PLACEMENT_POOLS.map(({ pool: value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
          {poolLocked ? <span className="adm-muted">Đã xuất bản nên không đổi kho.</span> : null}
        </label>
      ) : null}
      <div className="adm-form-footer"><button className="adm-btn" type="button" onClick={onClose}>Đóng</button><button className="adm-btn adm-btn--primary" type="submit">{pending ? 'Đang lưu…' : 'Lưu'}</button></div>
    </fieldset>
  </form>
}
