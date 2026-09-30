import type { CSSProperties } from 'react'
import { CheckCircle2, Clock3, LockKeyhole, PlayCircle } from 'lucide-react'
import type { ClassSession } from '~types/classroom'

interface ScheduleCardProps {
  session: ClassSession
  onSelect: (session: ClassSession) => void
}

const statusMeta = {
  completed: { label: 'Đã học', className: 'classroom-status-completed', action: 'Xem lại buổi học', icon: CheckCircle2 },
  today: { label: 'Hôm nay', className: 'classroom-status-today', action: 'Vào lớp ngay!', icon: PlayCircle },
  upcoming: { label: 'Sắp diễn ra', className: 'classroom-status-upcoming', action: 'Chưa đến giờ học', icon: Clock3 },
  locked: { label: 'Chờ mở lớp', className: 'classroom-status-locked', action: 'Chờ mở lớp', icon: LockKeyhole },
} as const

export function ScheduleCard({ session, onSelect }: ScheduleCardProps) {
  const status = statusMeta[session.status]
  const ActionIcon = status.icon
  const progressStyle = { '--session-progress': `${session.progressPercentage}%` } as CSSProperties

  return (
    <article className={`classroom-session ${session.status === 'today' ? 'classroom-session-active' : ''}`}>
      <button className="classroom-session-button" type="button" onClick={() => onSelect(session)} aria-label={`Xem chi tiết ${session.title}, ${session.weekday} ${session.dateLabel}`}>
        <header className="classroom-session-heading">
          <div><span className="classroom-session-badge">Buổi {session.sessionNumber}</span><p>{session.courseLevel}</p></div>
          <div className="text-right"><p>{session.weekday}</p><strong>{session.dateLabel}</strong></div>
        </header>
        <div className="classroom-session-content">
          <h3>{session.title}</h3>
          <p><Clock3 aria-hidden="true" size={15} />{session.time}</p>
          <div className="classroom-session-footer">
            <span className={`classroom-session-action ${status.className}`}><ActionIcon aria-hidden="true" size={16} />{status.action}</span>
            <span className="classroom-progress" style={progressStyle}><span>{session.progressPercentage}%</span></span>
          </div>
        </div>
      </button>
    </article>
  )
}
