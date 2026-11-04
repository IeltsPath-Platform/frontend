import type { FormEvent } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

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
  return (
    <Dialog open={Boolean(target)} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="community-report-dialog">
        <DialogHeader>
          <DialogTitle>Báo cáo {target?.type === 'COMMENT' ? 'bình luận' : 'bài viết'}</DialogTitle>
          <DialogDescription>Mỗi người chỉ báo cáo một nội dung một lần.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="community-report-form">
          <label htmlFor="report-reason">Lý do báo cáo</label>
          <textarea
            id="report-reason"
            value={reason}
            onChange={(event) => onChangeReason(event.target.value)}
            maxLength={1000}
            required
            rows={4}
            placeholder="Mô tả lý do bạn báo cáo nội dung này (ví dụ: spam, ngôn ngữ không phù hợp...)"
          />
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
