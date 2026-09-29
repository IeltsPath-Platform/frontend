import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { ChevronLeft } from "lucide-react"
import { ACTIVE_LESSON } from "@/lib/mock/class"
import { ClassSubNav } from "@/features/class/components/ClassSubNav"

type SessionShellProps = {
  breadcrumb: string
  title?: string
  children: ReactNode
}

export function SessionShell({ breadcrumb, title = ACTIVE_LESSON.title, children }: SessionShellProps) {
  return (
    <main className="cls-page cls-session-page" id="main-content" tabIndex={-1}>
      <section className="cls-session-hero" aria-label="Thông tin buổi học">
        <div className="cls-session-hero__inner">
          <Link className="cls-session-hero__back" to="/class">
            <ChevronLeft aria-hidden="true" />
            Quay lại Thời khoá biểu
          </Link>
          <p className="cls-session-hero__kicker">Buổi {ACTIVE_LESSON.sessionNo}</p>
          <div className="cls-session-hero__pills">
            <span>{ACTIVE_LESSON.coursePill}</span>
            <span>{ACTIVE_LESSON.lessonPill}</span>
          </div>
        </div>
      </section>

      <ClassSubNav />

      <div className="cls-sheet cls-session-sheet">
        <p className="cls-breadcrumb">{breadcrumb}</p>
        <h1 className="cls-session-sheet__title">{title}</h1>
        {children}
      </div>
    </main>
  )
}
