import { Link } from 'react-router-dom'
import { Archive, ArchiveRestore, Eye, Pencil } from 'lucide-react'
import { AdminRowMenu } from '../../components/AdminRowMenu'
import { placementPoolLabel } from '@/features/learning-path/placement/placementPools'
import { PACKAGE_STATUS_LABEL, SECTION_SKILL_LABEL } from '../lib/packageLabels'
import type { PackageListItem, PackageStats } from '../types'

export interface TestRowActions {
  onOpen: (pkg: PackageListItem) => void
  onEdit: (pkg: PackageListItem) => void
  onToggleVisibility: (pkg: PackageListItem) => void
}

/**
 * The tests of one screen as a table. Practice tests show their part, source and access; placement tests show their pool.
 * Attempt counts come from Assessment; when that call fails the two columns show a dash and the table still works.
 */
export function PackageTestTable({ kind, rows, stats, sourceNames, busy, actions }: {
  kind: 'practice' | 'placement'
  rows: readonly PackageListItem[]
  /** Keyed by package id; undefined while loading or when the call failed. */
  stats: ReadonlyMap<string, PackageStats> | undefined
  sourceNames: ReadonlyMap<string, string>
  busy: boolean
  actions: TestRowActions
}) {
  const practice = kind === 'practice'
  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <caption className="adm-sr-only">{practice ? 'Đề luyện tập' : 'Đề đầu vào'}</caption>
        <thead><tr>
          <th className="adm-stt" scope="col">STT</th>
          <th scope="col">Mã và tiêu đề</th>
          {practice ? <><th scope="col">Phần</th><th scope="col">Số câu</th><th scope="col">Nguồn</th><th scope="col">Truy cập</th></>
            : <><th scope="col">Kho band</th><th scope="col">Số phần</th><th scope="col">Số câu</th></>}
          <th scope="col">Trạng thái</th>
          <th scope="col">Lượt làm</th>
          <th scope="col">Điểm TB</th>
          <th className="adm-col-actions" scope="col">Hành động</th>
        </tr></thead>
        <tbody>
          {rows.length === 0 ? <tr><td colSpan={practice ? 10 : 9}><span className="adm-kp-table__empty">Chưa có đề nào.</span></td></tr> : null}
          {rows.map((pkg, index) => {
            const archived = pkg.status === 'ARCHIVED'
            const counts = stats?.get(pkg.id)
            return (
              <tr key={pkg.id}>
                <td className="adm-stt">{index + 1}</td>
                <td><Link to={`/content-author/packages/${pkg.id}`}><code>{pkg.code}</code> {pkg.title}</Link></td>
                {practice ? <>
                  <td>{pkg.partNos?.length ? pkg.partNos.join(', ') : '—'}{pkg.skill ? <span className="adm-muted"> · {SECTION_SKILL_LABEL[pkg.skill]}</span> : null}</td>
                  <td>{pkg.questionCount ?? '—'}</td>
                  <td>{pkg.sourceCode ? (sourceNames.get(pkg.sourceCode) ?? pkg.sourceCode) : <span className="adm-muted">Nội bộ, không hiện cho học viên</span>}</td>
                  <td>{pkg.accessLevel === 'PREMIUM' ? <span className="adm-badge adm-badge--warn">Premium</span> : <span className="adm-badge adm-badge--muted">Miễn phí</span>}</td>
                </> : <>
                  <td>{placementPoolLabel(pkg.placementPool)}</td>
                  <td>{pkg.sectionCount ?? '—'}</td>
                  <td>{pkg.questionCount ?? '—'}</td>
                </>}
                <td><span className={`adm-badge${archived ? ' adm-badge--muted' : pkg.status === 'PUBLISHED' ? ' adm-badge--ok' : ''}`}>{PACKAGE_STATUS_LABEL[pkg.status]}</span></td>
                <td>{counts ? counts.started : '—'}</td>
                <td>{counts?.averageBand != null ? counts.averageBand.toFixed(1) : '—'}</td>
                <td className="adm-col-actions">
                  <AdminRowMenu label={`Hành động của ${pkg.code}`} disabled={busy} items={[
                    { key: 'open', label: 'Soạn đề', ariaLabel: `Soạn ${pkg.title}`, icon: <Pencil aria-hidden="true" size={16} />, onSelect: () => actions.onOpen(pkg) },
                    { key: 'edit', label: 'Sửa thông tin', ariaLabel: `Sửa thông tin ${pkg.title}`, icon: <Eye aria-hidden="true" size={16} />, onSelect: () => actions.onEdit(pkg) },
                    archived
                      ? { key: 'restore', label: 'Khôi phục', ariaLabel: `Khôi phục ${pkg.title}`, icon: <ArchiveRestore aria-hidden="true" size={16} />, separatorBefore: true, onSelect: () => actions.onToggleVisibility(pkg) }
                      : { key: 'hide', label: practice ? 'Ẩn khỏi thư viện' : 'Gỡ khỏi đề đầu vào', ariaLabel: `${practice ? 'Ẩn' : 'Gỡ'} ${pkg.title}`, icon: <Archive aria-hidden="true" size={16} />, separatorBefore: true, tone: 'danger', onSelect: () => actions.onToggleVisibility(pkg) },
                  ]} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
