import { useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { z } from 'zod'
import { useAuthSession } from '@/features/auth/authSession'
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@/features/auth/lib/passwordRules'
import { emailText, phoneText, requiredText } from '@/lib/validation/fields'
import { useFormErrors } from '@/lib/validation/useFormErrors'
import { useAdminSearch } from '../../adminSearch'
import { AdminField } from '../../components/AdminField'
import { AdminDetails, AdminDrawer, AdminModal } from '../../components/AdminLayer'
import { useAdminConfirm } from '../../lib/useAdminConfirm'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/AdminState'
import { AdminPage } from '../../pages/AdminPage'
import { createUser, deleteUser, listUsers, updateUser, updateUserRoles, updateUserStatus } from '../api/userAdminApi'
import { AdjustPointsForm, GrantPremiumForm } from '../components/AccessActionForms'
import { LoginHistoryModal } from '../components/LoginHistoryModal'
import { UserRowMenu } from '../components/UserRowMenu'
import { useUserLock } from '../lib/useUserLock'
import { RoleBadge } from '../components/RoleBadge'
import { hasRoleConflict, primaryRole, USER_ROLE_LABEL, USER_STATUS_LABEL } from '../lib/userLabels'
import { userAdminErrorText } from '../lib/userErrors'
import { ASSIGNABLE_USER_ROLES, CHANGEABLE_USER_STATUSES, USER_STATUSES, type CreateUserInput, type User, type UserRole, type UserStatus } from '../types'
import '../users.css'
import { useAdminError } from '../../lib/useAdminError'
import { InfiniteCount, InfiniteSentinel } from '../../components/InfiniteSentinel'
import { useInfiniteList } from '../../lib/useInfiniteList'

const PAGE_SIZE = 25

const createUserSchema = z.object({
  email: emailText(),
  fullName: requiredText('Họ tên', 150),
  phoneNumber: phoneText(),
  password: z.string({ error: 'Mật khẩu không được để trống.' })
    .min(1, 'Mật khẩu không được để trống.')
    .min(PASSWORD_MIN_LENGTH, `Mật khẩu có từ ${PASSWORD_MIN_LENGTH} đến ${PASSWORD_MAX_LENGTH} ký tự.`)
    .max(PASSWORD_MAX_LENGTH, `Mật khẩu có từ ${PASSWORD_MIN_LENGTH} đến ${PASSWORD_MAX_LENGTH} ký tự.`),
})
const profileSchema = z.object({ fullName: requiredText('Họ tên', 150), phoneNumber: phoneText() })

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
    <fieldset className="um-role-list um-role-grid">
      <legend>Vai trò</legend>
      {ASSIGNABLE_USER_ROLES.map((role) => {
        const checked = value.includes(role)
        const conflicts = !checked && (role === 'ADMIN'
          ? value.includes('CONTENT_AUTHOR') || value.includes('EXAMINER')
          : role === 'CONTENT_AUTHOR' || role === 'EXAMINER'
            ? value.includes('ADMIN')
            : false)
        const protectedAdmin = currentUser && role === 'ADMIN' && checked
        return (
          <label className={`um-role-choice um-role--${role.toLowerCase()}`} key={role}>
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
        <p className="adm-alert adm-alert--error" role="alert">Tài khoản quản trị không được kiêm vai trò Content Author hoặc Examiner.</p>
      ) : null}
    </fieldset>
  )
}

function CreateUserForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [password, setPassword] = useState('')
  const [roles, setRoles] = useState<UserRole[]>(['CUSTOMER'])
  const [, setError] = useAdminError()
  const [saving, setSaving] = useState(false)
  const form = useFormErrors(createUserSchema, { email, fullName, phoneNumber, password })

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!form.validate()) return
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
    <form aria-label="Tài khoản nhân sự mới" className="um-form" noValidate onSubmit={(event) => void submit(event)}>
      <div className="um-form-grid">
        <AdminField label="Email" {...form.field('email')}><input autoComplete="email" className="adm-input" onChange={(event) => setEmail(event.target.value)} type="email" value={email} /></AdminField>
        <AdminField label="Họ tên" {...form.field('fullName')}><input autoComplete="name" className="adm-input" onChange={(event) => setFullName(event.target.value)} value={fullName} /></AdminField>
        <AdminField label="Số điện thoại (không bắt buộc)" {...form.field('phoneNumber')}><input autoComplete="tel" className="adm-input" maxLength={30} onChange={(event) => setPhoneNumber(event.target.value)} type="tel" value={phoneNumber} /></AdminField>
        <AdminField label={`Mật khẩu tạm thời (${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} ký tự)`}{...form.field('password')}><input autoComplete="new-password" className="adm-input" maxLength={72} onChange={(event) => setPassword(event.target.value)} type="password" value={password} /></AdminField>
      </div>
      <RoleChoices onChange={setRoles} value={roles} />
      <div className="adm-form-footer">
        <button className="adm-btn" disabled={saving} onClick={onCancel} type="button">Hủy</button>
        <button className="adm-btn adm-btn--primary" disabled={saving || roles.length === 0 || hasRoleConflict(roles)} type="submit">{saving ? 'Đang tạo…' : 'Tạo tài khoản'}</button>
      </div>
    </form>
  )
}

