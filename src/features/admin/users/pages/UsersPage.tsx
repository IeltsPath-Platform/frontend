import { useMemo, useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { useAuthSession } from '@/features/auth/authSession'
import { useAdminSearch } from '../../adminSearch'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminResource } from '../../lib/useAdminResource'
import { AdminPage } from '../../pages/AdminPage'
import { createUser, deleteUser, listUsers, updateUser, updateUserRoles, updateUserStatus } from '../api/userAdminApi'
import { hasRoleConflict, USER_ROLE_LABEL, USER_STATUS_LABEL } from '../lib/userLabels'
import { userAdminErrorText } from '../lib/userErrors'
import { CHANGEABLE_USER_STATUSES, USER_ROLES, USER_STATUSES, type CreateUserInput, type User, type UserRole, type UserStatus } from '../types'
import '../users.css'

const PAGE_SIZE = 25

function isCurrentUser(user: User, userId: string | null, email: string | null) {
  return userId ? user.id === userId : Boolean(email && user.email.toLowerCase() === email.toLowerCase())
}

function RoleChoices({ value, onChange, currentUser }: {
  value: UserRole[]
  onChange: (roles: UserRole[]) => void
  currentUser?: boolean
}) {
  function toggle(role: UserRole, checked: boolean) {
    onChange(checked ? [...value, role] : value.filter((item) => item !== role))
  }

  return (
    <fieldset className="um-role-list">
      <legend>Vai trò</legend>
      {USER_ROLES.map((role) => {
        const checked = value.includes(role)
        const conflicts = !checked && (role === 'ADMIN'
          ? value.includes('CONTENT_AUTHOR') || value.includes('EXAMINER')
          : role === 'CONTENT_AUTHOR' || role === 'EXAMINER'
            ? value.includes('ADMIN')
            : false)
        const protectedAdmin = currentUser && role === 'ADMIN' && checked
        return (
          <label className="um-role-choice" key={role}>
            <input
              checked={checked}
              disabled={conflicts || protectedAdmin}
              onChange={(event) => toggle(role, event.target.checked)}
              type="checkbox"
              value={role}
            />
            <span>{USER_ROLE_LABEL[role]}</span>
          </label>
        )
      })}
      {hasRoleConflict(value) ? (
        <p className="adm-alert adm-alert--error" role="alert">Tài khoản quản trị không được kiêm vai trò R&amp;D hoặc Mentor.</p>
      ) : null}
    </fieldset>
  )
}

function CreateUserPanel({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [password, setPassword] = useState('')
  const [roles, setRoles] = useState<UserRole[]>(['CUSTOMER'])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSaving(true)
    const input: CreateUserInput = { email: email.trim(), fullName: fullName.trim(), password, roles }
    if (phoneNumber.trim()) input.phoneNumber = phoneNumber.trim()
    try {
      await createUser(input)
      onCreated()
    } catch (reason) {
      setError(userAdminErrorText(reason))
      setSaving(false)
    }
  }

  return (
    <form className="adm-card um-form" onSubmit={(event) => void submit(event)}>
      <h2>Tài khoản nhân sự mới</h2>
      {error ? <div className="adm-alert adm-alert--error" role="alert">{error}</div> : null}
      <div className="um-form-grid">
        <label className="adm-field"><span>Email</span><input autoComplete="email" className="adm-input" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>
        <label className="adm-field"><span>Họ tên</span><input autoComplete="name" className="adm-input" onChange={(event) => setFullName(event.target.value)} required value={fullName} /></label>
        <label className="adm-field"><span>Số điện thoại (không bắt buộc)</span><input autoComplete="tel" className="adm-input" onChange={(event) => setPhoneNumber(event.target.value)} type="tel" value={phoneNumber} /></label>
        <label className="adm-field"><span>Mật khẩu tạm thời (6–72 ký tự)</span><input autoComplete="new-password" className="adm-input" minLength={6} maxLength={72} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label>
      </div>
      <RoleChoices onChange={setRoles} value={roles} />
      <div className="um-actions">
        <button className="adm-btn adm-btn--primary" disabled={saving || roles.length === 0 || hasRoleConflict(roles)} type="submit">{saving ? 'Đang tạo…' : 'Tạo tài khoản'}</button>
        <button className="adm-btn" disabled={saving} onClick={onCancel} type="button">Hủy</button>
      </div>
    </form>
  )
}

