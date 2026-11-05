import { CircleCheck } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import '../writing/writing-workspace.css'

/** The answers are with the server: say what happens next, and that no points are taken until the grade is ready. */
export function SpeakingSentDialog({ recorded, cost, context, onClose, onViewResult }: {
  recorded: number
  cost: number
  context: string
  onClose: () => void
  onViewResult: () => void
}) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="ww-dialog">
        <DialogTitle className="ww-dialog-title"><CircleCheck size={20} aria-hidden="true" /> Đã gửi bài Speaking</DialogTitle>
        <DialogDescription>
          {recorded} bản ghi của bạn đã được gửi và đang chờ AI chấm. Point chỉ bị trừ ({cost} point) khi AI chấm xong; nếu việc chấm gặp lỗi thì point không bị trừ.
        </DialogDescription>
        <p className="ww-dialog-context">{context}</p>
        <div className="ww-dialog-actions">
          <button type="button" className="ww-secondary" onClick={onViewResult}>Xem kết quả</button>
          <button type="button" className="ww-primary" onClick={onClose}>Về danh mục luyện tập</button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
