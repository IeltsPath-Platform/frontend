import { useEffect, useRef, type CSSProperties } from 'react'
import { BookOpen, CalendarDays, CheckCircle2, CirclePlay, ClipboardCheck, Clock3, FilePenLine, GraduationCap, LockKeyhole, RefreshCw, UserRound, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ClassSession } from '~types/classroom'

interface LessonDetailModalProps {
  session: ClassSession
  onClose: () => void
}

const homeworkItems = [
  { title: 'Ngữ pháp', progress: 100, action: 'Đã xong', icon: FilePenLine, accent: 'success' },
  { title: 'Từ vựng', progress: 65, action: 'Tiếp tục', icon: BookOpen, accent: 'primary' },
  { title: 'Quick Test tổng hợp', progress: 0, action: 'Bắt đầu', icon: CheckCircle2, accent: 'warning' },
  { title: 'IELTS Skills', progress: 65, action: 'Tiếp tục', icon: GraduationCap, accent: 'primary' },
] as const

export function LessonDetailModal({ session, onClose }: LessonDetailModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()

    return () => {
      if (dialog?.open) dialog.close()
    }
  }, [])

  return (
    <dialog ref={dialogRef} className="classroom-dialog" aria-labelledby="lesson-dialog-heading" onCancel={(event) => { event.preventDefault(); onClose() }} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="classroom-dialog-panel">
        <header className="classroom-dialog-hero">
          <button type="button" onClick={onClose} className="classroom-dialog-close" aria-label="Đóng chi tiết buổi học"><X aria-hidden="true" size={20} /></button>
          <div className="flex flex-wrap gap-2"><span className="classroom-session-badge">Buổi {session.sessionNumber}</span><span className="classroom-dialog-today">● Hôm nay</span></div>
          <h2 id="lesson-dialog-heading">{session.title}</h2>
          <div className="classroom-dialog-meta"><span><GraduationCap aria-hidden="true" size={15} />Khóa IELTS 3.0</span><span><CalendarDays aria-hidden="true" size={15} />IE3-88</span><span><Clock3 aria-hidden="true" size={15} />{session.time}</span><span><UserRound aria-hidden="true" size={15} />Jessi Thuy Anh</span></div>
        </header>
        <div className="classroom-dialog-content">
          <div className="classroom-dialog-summary">
            <Link className="classroom-join-button" to={`/lessons/${session.id}`}><CirclePlay aria-hidden="true" size={19} />Vào lớp ngay!</Link>
            <div className="classroom-summary-card"><span className="classroom-progress classroom-dialog-progress" style={{ '--session-progress': '65%' } as CSSProperties}><span>65%</span></span><p>Hoàn thành 3 mục để đạt mục tiêu buổi!</p><button type="button"><RefreshCw aria-hidden="true" size={13} />Tiếp tục</button></div>
            <div className="classroom-summary-card classroom-summary-locked"><LockKeyhole aria-hidden="true" size={28} /><p>Hoàn thành bài tập để nhận đánh giá từ Mentor.</p><span><ClipboardCheck aria-hidden="true" size={13} />Chưa chấm bài</span></div>
          </div>
          <div className="classroom-dialog-tabs" aria-label="Nội dung buổi học"><span className="is-active">Homework Hub</span><span>Tài liệu buổi học</span></div>
          <div className="classroom-homework-grid">
            {homeworkItems.map((item) => {
              const Icon = item.icon
              return <article key={item.title} className="classroom-homework-card"><div className="classroom-homework-title"><span><Icon aria-hidden="true" size={18} /></span><h3>{item.title}</h3></div><div className={`classroom-homework-track ${item.accent}`}><span style={{ width: `${item.progress}%` }} /></div><footer><span>{item.progress}%</span><button type="button" className={item.accent === 'warning' ? 'classroom-homework-start' : ''}>{item.action}</button></footer></article>
            })}
          </div>
        </div>
      </section>
    </dialog>
  )
}