function UserEditor({ user, self, onSaved, onDeleted }: {
  user: User
  self: boolean
  onSaved: () => void
  onDeleted: () => void
}) {
  const [fullName, setFullName] = useState(user.fullName)
  const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber ?? '')
  const [roles, setRoles] = useState<UserRole[]>(user.roles.map((role) => role.name))
  const [status, setStatus] = useState<UserStatus>(user.status)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const statusOptions: UserStatus[] = user.status === 'PENDING_VERIFY'
    ? ['PENDING_VERIFY', ...CHANGEABLE_USER_STATUSES]
    : [...CHANGEABLE_USER_STATUSES]


  async function save(action: () => Promise<unknown>, refresh = true) {
    setSaving(true)
    setError(null)
    try {
      await action()
      if (refresh) onSaved()
      return true
    } catch (reason) {
      setError(userAdminErrorText(reason))
      return false
    } finally {
      setSaving(false)
    }
  }

  function saveStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status === 'LOCKED' && !window.confirm(`Bạn có chắc muốn khóa tài khoản ${user.email}?`)) return
    void save(() => updateUserStatus(user.id, status))
  }

  function removeUser() {
    if (!window.confirm(`Xóa tài khoản ${user.email}? Thao tác này không thể hoàn tác.`)) return
    void save(() => deleteUser(user.id), false).then((saved) => { if (saved) onDeleted() })
  }

  return (
    <section aria-label={`Quản lý ${user.email}`} className="adm-card um-editor">
      <div className="um-editor-heading"><h2>{user.fullName || user.email}</h2><p className="adm-muted">{user.email}</p></div>
      {error ? <div className="adm-alert adm-alert--error" role="alert">{error}</div> : null}
      <form className="um-form-grid" onSubmit={(event) => { event.preventDefault(); void save(() => updateUser(user.id, { fullName: fullName.trim(), phoneNumber: phoneNumber.trim() || null })) }}>
        <label className="adm-field"><span>Họ tên</span><input className="adm-input" onChange={(event) => setFullName(event.target.value)} required value={fullName} /></label>
        <label className="adm-field"><span>Số điện thoại</span><input className="adm-input" onChange={(event) => setPhoneNumber(event.target.value)} type="tel" value={phoneNumber} /></label>
        <button className="adm-btn" disabled={saving || !fullName.trim()} type="submit">Lưu thông tin</button>
      </form>
      <form className="um-editor-section" onSubmit={(event) => { event.preventDefault(); void save(() => updateUserRoles(user.id, roles)) }}>
        <RoleChoices currentUser={self} onChange={setRoles} value={roles} />
        <button className="adm-btn" disabled={saving || roles.length === 0 || hasRoleConflict(roles)} type="submit">Lưu vai trò</button>
      </form>
      <form className="um-actions um-editor-section" onSubmit={saveStatus}>
        <label className="adm-field"><span>Trạng thái</span><select className="adm-select" onChange={(event) => setStatus(event.target.value as UserStatus)} value={status}>
          {statusOptions.map((value) => <option disabled={(self && value !== 'ACTIVE') || value === 'PENDING_VERIFY'} key={value} value={value}>{USER_STATUS_LABEL[value]}</option>)}
        </select></label>
        <button className="adm-btn" disabled={saving || status === user.status || (self && status !== 'ACTIVE')} type="submit">Lưu trạng thái</button>
        {self ? null : <button className="adm-btn adm-btn--danger" disabled={saving} onClick={removeUser} type="button">Xóa tài khoản</button>}
      </form>
    </section>
  )
}

