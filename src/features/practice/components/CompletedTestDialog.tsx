import { CheckCircle2, LoaderCircle, RotateCcw, Trophy } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

/** What a learner can do with a test they already finished: see how it went, or do it again. */
export function CompletedTestDialog({ title, busy, error, onViewResult, onRedo, onClose }: {
  title: string
  /** True while the result of the last attempt is being looked up. */
  busy: boolean
  error: string
  onViewResult: () => void
  onRedo: () => void
  onClose: () => void
}) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="practice-screen2-dialog practice-mode-dialog completed-dialog">
        <div className="screen2-top-header">
          <DialogTitle className="screen2-test-title">{title}</DialogTitle>
        </div>
        <div className="screen2-blue-body">
          <span className="completed-badge" aria-hidden="true"><CheckCircle2 size={28} /></span>
          <p className="completed-heading">Bạn đã làm bài này rồi</p>
          <DialogDescription className="completed-text">Xem lại kết quả để biết mình sai ở đâu, hoặc làm lại để luyện thêm.</DialogDescription>
          {error && <p role="alert" className="completed-error">{error}</p>}
          <div className="completed-actions">
            <button type="button" className="screen2-start-cta" disabled={busy} onClick={onViewResult}>
              {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" size={18} /> : <Trophy aria-hidden="true" size={18} />}Xem kết quả
            </button>
            <button type="button" className="completed-redo" disabled={busy} onClick={onRedo}>
              <RotateCcw aria-hidden="true" size={16} />Làm lại
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
