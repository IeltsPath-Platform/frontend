import { useState } from "react"
import { Link, NavLink } from "react-router-dom"
import { ArrowRight, MessageCircle } from "lucide-react"
import mascot from "@/assets/triceratops-class-mascot.png"
import { MentorChatDrawer } from "@/features/class/components/overlays"
import { useAuthStore } from "@/features/auth/store/useAuthStore"
import { CLASS_PROFILE, OVERVIEW_SIDEBAR, OVERVIEW_STATS } from "@/lib/mock/class"

export function OverviewPage() {
  const user = useAuthStore((state) => state.user)
  const name = user?.fullName ?? "Học viên"
  const [mentorOpen, setMentorOpen] = useState(false)

  return (
    <main className="cls-page cls-overview" id="main-content" tabIndex={-1}>
      <div className="cls-overview__layout">
        <aside className="cls-appside" aria-label="Menu học viên">
          <nav>
            {OVERVIEW_SIDEBAR.map((item) => (
              <NavLink
                key={item.id}
                to={item.to}
                className={({ isActive }) => (isActive ? "is-active" : undefined)}
                end={item.id === "overview"}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="cls-appside__mentor">
            <p>Mentor của bạn</p>
            <div>
              <span aria-hidden="true">{CLASS_PROFILE.mentor.initial}</span>
              <div>
                <strong>{CLASS_PROFILE.mentor.name}</strong>
                <small>{CLASS_PROFILE.mentor.title}</small>
              </div>
            </div>
            <button type="button" onClick={() => setMentorOpen(true)}>
              <MessageCircle aria-hidden="true" />
              Nhắn Mentor
            </button>
          </div>
        </aside>

        <div className="cls-overview__main">
          <section className="cls-welcome" aria-labelledby="overview-hello">
            <div className="cls-welcome__mascot" aria-hidden="true">
              <img src={mascot} alt="" width={220} height={220} decoding="async" />
              <span className="cls-welcome__online" />
            </div>
            <div>
              <h1 id="overview-hello">Xin chào, {name}</h1>
              <p>
                Bài học tiếp theo: {CLASS_PROFILE.nextLesson.title} · {CLASS_PROFILE.nextLesson.when}
              </p>
              <Link className="cls-welcome__cta" to="/class">
                Tiếp tục học
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </section>

          <section className="cls-overview-stats" aria-labelledby="overview-stats-title">
            <h2 id="overview-stats-title">Dữ liệu Học Tổng Quan</h2>
            <div className="cls-overview-stats__grid">
              {OVERVIEW_STATS.map((stat) => (
                <article key={stat.id} className={`cls-ov-stat cls-ov-stat--${stat.tone}`}>
                  <p>{stat.label}</p>
                  <strong>{stat.value}</strong>
                  <span>{stat.note}</span>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>

      <MentorChatDrawer open={mentorOpen} onClose={() => setMentorOpen(false)} />
    </main>
  )
}
