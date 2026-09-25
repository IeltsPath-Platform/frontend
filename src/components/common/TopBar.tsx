import { useEffect, useState } from "react"
import { Link, NavLink, useNavigate } from "react-router-dom"
import { useAuthStore } from "@/features/auth/store/useAuthStore"

const links = [
  { to: "/roadmap", label: "Lộ trình 7.0" },
  { to: "/vocabulary", label: "Từ vựng" },
  { to: "/dictation", label: "Dictation" },
  { to: "/community", label: "Cộng đồng" },
  { to: "/blog", label: "Blog" },
]

const skills = [
  {
    to: "/practice?skill=LISTENING",
    label: "Listening",
    color: "#0284c7",
    bg: "#e0f2fe",
    desc: "Luyện nghe bắt keyword",
    tag: "40 câu",
  },
  {
    to: "/practice?skill=READING",
    label: "Reading",
    color: "#d97706",
    bg: "#fef3c7",
    desc: "Định vị vị trí câu trả lời",
    tag: "3 Passages",
  },
  {
    to: "/practice?skill=WRITING",
    label: "Writing",
    color: "#e11d48",
    bg: "#ffe4e6",
    desc: "Task 1 & Task 2 sửa lỗi AI",
    tag: "Chấm 30s",
  },
  {
    to: "/practice?skill=SPEAKING",
    label: "Speaking",
    color: "#059669",
    bg: "#d1fae5",
    desc: "Luyện phát âm & phản xạ",
    tag: "Part 1-3",
  },
  {
    to: "/practice?skill=FULL_TEST",
    label: "Full test",
    color: "#7c3aed",
    bg: "#ede9fe",
    desc: "Thi thử áp lực giờ thật",
    tag: "Mock Exam",
  },
]

