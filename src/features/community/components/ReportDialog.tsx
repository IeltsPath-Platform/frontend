import { useState, type FormEvent } from 'react'
import { z } from 'zod'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { requiredText } from '@/lib/validation/fields'
import { collectErrors } from '@/lib/validation/useFormErrors'

const reportSchema = z.object({ reason: requiredText('Lý do báo cáo', 1000) })

export interface ReportDialogProps {
  target: { type: 'POST' | 'COMMENT'; id: string } | null
  reason: string
  message: string
  onChangeReason: (reason: string) => void
  onSubmit: (event: FormEvent) => void
  onClose: () => void
}

export function ReportDialog({
  target,
  reason,
  message,
  onChangeReason,
  onSubmit,
  onClose,
}: ReportDialogProps) {
  // The reason is refused under its box once the author tried to send it empty for this target.
  const [triedFor, setTriedFor] = useState<string | null>(null)
  const reasonError = target && triedFor === target.id ? collectErrors(reportSchema, { reason }).reason : undefined

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (Object.keys(collectErrors(reportSchema, { reason })).length > 0) {
      setTriedFor(target?.id ?? null)
      return
    }
    onSubmit(event)
  }

  return (
    <Dialog open={Boolean(target)} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="community-report-dialog">
        <DialogHeader>
          <DialogTitle>Báo cáo {target?.type === 'COMMENT' ? 'bình luận' : 'bài viết'}</DialogTitle>
          <DialogDescription>Mỗi người chỉ báo cáo một nội dung một lần.</DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit} className="community-report-form">
          <label htmlFor="report-reason" className="after:ml-1 after:text-red-600 after:content-['*']">Lý do báo cáo</label>
          <textarea
            id="report-reason"
            value={reason}
            onChange={(event) => onChangeReason(event.target.value)}
            maxLength={1000}
            aria-required
            aria-invalid={reasonError ? true : undefined}
            aria-describedby={reasonError ? 'report-reason-error' : undefined}
            rows={4}
            placeholder="Mô tả lý do bạn báo cáo nội dung này (ví dụ: spam, ngôn ngữ không phù hợp...)"
          />
          {reasonError ? <p id="report-reason-error" role="alert" className="community-report-status-msg">{reasonError}</p> : null}
          <p className="community-report-char-count">{reason.trim().length}/1000</p>

          {message && <p role="status" className="community-report-status-msg">{message}</p>}

          <footer>
            <button type="button" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="community-primary">
              Gửi báo cáo
            </button>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  )
}