/** `profile` is name, phone and status; `roles` is the role choices alone. */
type EditorSection = 'profile' | 'roles'

function UserEditor({ user, self, section, onSaved, onDeleted }: {
  user: User
  self: boolean
  section: EditorSection
  onSaved: () => void
  onDeleted: () => void
}) {
  const { confirm, confirmDialog } = useAdminConfirm()
  const [fullName, setFullName] = useState(user.fullName)
  const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber ?? '')
  const [roles, setRoles] = useState<UserRole[]>(user.roles.map((role) => role.name))
  const [status, setStatus] = useState<UserStatus>(user.status)
  const [, setError] = useAdminError()
  const [saving, setSaving] = useState(false)
  const statusOptions: UserStatus[] = user.status === 'PENDING_VERIFY'
    ? ['PENDING_VERIFY', ...CHANGEABLE_USER_STATUSES]
    : [...CHANGEABLE_USER_STATUSES]
  const profile = useFormErrors(profileSchema, { fullName, phoneNumber })

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

  async function saveStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status === 'LOCKED' && !(await confirm({
      title: 'Khóa tài khoản?',
      message: `${user.email} sẽ không đăng nhập được cho đến khi được mở khóa.`,
      confirmLabel: 'Khóa tài khoản',
      tone: 'danger',
    }))) return
    void save(() => updateUserStatus(user.id, status))
  }

  async function removeUser() {
    if (!(await confirm({
      title: 'Xóa tài khoản?',
      message: `Xóa ${user.email}? Thao tác này không thể hoàn tác.`,
      confirmLabel: 'Xóa tài khoản',
      tone: 'danger',
    }))) return
    void save(() => deleteUser(user.id), false).then((saved) => { if (saved) onDeleted() })
  }

  return (
    <section aria-label={`Quản lý ${user.email}`} className="um-editor">
      {confirmDialog}
      {section === 'profile' ? <>
        <form className="um-form-grid" noValidate onSubmit={(event) => { event.preventDefault(); if (!profile.validate()) return; void save(() => updateUser(user.id, { fullName: fullName.trim(), phoneNumber: phoneNumber.trim() || null })) }}>
          <AdminField label="Họ tên" {...profile.field('fullName')}><input className="adm-input" onChange={(event) => setFullName(event.target.value)} value={fullName} /></AdminField>
          <AdminField label="Số điện thoại" {...profile.field('phoneNumber')}><input className="adm-input" maxLength={30} onChange={(event) => setPhoneNumber(event.target.value)} type="tel" value={phoneNumber} /></AdminField>
          <button className="adm-btn adm-btn--primary" disabled={saving} type="submit">Lưu thông tin</button>
        </form>
        <form className="um-actions um-editor-section" onSubmit={saveStatus}>
          <label className="adm-field"><span>Trạng thái</span><select className="adm-select" onChange={(event) => setStatus(event.target.value as UserStatus)} value={status}>
            {statusOptions.map((value) => <option disabled={(self && value !== 'ACTIVE') || value === 'PENDING_VERIFY'} key={value} value={value}>{USER_STATUS_LABEL[value]}</option>)}
          </select></label>
          <button className="adm-btn" disabled={saving || status === user.status || (self && status !== 'ACTIVE')} type="submit">Lưu trạng thái</button>
          {self ? null : <button className="adm-btn adm-btn--danger" disabled={saving} onClick={removeUser} type="button">Xóa tài khoản</button>}
        </form>
      </> : (
        <form onSubmit={(event) => { event.preventDefault(); void save(() => updateUserRoles(user.id, roles)) }}>
          <RoleChoices currentUser={self} onChange={setRoles} value={roles} />
          <div className="adm-form-footer">
            <button className="adm-btn adm-btn--primary" disabled={saving || roles.length === 0 || hasRoleConflict(roles)} type="submit">Lưu vai trò</button>
          </div>
        </form>
      )}
    </section>
  )
}

