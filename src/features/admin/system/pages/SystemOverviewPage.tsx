import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminResource, type AdminResource } from '../../lib/useAdminResource'
import { AdminPage } from '../../pages/AdminPage'
import { listUsers } from '../../users/api/userAdminApi'
import { USER_ROLE_LABEL } from '../../users/lib/userLabels'
import { ASSIGNABLE_USER_ROLES, type User, type UserRole } from '../../users/types'
import { fetchActivityStats, fetchServiceSnapshot } from '../api/systemAdminApi'
import type { ActivityStats, DateRange, ServiceSnapshot } from '../types'
import '../system.css'

const recentRange: DateRange = (() => {
  const to = new Date()
  const from = new Date(to)
  from.setUTCDate(from.getUTCDate() - 6)
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
})()

function SummaryBlock<T>({ title, resource, empty, children }: {
  title: string
  resource: AdminResource<T>
  empty: (data: T) => boolean
  children: (data: T) => ReactNode
}) {
  return (
    <section aria-label={title} className="adm-card sys-summary-block">
      <h2>{title}</h2>
      {resource.status === 'loading' ? <AdminLoading label="Đang tải…" /> : null}
      {resource.status === 'error' ? <AdminError message={resource.error ?? 'Không tải được dữ liệu.'} onRetry={resource.reload} /> : null}
      {resource.status === 'success' && resource.data !== null ? empty(resource.data) ? <AdminEmpty title="Chưa có dữ liệu" /> : children(resource.data) : null}
    </section>
  )
}

function ServiceSummary({ snapshot }: { snapshot: ServiceSnapshot }) {
  const down = snapshot.services.filter((service) => service.status === 'DOWN')
  const upCount = snapshot.services.length - down.length
  return <>
    <p><strong>{upCount} / {snapshot.services.length}</strong> dịch vụ đang hoạt động</p>
    {down.length ? <ul className="sys-summary-list">{down.map((service) => <li key={service.serviceId}>{service.serviceId}</li>)}</ul> : <p className="adm-muted">Không có dịch vụ nào đang lỗi.</p>}
    <Link className="qb-link" to="/admin/services">Xem dịch vụ</Link>
  </>
}

function UserSummary({ users }: { users: User[] }) {
  const count = (role: UserRole) => users.filter((user) => user.roles.some((item) => item.name === role)).length
  const locked = users.filter((user) => user.status === 'LOCKED').length
  return <>
    <p><strong>{users.length}</strong> tài khoản · <strong>{locked}</strong> bị khóa</p>
    <ul className="sys-summary-list">{ASSIGNABLE_USER_ROLES.map((role) => <li key={role}>{USER_ROLE_LABEL[role]}: {count(role)}</li>)}</ul>
    <Link className="qb-link" to="/admin/users">Quản lý người dùng</Link>
  </>
}

function ActivitySummary({ stats }: { stats: ActivityStats }) {
  const last = stats.daily.at(-1)
  if (!last) return <AdminEmpty title="Chưa có dữ liệu hoạt động" />
  return <>
    <p className="adm-muted">Ngày {last.day} (UTC)</p>
    <div className="sys-mini-stats"><span>DAU <strong>{last.dau}</strong></span><span>WAU <strong>{last.wau}</strong></span><span>MAU <strong>{last.mau}</strong></span></div>
    <Link className="qb-link" to="/admin/activity">Xem hoạt động</Link>
  </>
}

export function SystemOverviewPage() {
  const services = useAdminResource('system-overview|services', (signal) => fetchServiceSnapshot(signal))
  const users = useAdminResource('system-overview|users', (signal) => listUsers(signal))
  const activity = useAdminResource(`system-overview|activity|${recentRange.from}|${recentRange.to}`, (signal) => fetchActivityStats(recentRange, signal))

  return (
    <AdminPage subtitle="Tình trạng dịch vụ, tài khoản và mức độ hoạt động của nền tảng." title="Tổng quan hệ thống">
      <div className="sys-summary-grid">
        <SummaryBlock empty={(snapshot) => snapshot.services.length === 0} resource={services} title="Dịch vụ">{(snapshot) => <ServiceSummary snapshot={snapshot} />}</SummaryBlock>
        <SummaryBlock empty={(items) => items.length === 0} resource={users} title="Người dùng">{(items) => <UserSummary users={items} />}</SummaryBlock>
        <SummaryBlock empty={(stats) => stats.daily.length === 0} resource={activity} title="Hoạt động gần nhất">{(stats) => <ActivitySummary stats={stats} />}</SummaryBlock>
      </div>
    </AdminPage>
  )
}
