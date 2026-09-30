import type { CSSProperties, ReactNode } from 'react'
import {
  Activity,
  BookOpen,
  Calendar,
  Play,
  SquarePen,
  UserStar,
  type LucideIcon,
} from 'lucide-react'
import './ClassProgressPanel.css'

export interface ClassProgressCourse {
  name: string
  bandRange: string
  startDate: string
  endDate: string
  classProgress: number
  sessionsDone: number
  sessionsTotal: number
}

interface CourseStat {
  value: number
  note: string
}

interface HomeworkScoreStat extends CourseStat {
  max: number
}

export interface ClassProgressStats {
  personalProgress: CourseStat
  homeworkDiligence: CourseStat
  attendance: CourseStat
  homeworkScore: HomeworkScoreStat
}

export interface ClassProgressPanelProps {
  course?: Partial<ClassProgressCourse>
  stats?: {
    personalProgress?: Partial<CourseStat>
    homeworkDiligence?: Partial<CourseStat>
    attendance?: Partial<CourseStat>
    homeworkScore?: Partial<HomeworkScoreStat>
  }
  /** Applies only theme colors; `dark` preserves the original translucent static cards for dark banners. */
  surface?: 'light' | 'dark'
}

const DEFAULT_COURSE: ClassProgressCourse = {
  name: 'IELTS Cất cánh',
  bandRange: '3.0 - IELTS 4.0+',
  startDate: '14/07/2026',
  endDate: '14/09/2026',
  classProgress: 37.5,
  sessionsDone: 12,
  sessionsTotal: 32,
}

const DEFAULT_STATS: ClassProgressStats = {
  personalProgress: { value: 68, note: 'Bạn đang làm tốt!' },
  homeworkDiligence: { value: 78, note: 'Có cố gắng!' },
  attendance: { value: 90, note: 'Bạn vắng 1 buổi học có phép' },
  homeworkScore: { value: 90, max: 100, note: 'Bạn làm rất tốt!' },
}

function StatBar({ value }: { value: number }) {
  return (
    <span className="cls-stat__bar" aria-hidden="true">
      <span style={{ width: `${value}%` } as CSSProperties} />
    </span>
  )
}

function StatCard({
  icon: Icon,
  title,
  note,
  children,
  featured = false,
}: {
  icon: LucideIcon
  title: string
  note: string
  children: ReactNode
  featured?: boolean
}) {
  return (
    <article className={`cls-stat${featured ? ' cls-stat--featured' : ''}`}>
      <div className="cls-stat__head">
        <Icon aria-hidden="true" />
        <h3>{title}</h3>
      </div>
      <div className="cls-stat__body">
        <p>{note}</p>
        {children}
      </div>
    </article>
  )
}

/**
 * Original `cls-panel` packaged without its former page, stylesheet, or mock-data dependency.
 * Layout, dimensions, class names and hover behavior remain unchanged; only colors use local theme tokens.
 */
export function ClassProgressPanel({ course, stats, surface = 'light' }: ClassProgressPanelProps) {
  const resolvedCourse = { ...DEFAULT_COURSE, ...course }
  const resolvedStats: ClassProgressStats = {
    personalProgress: { ...DEFAULT_STATS.personalProgress, ...stats?.personalProgress },
    homeworkDiligence: { ...DEFAULT_STATS.homeworkDiligence, ...stats?.homeworkDiligence },
    attendance: { ...DEFAULT_STATS.attendance, ...stats?.attendance },
    homeworkScore: { ...DEFAULT_STATS.homeworkScore, ...stats?.homeworkScore },
  }

  return (
    <aside className={`cls-panel${surface === 'dark' ? ' cls-panel--dark' : ''}`} aria-label="Tiến độ lớp học">
      <article className="cls-course">
        <header className="cls-course__head">
          <h2>
            <Play aria-hidden="true" />
            {resolvedCourse.name}
          </h2>
          <strong>{resolvedCourse.bandRange}</strong>
        </header>
        <div className="cls-course__body">
          <div>
            <p className="cls-course__label">
              <Activity aria-hidden="true" />
              Tiến độ lớp học chuẩn
            </p>
            <dl className="cls-course__dates">
              <div>
                <dt>Khai giảng:</dt>
                <dd>{resolvedCourse.startDate}</dd>
              </div>
              <div>
                <dt>Kết thúc:</dt>
                <dd>{resolvedCourse.endDate}</dd>
              </div>
            </dl>
          </div>
          <div className="cls-course__progress">
            <span className="cls-course__badge">{resolvedCourse.classProgress}%</span>
            <div>
              <p className="cls-course__count">
                <strong>{resolvedCourse.sessionsDone}</strong>/ {resolvedCourse.sessionsTotal}
              </p>
              <p className="cls-course__remain">Còn {resolvedCourse.sessionsTotal - resolvedCourse.sessionsDone} buổi kết thúc</p>
            </div>
          </div>
        </div>
      </article>

      <div className="cls-panel__grid">
        <StatCard icon={UserStar} title="Tiến độ cá nhân" note={resolvedStats.personalProgress.note} featured>
          <strong className="cls-stat__value">{resolvedStats.personalProgress.value}%</strong>
          <StatBar value={resolvedStats.personalProgress.value} />
        </StatCard>
        <StatCard icon={BookOpen} title="Chuyên cần bài tập" note={resolvedStats.homeworkDiligence.note}>
          <strong className="cls-stat__value">{resolvedStats.homeworkDiligence.value}%</strong>
          <StatBar value={resolvedStats.homeworkDiligence.value} />
        </StatCard>
        <StatCard icon={Calendar} title="Chuyên cần tham gia lớp" note={resolvedStats.attendance.note}>
          <span className="cls-stat__disc">{resolvedStats.attendance.value}%</span>
        </StatCard>
        <StatCard icon={SquarePen} title="Điểm trung bình bài tập" note={resolvedStats.homeworkScore.note}>
          <strong className="cls-stat__value">
            {resolvedStats.homeworkScore.value}
            <small>/ {resolvedStats.homeworkScore.max}</small>
          </strong>
          <StatBar value={resolvedStats.homeworkScore.value} />
        </StatCard>
      </div>
    </aside>
  )
}
