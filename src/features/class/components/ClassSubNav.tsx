import { NavLink } from "react-router-dom"
import { BookOpen, CalendarDays, ClipboardList } from "lucide-react"

const items = [
  { to: "/class", end: true, label: "Thời khoá biểu", icon: CalendarDays },
  { to: "/class/materials", end: false, label: "Tài liệu", icon: BookOpen },
  { to: "/class/homework", end: false, label: "Homework Hub", icon: ClipboardList },
]

export function ClassSubNav() {
  return (
    <nav className="cls-subnav" aria-label="Luồng lớp học">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? "is-active" : undefined)}>
            <Icon aria-hidden="true" />
            {item.label}
          </NavLink>
        )
      })}
    </nav>
  )
}
