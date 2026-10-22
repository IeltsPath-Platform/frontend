import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { flashcardErrorMessage } from '../api/flashcardApi'

interface ConfirmDialogProps {
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => Promise<void>
  onClose: () => void
}

export function ConfirmDialog({ title, description, confirmLabel, onConfirm, onClose }: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function confirm() {
    setBusy(true); setError('')
    try { await onConfirm() } catch (reason) { setError(flashcardErrorMessage(reason)); setBusy(false) }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose() }}>
      <DialogContent className="flashcard-dialog flashcard-confirm">
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
        {error && <p role="alert" className="flashcard-error">{error}</p>}
        <div className="flashcard-form-actions">
          <Button type="button" variant="outline" disabled={busy} onClick={onClose}>Hủy</Button>
          <Button type="button" variant="destructive" disabled={busy} onClick={() => void confirm()}>{busy ? 'Đang xử lý…' : confirmLabel}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
