import { ConfirmPopup } from '@/components/ui/confirm-dialog'
import { useConfirmRequest } from '@/lib/useConfirmRequest'

/**
 * `const { confirm, confirmDialog } = useConfirmDialog()`, then render `{confirmDialog}` once in the component and
 * `await confirm({ ... })` wherever a question is needed.
 */
export function useConfirmDialog() {
  const { request, ask, settle } = useConfirmRequest()
  return { confirm: ask, confirmDialog: request ? <ConfirmPopup {...request} onAnswer={settle} /> : null }
}