export function TopBar() {
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const signOut = useAuthStore((state) => state.signOut)
  const toggleTier = useAuthStore((state) => state.toggleTier)
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)

  const isPremium = user?.tier === "PREMIUM"
  const points = user?.points ?? 120

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const initials = user?.fullName.split(" ").slice(-2).map((part) => part[0]).join("") ?? "IP"

  return (
    <header className={`topbar ${scrolled ? "topbar--scrolled" : ""} anim-entrance-header`}>
      <div className="topbar__inner">
        {/* Brand Logo on the left (clean, without PRO) */}
        <Link className="mark" to="/home" aria-label="IELTSPath, trang chủ">
          <span className="mark__stamp" aria-hidden="true">IP</span>
          <span className="mark__text">
            IELTS<strong>Path</strong>
          </span>
        </Link>

        {/* Navigation Links in Center */}
        <nav className="topbar__links" aria-label="Điều hướng chính">
          <details className="mega">
            <summary>
              <span>Luyện đề</span>
              <span className="dropdown-caret" aria-hidden="true"></span>
            </summary>
            <div className="mega__panel">
              <div className="mega__grid">
                {skills.map((item) => (
                  <Link key={item.label} to={item.to} className="mega__item">
                    <span
                      className="mega__dot"
                      style={{ backgroundColor: item.color }}
                      aria-hidden="true"
                    ></span>
                    <div className="mega__info">
                      <div className="mega__title-row">
                        <strong>{item.label}</strong>
                        <span className="mega__tag" style={{ color: item.color, backgroundColor: item.bg }}>
                          {item.tag}
                        </span>
                      </div>
                      <small>{item.desc}</small>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="mega__footer">
                <Link to="/practice">
                  Toàn bộ 186+ đề thi Cambridge & Actual Test →
                </Link>
              </div>
            </div>
          </details>

          {links.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Account actions: Free (Points) vs Premium (Animated Halo) */}
        <div className="topbar__account">
          {isAuthenticated ? (
            <details className="account">
              <summary className="account-summary-btn" title="Tài khoản & Gói học viên">
                <div className={`avatar-tier-wrap ${isPremium ? "avatar-tier-wrap--premium" : "avatar-tier-wrap--free"}`}>
                  {isPremium && (
                    <div className="premium-halo-ring" aria-hidden="true">
                      <span className="premium-halo-glow" />
                      <span className="premium-halo-sparkle premium-halo-sparkle--1" />
                      <span className="premium-halo-sparkle premium-halo-sparkle--2" />
                      <span className="premium-halo-sparkle premium-halo-sparkle--3" />
                    </div>
                  )}
                  <span
                    className={`avatar ${isPremium ? "avatar--premium-circle" : "avatar--free-circle"}`}
                    aria-hidden="true"
                  >
                    {initials}
                  </span>
                  <span
                    className={`avatar-tier-pill ${isPremium ? "avatar-tier-pill--premium" : "avatar-tier-pill--free"}`}
                    title={isPremium ? "Gói Premium - Không giới hạn chấm AI" : "Gói Free - Dùng điểm Point"}
                  >
                    {isPremium ? "Premium" : "Free"}
                  </span>
                </div>
                <span className="account__identity">
                  <span className="account__name">{user?.fullName}</span>
                  {isPremium ? (
                    <span className="account__tier account__tier--premium">
                      <span className="tier-star-icon">★</span> Premium Member
                    </span>
                  ) : (
                    <span
                      className="account__tier account__tier--points"
                      title="Số Point chấm AI hiện có (tự trừ khi chấm bài)"
                    >
                      <span className="tier-points-icon">⚡</span> {points} Points
                    </span>
                  )}
                </span>
              </summary>
              <div className="account__panel">
                <div className={`account__tier-card account__tier-card--${isPremium ? "premium" : "free"}`}>
                  <div className="account__tier-card-head">
                    <span className="account__tier-card-badge">
                      {isPremium ? "★ Gói Premium" : "Gói Miễn phí (Free)"}
                    </span>
                    {isPremium ? (
                      <span className="account__tier-unlimited">AI Không giới hạn</span>
                    ) : (
                      <span className="account__tier-points-val">⚡ {points} Points</span>
                    )}
                  </div>
                  <p className="account__tier-card-desc">
                    {isPremium
                      ? "Không giới hạn lượt chấm AI Writing & Speaking chi tiết."
                      : "Điểm dùng để chấm bài AI (tự động trừ khi chấm bài)."}
                  </p>
                  <button
                    type="button"
                    className="account__tier-switch-btn"
                    onClick={() => toggleTier()}
                    title="Bấm để chuyển đổi gói demo"
                  >
                    {isPremium ? "Đổi sang gói Free (xem Points)" : "Nâng cấp Premium (xem Animation)"}
                  </button>
                </div>

                <div className="account__panel-links">
                  <Link to="/dashboard">Bảng tiến độ học tập</Link>
                  <Link to="/assistant">Chấm bài AI Writing</Link>
                  <button
                    type="button"
                    onClick={() => {
                      signOut()
                      navigate("/home")
                    }}
                  >
                    Đăng xuất
                  </button>
                </div>
              </div>
            </details>
          ) : (
            <>
              <Link className="text-link" to="/auth/login">
                Đăng nhập
              </Link>
              <Link className="cta cta--3d" to="/auth/register">
                <span>Bắt đầu miễn phí</span>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Drawer (no icons, pure CSS hamburger) */}
        <details className="topbar__drawer">
          <summary aria-label="Mở menu điều hướng">
            <span className="hamburger-box" aria-hidden="true">
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
            </span>
          </summary>
          <div>
            <div className="topbar__drawer-section">
              <p className="topbar__drawer-title">Kỹ năng luyện thi</p>
              {skills.map((item) => (
                <Link key={item.label} to={item.to} className="topbar__drawer-link">
                  <span className="mega__dot" style={{ backgroundColor: item.color }} aria-hidden="true"></span>
                  <span>{item.label}</span>
                  <span className="topbar__drawer-tag" style={{ color: item.color, backgroundColor: item.bg }}>
                    {item.tag}
                  </span>
                </Link>
              ))}
            </div>

            <div className="topbar__drawer-section">
              <p className="topbar__drawer-title">Tiện ích học tập</p>
              {links.map((item) => (
                <Link key={item.to} to={item.to} className="topbar__drawer-link">
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="topbar__drawer-actions">
              {isAuthenticated ? (
                <Link to="/dashboard" className="cta cta--3d">Bảng tiến độ</Link>
              ) : (
                <>
                  <Link to="/auth/login" className="text-link">Đăng nhập</Link>
                  <Link to="/auth/register" className="cta cta--3d">Đăng ký miễn phí</Link>
                </>
              )}
            </div>
          </div>
        </details>
      </div>
    </header>
  )
}
