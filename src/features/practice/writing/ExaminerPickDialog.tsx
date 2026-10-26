import { useState } from 'react'
import { UserCheck } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { ExaminerList } from './ExaminerList'
import { useExaminerChoices } from './useExaminerChoices'
import './writing-examiner.css'

/**
 * The examiners who take new work. The learner picks one and sends the essay; the server decides again when it is sent
 * (the examiner may have filled up meanwhile), so a refusal comes back as {@code error} and the list is read again.
 */
export function ExaminerPickDialog({ words, minWords, busy, error, onSend, onBack, onClose }: {
  words: number
  minWords: number
  busy: boolean
  error: string
  onSend: (examinerId: string) => void
  onBack: () => void
  onClose: () => void
}) {
  const loaded = useExaminerChoices(error)
  const [chosen, setChosen] = useState<string | null>(null)

  const ready = loaded.status === 'ready' ? loaded : null
  const picked = ready?.examiners.find((item) => item.id === chosen && !ready.full.has(item.id)) ?? null
  const longEnough = words >= minWords

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose() }}>
      <DialogContent className="ww-dialog we-pick">
        <DialogTitle className="ww-dialog-title"><UserCheck size={20} aria-hidden="true" /> Chọn giáo viên chấm bài</DialogTitle>
        <DialogDescription>Chỉ giáo viên bạn chọn nhận được bài. Giáo viên không thấy tên bạn khi chấm.</DialogDescription>
        {loaded.status === 'loading' && <p className="ww-muted" role="status">Đang tải danh sách giáo viên…</p>}
        {loaded.status === 'error' && <p className="ww-error" role="alert">Chưa tải được danh sách giáo viên. Hãy quay lại và thử lại.</p>}
        {ready && ready.examiners.length === 0 && <p className="ww-muted" role="status">Hiện chưa có giáo viên nào nhận bài. Hãy thử lại sau hoặc chọn AI chấm.</p>}
        {ready && ready.examiners.length > 0 && (
          <ExaminerList examiners={ready.examiners} full={ready.full} chosen={chosen} busy={busy} onChoose={setChosen} />
        )}
        {!longEnough && <p className="ww-error" role="alert">Cần ít nhất {minWords} từ để gửi giáo viên chấm (hiện có {words}).</p>}
        {error && <p className="ww-error" role="alert">{error}</p>}
        <div className="ww-dialog-actions">
          <button type="button" className="ww-secondary" disabled={busy} onClick={onBack}>Quay lại</button>
          <button type="button" className="ww-primary" disabled={busy || !picked || !longEnough} onClick={() => picked && onSend(picked.id)}>
            {busy ? 'Đang gửi…' : picked ? `Gửi cho ${picked.displayName} · 1 lượt` : 'Chọn một giáo viên'}
          </button>
        </div>
        <p className="ww-dialog-note">Gửi giáo viên chấm dùng 1 lượt của gói Premium, không trừ point. Bài sẽ được khóa sau khi gửi.</p>
      </DialogContent>
    </Dialog>
  )
}
