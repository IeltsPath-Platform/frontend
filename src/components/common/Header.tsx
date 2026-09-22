import { ChevronDown, GraduationCap, LayoutDashboard, LogOut, Menu, UserRound } from "lucide-react"
import { Link, NavLink, useNavigate } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/features/auth/store/useAuthStore"

const navItems = [
  { to: "/exams", label: "Luyện thi IELTS" },
  { to: "/exams", label: "Kho đề thi" },
  { to: "/dashboard", label: "Lộ trình học" },
  { to: "/assistant", label: "AI Assistant" },
]

export function Header() {
  const user = useAuthStore((state) => state.user)
  const signOut = useAuthStore((state) => state.signOut)
  const navigate = useNavigate()
  const initials = user?.fullName.split(" ").slice(-2).map((name) => name[0]).join("") ?? "IP"

  const handleSignOut = () => {
    signOut()
    navigate("/auth/login")
  }

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="brand" to="/dashboard" aria-label="IELTSPath dashboard">
          <GraduationCap aria-hidden="true" /> IELTS<span>Path</span>
        </Link>
        <details className="site-nav">
          <summary aria-label="Mở điều hướng"><Menu aria-hidden="true" size={20} /></summary>
          <nav aria-label="Điều hướng chính">
            {navItems.map((item, index) => (
              <NavLink key={`${item.label}-${index}`} to={item.to} end={item.to === "/dashboard"}>
                {item.label}
                {index === 0 ? <ChevronDown aria-hidden="true" size={15} /> : null}
              </NavLink>
            ))}
          </nav>
        </details>
        <details className="user-menu">
          <summary>
            <span className="avatar" aria-hidden="true">{initials}</span>
            <span className="user-menu__name">{user?.fullName ?? "Đang tải"}</span>
            <Badge variant="secondary">Target {user?.targetBand ?? "–"}</Badge>
            <ChevronDown aria-hidden="true" size={16} />
          </summary>
          <div className="user-menu__panel">
            <Link to="/dashboard"><LayoutDashboard aria-hidden="true" /> Trang cá nhân</Link>
            <Link to="/dashboard#history"><UserRound aria-hidden="true" /> Lịch sử làm bài</Link>
            <Button variant="ghost" onClick={handleSignOut}><LogOut aria-hidden="true" /> Đăng xuất</Button>
          </div>
        </details>
      </div>
    </header>
  )
}
