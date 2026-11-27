import { Coins, Crown, Eye, History, Lock, LockOpen, Pencil, ShieldCheck } from 'lucide-react'
import { AdminRowMenu } from '../../components/AdminRowMenu'
import { canToggleLock } from '../lib/useUserLock'
import type { User } from '../types'
import '../user-row-menu.css'

/**
 * The "…" menu at the end of a user row, in four groups: look and edit, lock, points and Premium, history.
 */
export function UserRowMenu({ user, self, onView, onEdit, onRoles, onToggleLock, onAdjustPoints, onGrantPremium, onHistory }: {
  user: User
  self: boolean
  onView: () => void
  onEdit: () => void
  onRoles: () => void
  onToggleLock: () => void
  onAdjustPoints: () => void
  onGrantPremium: () => void
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
        { key: 'premium', label: 'Cấp gói Premium', icon: <Crown aria-hidden="true" size={17} />, onSelect: onGrantPremium },
        { key: 'history', label: 'Lịch sử đăng nhập', icon: <History aria-hidden="true" size={17} />, separatorBefore: true, onSelect: onHistory },
      ]}
      label={`Hành động của ${user.email}`}
    />
  )
}
