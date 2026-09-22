import { BookOpenCheck, ChevronDown, GraduationCap, Menu, MessageCircleQuestion, Sparkles } from "lucide-react"
import { Link, NavLink } from "react-router-dom"
import { Button } from "@/components/ui/button"

const publicNavItems = [
  { to: "/", label: "Trang chủ", icon: GraduationCap },
  { to: "/auth/register", label: "Lộ trình Band 7.5", icon: Sparkles },
  { to: "/exams", label: "Luyện đề 4 kỹ năng", icon: BookOpenCheck },
  { to: "/assistant", label: "Bài mẫu & AI Review", icon: MessageCircleQuestion },
]

export function PublicHeader() {
  return (
    <header className="public-header">
      <div className="public-header__notice">
        <p><Sparkles aria-hidden="true" /> Khởi động lộ trình IELTS có hướng dẫn — học đúng, thấy rõ tiến bộ.</p>
        <a href="#learning-path">Xem lộ trình học</a>
      </div>
      <div className="public-header__main">
        <Link className="brand brand--public" to="/home" aria-label="IELTSPath home">
          <GraduationCap aria-hidden="true" /> IELTS<span>Path</span>
        </Link>
        <details className="public-nav">
          <summary aria-label="Mở điều hướng"><Menu aria-hidden="true" /></summary>
          <nav aria-label="Điều hướng trang chủ">
            {publicNavItems.map((item) => {
              const Icon = item.icon
              return <NavLink key={item.label} to={item.to} end={item.to === "/"}><Icon aria-hidden="true" /> {item.label}{item.label === "Lộ trình Band 7.5" ? <ChevronDown aria-hidden="true" size={14} /> : null}</NavLink>
            })}
          </nav>
        </details>
        <Button asChild className="public-header__login" size="lg"><Link to="/auth/login">Đăng nhập</Link></Button>
      </div>
    </header>
  )
}
