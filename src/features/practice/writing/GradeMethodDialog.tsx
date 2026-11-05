import { Sparkles, UserCheck, Wallet } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { GradeOptions } from './gradeOptions'
import './writing-examiner.css'

/**
 * "Hoàn thành" asks how the essay is graded: by a teacher (Premium, one grading credit) or by the AI (points). Each card
 * says whether it is open and why not; the AI card leads to the top-up dialog when the points fall short.
 */
export function GradeMethodDialog({ options, context, onTeacher, onAi, onClose, copy }: {
  options: GradeOptions
  context: string
  onTeacher: () => void
  onAi: () => void
  onClose: () => void
  /** Wording for another skill; the defaults are the Writing ones. */
  copy?: { description?: string; teacher?: string; ai?: string }
}) {
  const { teacher, ai } = options
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="ww-dialog we-method">
        <DialogTitle className="ww-dialog-title">Chọn cách chấm bài</DialogTitle>
        <DialogDescription>{copy?.description ?? 'Bài viết của bạn có thể được giáo viên hoặc AI chấm. Bạn chọn cách nào cũng được.'}</DialogDescription>
        <p className="ww-dialog-context">{context}</p>
        <div className="we-method-cards">
          <section className={`we-method-card${teacher.enabled ? '' : ' is-off'}`} aria-label="Giáo viên chấm">
            <h3><UserCheck size={18} aria-hidden="true" /> Giáo viên chấm</h3>
            <p>{copy?.teacher ?? 'Giáo viên IELTS chấm 4 tiêu chí, ghi lỗi ngay trên bài và nhận xét chi tiết. Giáo viên có tối đa 48 giờ để chấm.'}</p>
            <p className="we-method-status">
              {teacher.enabled
                ? (teacher.credits === null ? 'Dùng 1 lượt giáo viên chấm của gói Premium.' : `Còn ${teacher.credits} lượt giáo viên chấm (gói Premium).`)
                : teacher.reason}
            </p>
            <button type="button" className="ww-primary" disabled={!teacher.enabled} onClick={onTeacher}>Chọn giáo viên</button>
          </section>
          <section className={`we-method-card${ai.enabled ? '' : ' is-off'}`} aria-label="AI chấm">
            <h3><Sparkles size={18} aria-hidden="true" /> AI chấm</h3>
            <p>{copy?.ai ?? 'AI chấm ngay trong vài giây, trả band, lỗi cần sửa và gợi ý cải thiện.'}</p>
            <p className="we-method-status">
              {ai.reason ? ai.reason : <>Chi phí {ai.cost} point{ai.balance === null ? '' : ` · số dư ${ai.balance} point`}{ai.enabled ? '' : ` · còn thiếu ${ai.shortBy} point`}</>}
            </p>
            <button type="button" className="ww-primary" disabled={!!ai.reason} onClick={onAi}>
              {ai.reason ? 'Chưa khả dụng' : ai.enabled ? `Chấm bằng AI · ${ai.cost} point` : <><Wallet size={16} aria-hidden="true" />Nạp point để AI chấm</>}
            </button>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
