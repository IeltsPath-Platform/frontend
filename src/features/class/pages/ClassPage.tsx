import { useState, type CSSProperties, type ReactNode } from "react"
import {
  Activity,
  BookOpen,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CirclePlay,
  Clock3,
  ClockFading,
  GraduationCap,
  History,
  List,
  NotebookPen,
  Play,
  SquarePen,
  UserStar,
  type LucideIcon,
} from "lucide-react"
import mascot from "@/assets/triceratops-class-mascot.png"
import { ClassSubNav } from "@/features/class/components/ClassSubNav"
import {
  ConfirmDialog,
  MentorChatDrawer,
  ToastStack,
  useLmsToasts,
} from "@/features/class/components/overlays"
import { useAuthStore } from "@/features/auth/store/useAuthStore"
import {
  CLASS_MONTH_LABEL,
  CLASS_PROFILE,
  CLASS_SESSIONS,
  CLASS_STATS,
  type ClassSession,
  type ClassSessionStatus,
} from "@/lib/mock/class"

const sessionAction: Record<ClassSessionStatus, { label: string; icon: LucideIcon }> = {
  done: { label: "Xem lại buổi học", icon: History },
  today: { label: "Vào lớp ngay!", icon: CirclePlay },
  upcoming: { label: "Chưa đến giờ học", icon: Clock3 },
  waiting: { label: "Chờ mở lớp", icon: ClockFading },
}

function ProgressRing({ value, tone, size = "md" }: { value: number; tone: string; size?: "sm" | "md" }) {
  return (
    <span
      className={`cls-ring cls-ring--${tone} cls-ring--${size}`}
      style={{ "--value": value } as CSSProperties}
      role="img"
      aria-label={`${value}%`}
    >
      <span>{value}%</span>
    </span>
  )
}

function StatBar({ value }: { value: number }) {
  return (
    <span className="cls-stat__bar" aria-hidden="true">
      <span style={{ width: `${value}%` }} />
    </span>
  )
}

