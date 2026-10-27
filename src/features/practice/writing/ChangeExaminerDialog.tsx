import { useState } from 'react'
import { UserCheck } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { ExaminerList } from './ExaminerList'
import { useExaminerChoices } from './useExaminerChoices'
import './writing-examiner.css'

/**
 * The learner replaces a late examiner: the examiners who take work, except the one who is late. The server decides
 * again (the examiner may have filled up meanwhile), so a refusal comes back as {@code error} and the list is read again.
 */
export function ChangeExaminerDialog({ currentExaminerId, changesLeft, busy, error, onChange, onClose }: {
  currentExaminerId: string | null
  changesLeft: number
  busy: boolean
  error: string
  onChange: (examinerId: string) => void
  onClose: () => void
}) {
  const loaded = useExaminerChoices(error)
  const [chosen, setChosen] = useState<string | null>(null)

  const ready = loaded.status === 'ready' ? loaded : null
  const others = ready?.examiners.filter((item) => item.id !== currentExaminerId) ?? []
  const picked = others.find((item) => item.id === chosen && !ready?.full.has(item.id)) ?? null

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose() }}>
      <DialogContent className="ww-dialog we-pick">
        <DialogTitle className="ww-dialog-title"><UserCheck size={20} aria-hidden="true" /> Đổi giáo viên chấm bài</DialogTitle>
        <DialogDescription>
          Bài của bạn sẽ chuyển sang giáo viên mới, và giáo viên đó có 48 giờ để chấm. Không mất thêm lượt chấm.
          Bạn còn {changesLeft} lần đổi cho bài này.
        </DialogDescription>
        {loaded.status === 'loading' && <p className="ww-muted" role="status">Đang tải danh sách giáo viên…</p>}
        {loaded.status === 'error' && <p className="ww-error" role="alert">Chưa tải được danh sách giáo viên. Hãy đóng và thử lại.</p>}
        {ready && others.length === 0 && <p className="ww-muted" role="status">Hiện chưa có giáo viên nào khác nhận bài. Bạn có thể tiếp tục chờ hoặc thử lại sau.</p>}
        {ready && others.length > 0 && (
          <ExaminerList examiners={others} full={ready.full} backlog={ready.backlog} chosen={chosen} busy={busy} onChoose={setChosen} />
        )}
        {error && <p className="ww-error" role="alert">{error}</p>}
        <div className="ww-dialog-actions">
          <button type="button" className="ww-secondary" disabled={busy} onClick={onClose}>Quay lại</button>
          <button type="button" className="ww-primary" disabled={busy || !picked} onClick={() => picked && onChange(picked.id)}>
            {busy ? 'Đang gửi…' : picked ? 'Gửi bài' : 'Chọn một giáo viên'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
