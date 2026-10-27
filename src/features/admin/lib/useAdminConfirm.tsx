import { AdminConfirmDialog } from '../components/AdminLayer'
import { useConfirmRequest } from '@/lib/useConfirmRequest'

/**
 * `const { confirm, confirmDialog } = useAdminConfirm()`, then render `{confirmDialog}` once in the component and
 * `await confirm({ ... })` where a question is needed. It resolves with the answer.
 */
export function useAdminConfirm() {
  const { request, ask, settle } = useConfirmRequest()
  return { confirm: ask, confirmDialog: request ? <AdminConfirmDialog {...request} onAnswer={settle} /> : null }
}
