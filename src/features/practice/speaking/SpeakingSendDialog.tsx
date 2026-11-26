import { CircleCheck, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import '../writing/writing-workspace.css'
import './speaking-send-dialog.css'

/**
 * Receiving the answers, in the popup the learner confirmed from: while they are sent it says how far the upload is and
 * cannot be closed; once the server has them (`sent`) it says so, and going on leads to the grading. No time is counted
 * here: the only clock is the one of the grading screen that follows.
 */
export function SpeakingSendDialog({ context, progress, sent, onContinue }: {
  context: string
  progress: string
  /** The submission as the server took it; null while the answers are still being sent. */
  sent: { pointCost: number } | null
  onContinue: () => void
}) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open && sent) onContinue() }}>
      <DialogContent className="ww-dialog ss-dialog">
        <div className={`ss-dialog__mark${sent ? ' is-sent' : ' is-sending'}`} aria-hidden="true">
          {sent ? <CircleCheck size={30} /> : <Loader2 size={29} className="animate-spin" />}
        </div>
        <div className="ss-dialog__copy">
          <DialogTitle className="ss-dialog__title">{sent ? 'Đã nhận bài' : 'Đang gửi bài'}</DialogTitle>
          <DialogDescription className="ss-dialog__description">
            {!sent ? 'Vui lòng giữ trang này mở trong lúc bản ghi được gửi lên.'
              : sent.pointCost > 0 ? `Bài đã vào hàng chờ chấm. ${sent.pointCost} point chỉ bị trừ khi AI chấm xong.`
                : 'Bài đã vào hàng chờ chấm. Kết quả sẽ xuất hiện ngay tại trang này.'}
          </DialogDescription>
        </div>
        <p className="ss-dialog__context"><span>BÀI ĐANG NỘP</span>{context}</p>
        {!sent && <p className="ss-dialog__progress" role="status"><Loader2 size={15} aria-hidden="true" />{progress}</p>}
        {sent && <p className="ss-dialog__receipt"><CircleCheck size={17} aria-hidden="true" /> Đã lưu bản ghi âm của bạn</p>}
        <div className="ss-dialog__actions">
          <button type="button" className="ww-primary" disabled={!sent} onClick={onContinue}>
            {sent ? 'Tiếp tục' : 'Đang gửi bài…'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