function SessionCard({
  session,
  onJoin,
}: {
  session: ClassSession
  onJoin: (session: ClassSession) => void
}) {
  const action = sessionAction[session.status]
  const ActionIcon = action.icon
  const ringTone = session.status === "done" ? "done" : session.status === "upcoming" ? "upcoming" : session.progress > 0 ? "brand" : "idle"
  const canJoin = session.status === "today" || session.status === "done"

  return (
    <article className={`cls-session cls-session--${session.status}`}>
      <header className="cls-session__head">
        <div className="cls-session__meta">
          <div className="cls-session__tags">
            <span className="cls-session__badge">Buổi {session.sessionNo}</span>
            {session.status === "done" ? <span className="cls-session__chip cls-session__chip--done">Đã học</span> : null}
            {session.status === "today" ? <span className="cls-session__chip cls-session__chip--today">Hôm nay</span> : null}
          </div>
          <span className="cls-session__course">{session.courseLabel}</span>
        </div>
        <div className="cls-session__date">
          <span>{session.weekday}</span>
          <strong>{session.dateLabel}</strong>
        </div>
      </header>

      <div className="cls-session__body">
        <p className="cls-session__title">
          <NotebookPen aria-hidden="true" />
          {session.title}
        </p>
        <p className="cls-session__time">
          <Clock3 aria-hidden="true" />
          {session.timeRange}
        </p>
      </div>

      <footer className="cls-session__foot">
        <button
          type="button"
          className="cls-session__action"
          disabled={!canJoin && session.status !== "done"}
          onClick={() => {
            if (canJoin) onJoin(session)
          }}
        >
          <ActionIcon aria-hidden="true" />
          {action.label}
        </button>
        <ProgressRing value={session.progress} tone={ringTone} />
      </footer>
    </article>
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
    <article className={`cls-stat${featured ? " cls-stat--featured" : ""}`}>
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

export function ClassPage() {
  const user = useAuthStore((state) => state.user)
  const [view, setView] = useState<"month" | "roadmap">("month")
  const [mentorOpen, setMentorOpen] = useState(false)
  const [joinSession, setJoinSession] = useState<ClassSession | null>(null)
  const { toasts, push, dismiss } = useLmsToasts()
  const { course, mentor } = CLASS_PROFILE

  return (
    <main className="cls-page" id="main-content" tabIndex={-1}>
      <section className="cls-hero" aria-labelledby="cls-hero-title">
        <div className="cls-hero__inner">
          <div className="cls-hero__intro">
            <div className="cls-hero__mascot" aria-hidden="true">
              <span className="cls-hero__orbit" />
              <span className="cls-hero__spark cls-hero__spark--a" />
              <span className="cls-hero__spark cls-hero__spark--b" />
              <img src={mascot} alt="" width={407} height={460} decoding="async" fetchPriority="high" />
            </div>

            <h1 id="cls-hero-title">LỚP HỌC CỦA TÔI</h1>
            <p className="cls-hero__hello">Xin chào {user?.fullName ?? "Học viên"}</p>

            <ul className="cls-hero__facts">
              <li className="cls-hero__fact">
                <CalendarDays aria-hidden="true" />
                Mã lớp: {CLASS_PROFILE.classCode}
              </li>
              <li className="cls-hero__fact">
                <GraduationCap aria-hidden="true" />
                Giáo viên: {CLASS_PROFILE.teacherName}
              </li>
              <li className="cls-hero__fact cls-hero__fact--wide">
                <Clock3 aria-hidden="true" />
                Thời gian:&nbsp; {CLASS_PROFILE.scheduleDays}
                <span className="cls-hero__divider" aria-hidden="true" />
                {CLASS_PROFILE.scheduleTime}
              </li>
            </ul>
          </div>

          <aside className="cls-panel" aria-label="Tiến độ lớp học">
            <article className="cls-course">
              <header className="cls-course__head">
                <h2>
                  <Play aria-hidden="true" />
                  {course.name}
                </h2>
                <strong>{course.bandRange}</strong>
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
                      <dd>{course.startDate}</dd>
                    </div>
                    <div>
                      <dt>Kết thúc:</dt>
                      <dd>{course.endDate}</dd>
                    </div>
                  </dl>
                </div>
                <div className="cls-course__progress">
                  <span className="cls-course__badge">{course.classProgress}%</span>
                  <div>
                    <p className="cls-course__count">
                      <strong>{course.sessionsDone}</strong>/ {course.sessionsTotal}
                    </p>
                    <p className="cls-course__remain">Còn {course.sessionsTotal - course.sessionsDone} buổi kết thúc</p>
                  </div>
                </div>
              </div>
            </article>

            <div className="cls-panel__grid">
              <StatCard icon={UserStar} title="Tiến độ cá nhân" note={CLASS_STATS.personalProgress.note} featured>
                <strong className="cls-stat__value">{CLASS_STATS.personalProgress.value}%</strong>
                <StatBar value={CLASS_STATS.personalProgress.value} />
              </StatCard>
              <StatCard icon={BookOpen} title="Chuyên cần bài tập" note={CLASS_STATS.homeworkDiligence.note}>
                <strong className="cls-stat__value">{CLASS_STATS.homeworkDiligence.value}%</strong>
                <StatBar value={CLASS_STATS.homeworkDiligence.value} />
              </StatCard>
              <StatCard icon={Calendar} title="Chuyên cần tham gia lớp" note={CLASS_STATS.attendance.note}>
                <span className="cls-stat__disc">{CLASS_STATS.attendance.value}%</span>
              </StatCard>
              <StatCard icon={SquarePen} title="Điểm trung bình bài tập" note={CLASS_STATS.homeworkScore.note}>
                <strong className="cls-stat__value">
                  {CLASS_STATS.homeworkScore.value}
                  <small>/ {CLASS_STATS.homeworkScore.max}</small>
                </strong>
                <StatBar value={CLASS_STATS.homeworkScore.value} />
              </StatCard>
            </div>
          </aside>
        </div>
      </section>

      <ClassSubNav />

      <div className="cls-content cls-sheet">
        <section className="cls-toolbar" aria-label="Chọn tháng và chế độ xem">
          <div className="cls-toolbar__left">
            <h2>{CLASS_MONTH_LABEL}</h2>
            <button
              type="button"
              className="cls-toolbar__live"
              onClick={() => {
                const today = CLASS_SESSIONS.find((s) => s.status === "today")
                if (today) setJoinSession(today)
              }}
            >
              Join class! Vào lớp ngay
            </button>
            <div className="cls-toolbar__nav">
              <button type="button" aria-label="Tháng trước">
                <ChevronLeft aria-hidden="true" />
              </button>
              <button type="button" aria-label="Tháng sau">
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="cls-toolbar__right">
            <div className="cls-toolbar__segment" role="tablist" aria-label="Chế độ xem">
              <button type="button" role="tab" aria-selected={view === "month"} onClick={() => setView("month")}>
                Xem theo tháng
              </button>
              <button type="button" role="tab" aria-selected={view === "roadmap"} onClick={() => setView("roadmap")}>
                Xem theo lộ trình
              </button>
            </div>
            <button type="button" className="cls-toolbar__icon is-active" aria-label="Dạng lịch">
              <CalendarDays aria-hidden="true" />
            </button>
            <button type="button" className="cls-toolbar__icon" aria-label="Dạng danh sách">
              <List aria-hidden="true" />
            </button>
          </div>
        </section>

        <section className="cls-grid" aria-label="Thời khoá biểu">
          {CLASS_SESSIONS.map((session) => (
            <div key={session.id} id={session.id}>
              <SessionCard session={session} onJoin={setJoinSession} />
            </div>
          ))}
        </section>

        <aside className="cls-mentor" aria-label="Mentor của bạn">
          <p className="cls-mentor__label">Mentor của bạn</p>
          <div className="cls-mentor__row">
            <span className="cls-mentor__avatar" aria-hidden="true">
              {mentor.initial}
            </span>
            <div>
              <strong>{mentor.name}</strong>
              <p>{mentor.title}</p>
            </div>
          </div>
          <button type="button" className="cls-mentor__cta" onClick={() => setMentorOpen(true)}>
            Nhắn Mentor
          </button>
        </aside>
      </div>

      <MentorChatDrawer open={mentorOpen} onClose={() => setMentorOpen(false)} />

      <ConfirmDialog
        open={Boolean(joinSession)}
        onClose={() => setJoinSession(null)}
        title={joinSession?.status === "done" ? "Xem lại buổi học?" : "Vào lớp học?"}
        description={
          joinSession
            ? `${joinSession.title} · ${joinSession.weekday} ${joinSession.dateLabel} · ${joinSession.timeRange}`
            : ""
        }
        confirmLabel={joinSession?.status === "done" ? "Xem lại" : "Vào lớp ngay"}
        onConfirm={() => push(joinSession?.status === "done" ? "Đang mở bản ghi buổi học" : "Đang kết nối phòng học")}
      />

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </main>
  )
}
