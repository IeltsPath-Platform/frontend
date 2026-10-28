import { ArrowLeftRight, Eye, History, KeyRound, Lock, LockOpen, Pencil, ShieldCheck } from 'lucide-react'
import { AdminRowMenu } from '../../components/AdminRowMenu'
import { canToggleLock } from '../lib/useUserLock'
import type { User } from '../types'
import '../user-row-menu.css'

/**
 * The "…" menu at the end of a user row, in four groups: look and edit, lock, password, history. The two password
 * items are shown like the others but do nothing yet.
 */
export function UserRowMenu({ user, self, onView, onEdit, onRoles, onToggleLock, onHistory }: {
  user: User
  self: boolean
  onView: () => void
  onEdit: () => void
  onRoles: () => void
  onToggleLock: () => void
  onHistory: () => void
}) {
  const locked = user.status === 'LOCKED'
  const noop = () => undefined
  return (
    <AdminRowMenu
      className="um-rowmenu"
      items={[
        { key: 'view', label: 'Chi tiết', icon: <Eye aria-hidden="true" size={17} />, onSelect: onView },
        { key: 'edit', label: 'Chỉnh sửa', icon: <Pencil aria-hidden="true" size={17} />, onSelect: onEdit },
        { key: 'roles', label: 'Phân quyền', icon: <ShieldCheck aria-hidden="true" size={17} />, onSelect: onRoles },
        {
          key: 'lock',
          label: locked ? 'Mở khóa' : 'Khóa',
          icon: locked ? <LockOpen aria-hidden="true" size={17} /> : <Lock aria-hidden="true" size={17} />,
          tone: locked ? 'default' : 'danger',
          separatorBefore: true,
          disabled: !canToggleLock(user, self),
          onSelect: onToggleLock,
        },
        { key: 'reset-password', label: 'Đặt lại mật khẩu', icon: <KeyRound aria-hidden="true" size={17} />, separatorBefore: true, onSelect: noop },
        { key: 'change-password', label: 'Thay đổi mật khẩu', icon: <ArrowLeftRight aria-hidden="true" size={17} />, onSelect: noop },
        { key: 'history', label: 'Lịch sử đăng nhập', icon: <History aria-hidden="true" size={17} />, separatorBefore: true, onSelect: onHistory },
      ]}
      label={`Hành động của ${user.email}`}
    />
  )
}