export function UsersPage() {
  const { query } = useAdminSearch()
  const { userId, email } = useAuthSession()
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(0)
  const [creating, setCreating] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const list = useAdminResource('admin-users', (signal) => listUsers(signal))

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase()
    return (list.data ?? []).filter((user) => {
      const matchesText = !text || user.email.toLowerCase().includes(text) || user.fullName.toLowerCase().includes(text)
      const matchesRole = !roleFilter || user.roles.some((role) => role.name === roleFilter)
      const matchesStatus = !statusFilter || user.status === statusFilter
      return matchesText && matchesRole && matchesStatus
    })
  }, [list.data, query, roleFilter, statusFilter])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const pageRows = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
  const selected = filtered.find((user) => user.id === selectedId) ?? null

  return (
    <AdminPage
      actions={<button className="adm-btn adm-btn--primary" onClick={() => setCreating((value) => !value)} type="button"><Plus aria-hidden="true" size={16} /> Tài khoản mới</button>}
      subtitle="Tạo tài khoản nhân sự và quản lý vai trò, trạng thái người dùng."
      title="Người dùng"
    >
      {creating ? <CreateUserPanel onCancel={() => setCreating(false)} onCreated={() => { setCreating(false); list.reload() }} /> : null}
      <div className="adm-filters um-filters">
        <label className="adm-field"><span>Vai trò</span><select className="adm-select" onChange={(event) => { setPage(0); setRoleFilter(event.target.value) }} value={roleFilter}><option value="">Tất cả vai trò</option>{USER_ROLES.map((role) => <option key={role} value={role}>{USER_ROLE_LABEL[role]}</option>)}</select></label>
        <label className="adm-field"><span>Trạng thái</span><select className="adm-select" onChange={(event) => { setPage(0); setStatusFilter(event.target.value) }} value={statusFilter}><option value="">Tất cả trạng thái</option>{USER_STATUSES.map((status) => <option key={status} value={status}>{USER_STATUS_LABEL[status]}</option>)}</select></label>
      </div>

      {list.status === 'loading' ? <AdminLoading label="Đang tải người dùng…" /> : null}
      {list.status === 'error' ? <AdminError message={list.error ?? 'Không tải được người dùng.'} onRetry={list.reload} /> : null}
      {list.status === 'success' && filtered.length === 0 ? <AdminEmpty title="Không tìm thấy người dùng">Thử đổi từ khóa hoặc bộ lọc.</AdminEmpty> : null}
      {list.status === 'success' && filtered.length > 0 ? (
        <>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <caption className="adm-sr-only">Danh sách người dùng</caption>
              <thead><tr><th scope="col">Email</th><th scope="col">Họ tên</th><th scope="col">Vai trò</th><th scope="col">Trạng thái</th><th scope="col">Ngày tạo</th><th scope="col"><span className="adm-sr-only">Thao tác</span></th></tr></thead>
              <tbody>{pageRows.map((user) => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td>{user.fullName || '—'}</td>
                  <td><div className="um-badges">{user.roles.map((role) => <span className="adm-badge" key={role.id}>{USER_ROLE_LABEL[role.name]}</span>)}</div></td>
                  <td><span className={`adm-badge um-status um-status--${user.status.toLowerCase()}`}>{USER_STATUS_LABEL[user.status]}</span></td>
                  <td>{new Date(user.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td><button aria-expanded={selectedId === user.id} className="adm-btn adm-btn--small" onClick={() => setSelectedId((current) => current === user.id ? null : user.id)} type="button">{selectedId === user.id ? 'Đóng' : 'Quản lý'}</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <nav aria-label="Phân trang người dùng" className="um-pager">
            <button className="adm-btn adm-btn--small" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} type="button">Trang trước</button>
            <span>Trang {currentPage + 1} / {pageCount} · {filtered.length} người dùng</span>
            <button className="adm-btn adm-btn--small" disabled={currentPage + 1 >= pageCount} onClick={() => setPage(currentPage + 1)} type="button">Trang sau</button>
          </nav>
          {selected ? <UserEditor key={`${selected.id}:${selected.updatedAt}`} onDeleted={() => { setSelectedId(null); list.reload() }} onSaved={list.reload} self={isCurrentUser(selected, userId, email)} user={selected} /> : null}
        </>
      ) : null}
    </AdminPage>
  )
}
