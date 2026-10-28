import { useCallback } from 'react'
import { useAdminConfirm } from '../../lib/useAdminConfirm'
import { useAdminError } from '../../lib/useAdminError'
import { updateUserStatus } from '../api/userAdminApi'
import type { User } from '../types'
import { userAdminErrorText } from './userErrors'

/** An account can be locked only while it works and unlocked only while it is locked; other states have their own flow. */
export function canToggleLock(user: User, self: boolean): boolean {
  return !self && (user.status === 'ACTIVE' || user.status === 'LOCKED')
}

/**
 * Locks an active account (after a question) or unlocks a locked one. Render `lockDialog` once; `onChanged` runs
 * after the server accepted the change.
 */
export function useUserLock(onChanged: () => void) {
  const { confirm, confirmDialog } = useAdminConfirm()
  const [, setError] = useAdminError()

  const toggleLock = useCallback(async (user: User) => {
    const locked = user.status === 'LOCKED'
    if (!locked && !(await confirm({
      title: 'Khóa tài khoản?',
      message: `${user.email} sẽ không đăng nhập được cho đến khi được mở khóa.`,
      confirmLabel: 'Khóa tài khoản',
      tone: 'danger',
    }))) return
    setError(null)
    try {
      await updateUserStatus(user.id, locked ? 'ACTIVE' : 'LOCKED')
      onChanged()
    } catch (reason) {
      setError(userAdminErrorText(reason))
    }
  }, [confirm, onChanged, setError])

  return { toggleLock, lockDialog: confirmDialog }
}
