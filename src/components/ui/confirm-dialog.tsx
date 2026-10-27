import { AlertDialog } from 'radix-ui'
import type { ConfirmOptions } from '@/lib/useConfirmRequest'
import { Button } from './button'

/** The confirmation popup of the learner site: it replaces the browser's own box, and answers once. */
export function ConfirmPopup({ title, message, confirmLabel, cancelLabel = 'Hủy', tone = 'default', onAnswer }: ConfirmOptions & {
  onAnswer: (answer: boolean) => void
}) {
  return (
    <AlertDialog.Root open onOpenChange={(open) => { if (!open) onAnswer(false) }}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[90] bg-black/50" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-[91] grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-2xl border bg-popover p-6 text-popover-foreground shadow-xl">
          <div className="grid gap-2">
            <AlertDialog.Title className="text-lg font-bold">{title}</AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-muted-foreground">{message}</AlertDialog.Description>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <AlertDialog.Cancel asChild><Button type="button" variant="outline" onClick={() => onAnswer(false)}>{cancelLabel}</Button></AlertDialog.Cancel>
            <AlertDialog.Action asChild><Button type="button" variant={tone === 'danger' ? 'destructive' : 'default'} onClick={() => onAnswer(true)}>{confirmLabel}</Button></AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
