import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminDrawer } from '../../components/AdminLayer'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminResource } from '../../lib/useAdminResource'
import { AdminPage } from '../../pages/AdminPage'
import { listPracticeSources } from '../api/packageApi'
import { PackageCreateForm } from '../components/PackageCreateForm'
import { PackageInfoDrawer } from '../components/PackageInfoDrawer'
import { PackageTestTable } from '../components/PackageTestTable'
import { PACKAGE_STATUS_LABEL, SECTION_SKILL_LABEL } from '../lib/packageLabels'
import { useTestCatalog } from '../lib/useTestCatalog'
import type { PackageListItem } from '../types'
import '../packages.css'
import '../test-catalog.css'

const SKILLS = ['READING', 'LISTENING', 'WRITING', 'SPEAKING'] as const
type SkillTab = 'ALL' | (typeof SKILLS)[number]

/** The practice tests of the four skills: one table per skill tab, with Free and Premium, hiding and attempt counts. */
export function PracticeLibraryPage() {
  const navigate = useNavigate()
  const catalog = useTestCatalog('PRACTICE_TEST', {
    title: 'Ẩn đề khỏi thư viện?',
    confirmLabel: 'Ẩn',
    message: (pkg) => `Học viên sẽ không còn thấy “${pkg.title}” trong thư viện. Lượt đang làm vẫn được nộp.`,
  })
  const sources = useAdminResource('practice-library-sources', listPracticeSources)
  const [tab, setTab] = useState<SkillTab>('ALL')
  const [access, setAccess] = useState<'' | 'FREE' | 'PREMIUM'>('')
  const [status, setStatus] = useState('')
  const [text, setText] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<PackageListItem | null>(null)

  const sourceNames = useMemo(() => new Map((sources.data ?? []).map((item) => [item.code, item.name])), [sources.data])
  const inTab = (row: PackageListItem, skill: SkillTab) => skill === 'ALL' || row.skill === skill
  const countsOf = (skill: SkillTab) => {
    const list = catalog.rows.filter((row) => inTab(row, skill))
    return { total: list.length, premium: list.filter((row) => row.accessLevel === 'PREMIUM').length, hidden: list.filter((row) => row.status === 'ARCHIVED').length }
  }
  const needle = text.trim().toLowerCase()
  const visible = catalog.rows.filter((row) => inTab(row, tab) && (!access || row.accessLevel === access) && (!status || row.status === status)
    && (!needle || row.code.toLowerCase().includes(needle) || row.title.toLowerCase().includes(needle)))
  const current = countsOf(tab)

  return <AdminPage title="Thư viện luyện đề" subtitle="Đề luyện tập theo bốn kỹ năng. Đề Premium chỉ học viên có Premium làm được." actions={<button className="adm-btn adm-btn--primary" type="button" onClick={() => setCreating(true)}>Tạo đề luyện</button>}>
    <div className="adm-package-workspace">
      {catalog.confirmDialog}
      <div className="adm-pkg-tabs" role="tablist" aria-label="Kỹ năng">
        {(['ALL', ...SKILLS] as const).map((skill) => {
          const counts = countsOf(skill)
          return <button key={skill} className="adm-pkg-tab" role="tab" aria-selected={tab === skill} type="button" onClick={() => setTab(skill)}>
            {skill === 'ALL' ? 'Tất cả' : SECTION_SKILL_LABEL[skill]}<span className="adm-pkg-tab__count">{counts.total}</span>
          </button>
        })}
      </div>
      <p className="adm-pkg-counts" aria-live="polite">{current.total} đề · {current.premium} Premium · {current.hidden} đang ẩn</p>
      <section aria-label="Bộ lọc đề luyện" className="adm-filters">
        <label className="adm-field"><span>Truy cập</span><select className="adm-select" value={access} onChange={(event) => setAccess(event.target.value as '' | 'FREE' | 'PREMIUM')}><option value="">Tất cả</option><option value="FREE">Miễn phí</option><option value="PREMIUM">Premium</option></select></label>
        <label className="adm-field"><span>Trạng thái</span><select className="adm-select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Tất cả</option>{Object.entries(PACKAGE_STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="adm-field"><span>Tìm mã hoặc tiêu đề</span><input className="adm-input" type="search" value={text} onChange={(event) => setText(event.target.value)} /></label>
      </section>
      {catalog.tests.status === 'loading' && catalog.tests.data == null ? <AdminLoading label="Đang tải đề luyện…" /> : null}
      {catalog.tests.status === 'error' ? <AdminError message={catalog.tests.error ?? 'Không tải được đề luyện.'} onRetry={catalog.tests.reload} /> : null}
      {catalog.tests.status === 'success' && catalog.rows.length === 0 ? <AdminEmpty title="Chưa có đề luyện nào">Bấm “Tạo đề luyện” để bắt đầu.</AdminEmpty> : null}
      {catalog.rows.length > 0 ? (
        <PackageTestTable kind="practice" rows={visible} stats={catalog.stats} sourceNames={sourceNames} busy={catalog.busy} actions={{
          onOpen: (pkg) => navigate(`/content-author/packages/${pkg.id}`),
          onEdit: setEditing,
          onToggleVisibility: (pkg) => void catalog.toggleVisibility(pkg),
        }} />
      ) : null}
      {creating ? <AdminDrawer title="Tạo đề luyện" onClose={() => setCreating(false)}>
        {(close) => <PackageCreateForm fixedType="PRACTICE_TEST" onCancel={close} onCreated={(packageId) => navigate(`/content-author/packages/${packageId}`)} />}
      </AdminDrawer> : null}
      {editing ? <AdminDrawer title="Sửa thông tin đề" description={editing.code} onClose={() => setEditing(null)}>
        {(close) => <PackageInfoDrawer pkg={editing} sources={sources.data ?? []} onSaved={catalog.tests.reload} onClose={close} />}
      </AdminDrawer> : null}
    </div>
  </AdminPage>
}