export function UsersPage() {
  const { query } = useAdminSearch()
  const { userId, email } = useAuthSession()
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [creating, setCreating] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editSection, setEditSection] = useState<EditorSection>('profile')
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [historyId, setHistoryId] = useState<string | null>(null)
  const [accessAction, setAccessAction] = useState<{ userId: string; kind: 'points' | 'premium' } | null>(null)
  const [notice, setNotice] = useState('')
  const search = query.trim()
  const filterKey = `admin-users:${roleFilter}:${statusFilter}:${search}`
  const list = useInfiniteList(filterKey, (page, signal) => listUsers({ page, size: PAGE_SIZE, role: roleFilter || undefined, status: statusFilter || undefined, search: search || undefined }, signal))
  const { toggleLock, lockDialog } = useUserLock(list.refresh)

  function openEditor(id: string, section: EditorSection) {
    setEditSection(section)
    setSelectedId(id)
  }

  const rows = list.items
  const selected = rows.find((user) => user.id === selectedId) ?? null
  const viewing = rows.find((user) => user.id === viewingId) ?? null
  const historyUser = rows.find((user) => user.id === historyId) ?? null
  const accessUser = rows.find((user) => user.id === accessAction?.userId) ?? null

  return (
    <AdminPage
      actions={<button className="adm-btn adm-btn--primary" onClick={() => setCreating(true)} type="button"><Plus aria-hidden="true" size={16} /> Tài khoản mới</button>}
      subtitle="Tạo tài khoản nhân sự và quản lý vai trò, trạng thái người dùng."
      title="Người dùng"
    >
      {creating ? <AdminDrawer title="Tài khoản nhân sự mới" onClose={() => setCreating(false)}>
        {(close) => <CreateUserForm onCancel={close} onCreated={() => { list.refresh(); close() }} />}
      </AdminDrawer> : null}
      <div className="adm-filters um-filters">
        <label className="adm-field"><span>Vai trò</span><select className="adm-select" onChange={(event) => setRoleFilter(event.target.value)} value={roleFilter}><option value="">Tất cả vai trò</option>{ASSIGNABLE_USER_ROLES.map((role) => <option key={role} value={role}>{USER_ROLE_LABEL[role]}</option>)}</select></label>
        <label className="adm-field"><span>Trạng thái</span><select className="adm-select" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}><option value="">Tất cả trạng thái</option>{USER_STATUSES.map((status) => <option key={status} value={status}>{USER_STATUS_LABEL[status]}</option>)}</select></label>
      </div>

      {notice ? <p className="adm-alert" role="status">{notice}</p> : null}
      {list.status === 'loading' ? <AdminLoading label="Đang tải người dùng…" /> : null}
      {list.status === 'error' ? <AdminError message={list.error ?? 'Không tải được người dùng.'} onRetry={list.reload} /> : null}
      {list.status === 'success' && rows.length === 0 ? <AdminEmpty title="Không tìm thấy người dùng">Thử đổi từ khóa hoặc bộ lọc.</AdminEmpty> : null}
      {list.status === 'success' && rows.length > 0 ? (
        <>
          <InfiniteCount items={rows.length} total={list.total} noun="người dùng" />
          <div className="adm-table-wrap um-table-wrap">
            <table className="adm-table um-table">
              <caption className="adm-sr-only">Danh sách người dùng</caption>
              <thead><tr><th className="adm-stt" scope="col">STT</th><th scope="col">Email</th><th scope="col">Họ tên</th><th scope="col">Vai trò</th><th scope="col">Trạng thái</th><th scope="col">Ngày tạo</th><th className="um-col-actions" scope="col">Hành động</th></tr></thead>
              <tbody>{rows.map((user, index) => (
                <tr key={user.id}>
                  <td className="adm-stt">{index + 1}</td>
                  <td><div className="um-user"><span aria-hidden="true" className={`um-avatar um-role--${(primaryRole(user.roles) ?? 'customer').toLowerCase()}`}>{(user.fullName || user.email).charAt(0)}</span>{user.email}</div></td>
                  <td>{user.fullName || '—'}</td>
                  <td><div className="um-badges">{user.roles.map((role) => <RoleBadge key={role.id} role={role.name} />)}</div></td>
                  <td><span className={`adm-badge um-status um-status--${user.status.toLowerCase()}`}>{USER_STATUS_LABEL[user.status]}</span></td>
                  <td>{new Date(user.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td className="um-col-actions"><UserRowMenu
                    onEdit={() => openEditor(user.id, 'profile')}
                    onHistory={() => setHistoryId(user.id)}
                    onRoles={() => openEditor(user.id, 'roles')}
                    onToggleLock={() => void toggleLock(user)}
                    onAdjustPoints={() => { setNotice(''); setAccessAction({ userId: user.id, kind: 'points' }) }}
                    onGrantPremium={() => { setNotice(''); setAccessAction({ userId: user.id, kind: 'premium' }) }}
                    onView={() => setViewingId(user.id)}
                    self={isCurrentUser(user, userId, email)}
                    user={user}
                  /></td>
                </tr>
              ))}<InfiniteSentinel as="tr" colSpan={7} hasMore={list.hasMore} itemCount={rows.length} loadingMore={list.loadingMore} moreError={list.moreError} noun="người dùng" onReachEnd={list.loadMore} onRetry={list.retryMore} resetKey={filterKey} /></tbody>
            </table>
          </div>
          {lockDialog}
          {selected ? <AdminModal title={editSection === 'roles' ? 'Phân quyền' : selected.fullName || selected.email} description={selected.email} onClose={() => setSelectedId(null)}>
            {(close) => <UserEditor key={`${selected.id}:${selected.updatedAt}:${editSection}`} section={editSection} onDeleted={() => { list.refresh(); close() }} onSaved={() => { list.refresh(); close() }} self={isCurrentUser(selected, userId, email)} user={selected} />}
          </AdminModal> : null}
          {historyUser ? <LoginHistoryModal onClose={() => setHistoryId(null)} user={historyUser} /> : null}
          {accessUser && accessAction ? <AdminModal
            title={accessAction.kind === 'points' ? 'Điều chỉnh điểm' : 'Cấp gói Premium'}
            description={accessUser.email}
            onClose={() => setAccessAction(null)}
          >
            {(close) => {
              const done = (message: string) => { setNotice(message); close() }
              return accessAction.kind === 'points'
                ? <AdjustPointsForm onCancel={close} onDone={done} user={accessUser} />
                : <GrantPremiumForm onCancel={close} onDone={done} user={accessUser} />
            }}
          </AdminModal> : null}
          {viewing ? <AdminModal title={viewing.fullName || viewing.email} description={viewing.email} onClose={() => setViewingId(null)}>
            {(close) => <>
              <AdminDetails items={[
                { label: 'Email', value: viewing.email },
                { label: 'Họ tên', value: viewing.fullName || '—' },
                { label: 'Số điện thoại', value: viewing.phoneNumber || '—' },
                { label: 'Vai trò', value: <div className="um-badges">{viewing.roles.map((role) => <RoleBadge key={role.id} role={role.name} />)}</div> },
                { label: 'Trạng thái', value: <span className={`adm-badge um-status um-status--${viewing.status.toLowerCase()}`}>{USER_STATUS_LABEL[viewing.status]}</span> },
                { label: 'Ngày tạo', value: new Date(viewing.createdAt).toLocaleString('vi-VN') },
                { label: 'Cập nhật lần cuối', value: new Date(viewing.updatedAt).toLocaleString('vi-VN') },
              ]} />
              <div className="adm-form-footer">
                <button className="adm-btn" onClick={close} type="button">Đóng</button>
                <button className="adm-btn adm-btn--primary adm-btn--noicon" onClick={() => { setViewingId(null); openEditor(viewing.id, 'profile') }} type="button">Sửa</button>
              </div>
            </>}
          </AdminModal> : null}
        </>
      ) : null}
    </AdminPage>
  )
}
