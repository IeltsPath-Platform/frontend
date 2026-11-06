import { useState } from 'react'
import { CircleAlert, Sparkles, TicketCheck, UserCheck, Wallet } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { GradeOptions } from './gradeOptions'
import './writing-examiner.css'

type Way = 'teacher' | 'ai'

/**
 * "Hoàn thành" asks how the essay is graded: by a teacher (Premium, one grading credit) or by the AI (points). Each card
 * says whether it is open and why not; the AI card leads to the top-up dialog when the points fall short. The card the
 * learner points at or tabs to is the one highlighted, as in the choice between a real and a practice test; the button
 * inside a card is what chooses it.
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
  // A way is open while its button can be pressed: the AI one also leads to the top-up when the points fall short.
  // Opens on the way that can be used, the AI first; a way that is closed is never the highlighted one.
  const open = (way: Way) => (way === 'ai' ? !ai.reason : teacher.enabled)
  const [active, setActive] = useState<Way | null>(!ai.reason ? 'ai' : teacher.enabled ? 'teacher' : null)
  const point = (way: Way) => () => { if (open(way)) setActive(way) }
  const cardClass = (way: Way) => `we-method-card${open(way) ? '' : ' is-off'}${active === way && open(way) ? ' selected' : ''}`
  return (
    <Dialog open onOpenChange={(opened) => { if (!opened) onClose() }}>
      <DialogContent className="ww-dialog we-method">
        <div className="we-method-top">
          <DialogTitle className="ww-dialog-title">Chọn cách chấm bài</DialogTitle>
          <p className="ww-dialog-context">{context}</p>
        </div>
        <div className="we-method-body">
          <DialogDescription>{copy?.description ?? 'Bài viết của bạn có thể được giáo viên hoặc AI chấm. Bạn chọn cách nào cũng được.'}</DialogDescription>
          <div className="we-method-cards">
            <section className={cardClass('teacher')} aria-label="Giáo viên chấm" onFocus={point('teacher')} onMouseEnter={point('teacher')}>
              <header className="we-method-head">
                <span aria-hidden="true" className="we-method-icon"><UserCheck size={22} strokeWidth={1.75} /></span>
                <h3>Giáo viên chấm</h3>
              </header>
              <p className="we-method-desc">{copy?.teacher ?? 'Giáo viên IELTS chấm 4 tiêu chí, ghi lỗi ngay trên bài và nhận xét chi tiết. Giáo viên có tối đa 48 giờ để chấm.'}</p>
              <p className={`we-method-status${teacher.enabled ? '' : ' is-warn'}`}>
                {teacher.enabled ? <TicketCheck aria-hidden="true" size={16} /> : <CircleAlert aria-hidden="true" size={16} />}
                {teacher.enabled
                  ? (teacher.credits === null ? 'Dùng 1 lượt giáo viên chấm của gói Premium.' : `Còn ${teacher.credits} lượt giáo viên chấm (gói Premium).`)
                  : teacher.reason}
              </p>
              <button type="button" className="ww-primary" disabled={!teacher.enabled} onClick={onTeacher}>Chọn giáo viên</button>
            </section>
            <section className={cardClass('ai')} aria-label="AI chấm" onFocus={point('ai')} onMouseEnter={point('ai')}>
              <header className="we-method-head">
                <span aria-hidden="true" className="we-method-icon"><Sparkles size={22} strokeWidth={1.75} /></span>
                <h3>AI chấm</h3>
              </header>
              <p className="we-method-desc">{copy?.ai ?? 'AI chấm ngay trong vài giây, trả band, lỗi cần sửa và gợi ý cải thiện.'}</p>
              <p className={`we-method-status${ai.enabled && !ai.reason ? '' : ' is-warn'}`}>
                {ai.enabled && !ai.reason ? <Wallet aria-hidden="true" size={16} /> : <CircleAlert aria-hidden="true" size={16} />}
                {ai.reason ? ai.reason : <>Chi phí {ai.cost} point{ai.balance === null ? '' : ` · số dư ${ai.balance} point`}{ai.enabled ? '' : ` · còn thiếu ${ai.shortBy} point`}</>}
              </p>
              <button type="button" className="ww-primary" disabled={!!ai.reason} onClick={onAi}>
                {ai.reason ? 'Chưa khả dụng' : ai.enabled ? `Chấm bằng AI · ${ai.cost} point` : <><Wallet size={16} aria-hidden="true" />Nạp point để AI chấm</>}
              </button>
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
