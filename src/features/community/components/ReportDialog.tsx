import type { FormEvent } from 'react'

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
  if (!target) return null

  return (
    <div
      className="community-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <section
        className="community-modal community-report-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
      >
        <header>
          <h2 id="report-title">
            Báo cáo {target.type === 'POST' ? 'bài viết' : 'bình luận'}
          </h2>
          <button type="button" aria-label="Đóng" onClick={onClose}>
            ×
          </button>
        </header>

        <form onSubmit={onSubmit}>
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
          <p className="community-report-char-count">
            {reason.trim().length}/1000 · Mỗi người chỉ báo cáo nội dung này một lần.
          </p>

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
      </section>
    </div>
  )
}
