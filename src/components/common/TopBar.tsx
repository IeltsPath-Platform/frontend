import { ChevronDown, LogOut, Menu } from "lucide-react"
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
  { to: "/practice?skill=LISTENING", label: "Listening" },
  { to: "/practice?skill=READING", label: "Reading" },
  { to: "/practice?skill=WRITING", label: "Writing" },
  { to: "/practice?skill=SPEAKING", label: "Speaking" },
  { to: "/practice?skill=FULL_TEST", label: "Full test" },
]

export function TopBar() {
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const signOut = useAuthStore((state) => state.signOut)
  const navigate = useNavigate()
  const initials = user?.fullName.split(" ").slice(-2).map((part) => part[0]).join("") ?? "IP"

  return (
    <header className="topbar">
      <div className="topbar__inner">
        <Link className="mark" to="/home" aria-label="IELTSPath, trang chủ">
          <span className="mark__stamp" aria-hidden="true">IP</span>
          IELTSPath
        </Link>
        <nav className="topbar__links" aria-label="Điều hướng chính">
          <details className="mega">
            <summary>Luyện đề <ChevronDown aria-hidden="true" size={15} /></summary>
            <div className="mega__panel">
              {skills.map((item) => <Link key={item.label} to={item.to}>{item.label}</Link>)}
              <Link to="/practice">Tất cả đề</Link>
            </div>
          </details>
          {links.map((item) => <NavLink key={item.to} to={item.to}>{item.label}</NavLink>)}
        </nav>
        <div className="topbar__account">
          {isAuthenticated ? (
            <details className="account">
              <summary><span className="avatar" aria-hidden="true">{initials}</span><span className="account__name">{user?.fullName}</span></summary>
              <div className="account__panel">
                <Link to="/dashboard">Bảng tiến độ</Link>
                <Link to="/assistant">Chấm Writing</Link>
                <button type="button" onClick={() => { signOut(); navigate("/home") }}><LogOut aria-hidden="true" size={16} /> Đăng xuất</button>
              </div>
            </details>
          ) : (
            <>
              <Link className="text-link" to="/auth/login">Đăng nhập</Link>
              <Link className="cta" to="/auth/register">Đăng ký miễn phí</Link>
            </>
          )}
        </div>
        <details className="topbar__drawer">
          <summary aria-label="Mở menu"><Menu aria-hidden="true" size={20} /></summary>
          <div>
            {skills.map((item) => <Link key={item.label} to={item.to}>{item.label}</Link>)}
            {links.map((item) => <Link key={item.to} to={item.to}>{item.label}</Link>)}
            {isAuthenticated ? <Link to="/dashboard">Bảng tiến độ</Link> : <Link to="/auth/login">Đăng nhập</Link>}
          </div>
        </details>
      </div>
    </header>
  )
}
