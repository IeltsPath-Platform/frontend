import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminDrawer } from '../../components/AdminLayer'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/AdminState'
import { AdminPage } from '../../pages/AdminPage'
import { PackageCreateForm } from '../components/PackageCreateForm'
import { PackageInfoDrawer } from '../components/PackageInfoDrawer'
import { PackageTestTable } from '../components/PackageTestTable'
import { PlacementPoolSummary } from '../components/PlacementPoolSummary'
import { PACKAGE_STATUS_LABEL } from '../lib/packageLabels'
import { useTestCatalog } from '../lib/useTestCatalog'
import { PLACEMENT_POOLS } from '@/features/learning-path/placement/placementPools'
import type { PackageListItem } from '../types'
import type { PlacementPool } from '~types/learningPath'
import '../packages.css'
import '../test-catalog.css'

type PoolTab = 'ALL' | PlacementPool

/** The placement tests by band pool. A learner picks a pool; each pool needs at least one published test. */
export function PlacementTestsPage() {
  const navigate = useNavigate()
  const catalog = useTestCatalog('PLACEMENT_TEST', {
    title: 'Gỡ đề khỏi đề đầu vào?',
    confirmLabel: 'Gỡ',
    message: (pkg) => `Học viên sẽ không còn được xếp lớp bằng “${pkg.title}”. Lượt đã làm vẫn được giữ.`,
  })
  const [tab, setTab] = useState<PoolTab>('ALL')
  const [status, setStatus] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<PackageListItem | null>(null)

  const inTab = (row: PackageListItem, pool: PoolTab) => pool === 'ALL' || row.placementPool === pool
  const countOf = (pool: PoolTab) => catalog.rows.filter((row) => inTab(row, pool)).length
  const visible = catalog.rows.filter((row) => inTab(row, tab) && (!status || row.status === status))

  return <AdminPage title="Đề đầu vào" subtitle="Đề xếp lớp theo kho band. Học viên chọn một kho để làm đề." actions={<button className="adm-btn adm-btn--primary" type="button" onClick={() => setCreating(true)}>Tạo đề đầu vào</button>}>
    <div className="adm-package-workspace">
      {catalog.confirmDialog}
      {catalog.tests.status === 'loading' && catalog.tests.data == null ? <AdminLoading label="Đang tải đề đầu vào…" /> : null}
      {catalog.tests.status === 'error' ? <AdminError message={catalog.tests.error ?? 'Không tải được đề đầu vào.'} onRetry={catalog.tests.reload} /> : null}
      {catalog.tests.data != null ? <PlacementPoolSummary items={catalog.rows} /> : null}
      {catalog.tests.data != null ? (
        <div className="adm-pkg-tabs" role="tablist" aria-label="Kho band">
          {(['ALL', ...PLACEMENT_POOLS.map(({ pool }) => pool)] as const).map((pool) => (
            <button key={pool} className="adm-pkg-tab" role="tab" aria-selected={tab === pool} type="button" onClick={() => setTab(pool)}>
              {pool === 'ALL' ? 'Tất cả' : PLACEMENT_POOLS.find((item) => item.pool === pool)!.label}<span className="adm-pkg-tab__count">{countOf(pool)}</span>
            </button>
          ))}
        </div>
      ) : null}
      {catalog.tests.data != null ? (
        <section aria-label="Bộ lọc đề đầu vào" className="adm-filters">
          <label className="adm-field"><span>Trạng thái</span><select className="adm-select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Tất cả</option>{Object.entries(PACKAGE_STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </section>
      ) : null}
      {catalog.tests.status === 'success' && catalog.rows.length === 0 ? <AdminEmpty title="Chưa có đề đầu vào nào">Bấm “Tạo đề đầu vào” để bắt đầu.</AdminEmpty> : null}
      {catalog.rows.length > 0 ? (
        <PackageTestTable kind="placement" rows={visible} stats={catalog.stats} sourceNames={new Map()} busy={catalog.busy} actions={{
          onOpen: (pkg) => navigate(`/content-author/packages/${pkg.id}`),
          onEdit: setEditing,
          onToggleVisibility: (pkg) => void catalog.toggleVisibility(pkg),
        }} />
      ) : null}
      {creating ? <AdminDrawer title="Tạo đề đầu vào" onClose={() => setCreating(false)}>
        {(close) => <PackageCreateForm fixedType="PLACEMENT_TEST" initialPool={tab === 'ALL' ? undefined : tab} onCancel={close} onCreated={(packageId) => navigate(`/content-author/packages/${packageId}`)} />}
      </AdminDrawer> : null}
      {editing ? <AdminDrawer title="Sửa thông tin đề" description={editing.code} onClose={() => setEditing(null)}>
        {(close) => <PackageInfoDrawer pkg={editing} sources={[]} onSaved={catalog.tests.reload} onClose={close} />}
      </AdminDrawer> : null}
    </div>
  </AdminPage>
}
