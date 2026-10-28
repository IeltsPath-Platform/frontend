import { Undo2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import './writing-examiner.css'

/**
 * Asks the learner to confirm giving up a late request: nobody grades the essay after that, and the Premium credit goes back.
 * The learner can then send the essay again, to another teacher.
 */
export function CancelRequestDialog({ busy, error, onCancel, onClose }: {
  busy: boolean
  error: string
  onCancel: () => void
  onClose: () => void
}) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose() }}>
      <DialogContent className="ww-dialog">
        <DialogTitle className="ww-dialog-title"><Undo2 size={20} aria-hidden="true" /> Hủy yêu cầu chấm bài?</DialogTitle>
        <DialogDescription>
          Giáo viên sẽ không chấm bài này nữa và lượt giáo viên chấm của bạn được hoàn lại ngay.
          Sau đó bạn có thể gửi lại bài cho một giáo viên khác.
        </DialogDescription>
        {error && <p className="ww-error" role="alert">{error}</p>}
        <div className="ww-dialog-actions">
          <button type="button" className="ww-secondary" disabled={busy} onClick={onClose}>Giữ yêu cầu</button>
          <button type="button" className="ww-primary" disabled={busy} onClick={onCancel}>
            {busy ? 'Đang hủy…' : 'Hủy và nhận lại lượt'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
