import { Coins, Eye, History, KeyRound, Lock, LockOpen, Pencil, ShieldCheck } from 'lucide-react'
import { AdminRowMenu } from '../../components/AdminRowMenu'
import { canToggleLock } from '../lib/useUserLock'
import type { User } from '../types'
import '../user-row-menu.css'

/**
 * The "…" menu at the end of a user row, in four groups: look and edit, lock, points, history.
 */
export function UserRowMenu({ user, self, onView, onEdit, onRoles, onPassword, onToggleLock, onAdjustPoints, onHistory }: {
  user: User
  self: boolean
  onView: () => void
  onEdit: () => void
  onRoles: () => void
  /** On the signed-in admin's own row this opens Change Password; on another row it opens Reset Password. */
  onPassword: () => void
  onToggleLock: () => void
  onAdjustPoints: () => void
  onHistory: () => void
}) {
  const locked = user.status === 'LOCKED'
  return (
    <AdminRowMenu
      className="um-rowmenu"
      items={[
        { key: 'view', label: 'Chi tiết', icon: <Eye aria-hidden="true" size={17} />, onSelect: onView },
        { key: 'edit', label: 'Chỉnh sửa', icon: <Pencil aria-hidden="true" size={17} />, onSelect: onEdit },
        { key: 'roles', label: 'Phân quyền', icon: <ShieldCheck aria-hidden="true" size={17} />, onSelect: onRoles },
        { key: 'password', label: self ? 'Đổi mật khẩu' : 'Đặt lại mật khẩu', icon: <KeyRound aria-hidden="true" size={17} />, disabled: !self && user.hasPassword === false, onSelect: onPassword },
        {
          key: 'lock',
          label: locked ? 'Mở khóa' : 'Khóa',
          icon: locked ? <LockOpen aria-hidden="true" size={17} /> : <Lock aria-hidden="true" size={17} />,
          tone: locked ? 'default' : 'danger',
          separatorBefore: true,
          disabled: !canToggleLock(user, self),
          onSelect: onToggleLock,
        },
        { key: 'points', label: 'Điều chỉnh điểm', icon: <Coins aria-hidden="true" size={17} />, separatorBefore: true, onSelect: onAdjustPoints },
        { key: 'history', label: 'Lịch sử đăng nhập', icon: <History aria-hidden="true" size={17} />, separatorBefore: true, onSelect: onHistory },
      ]}
      label={`Hành động của ${user.email}`}
    />
  )
}
