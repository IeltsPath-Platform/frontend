import type { ReactNode } from "react"
import { GraduationCap } from "lucide-react"

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="auth-layout" id="main-content" tabIndex={-1}>
      <section className="auth-layout__intro" aria-labelledby="auth-intro-title">
        <a className="brand" href="/" aria-label="IELTSPath home">
          <GraduationCap aria-hidden="true" /> IELTS<span>Path</span>
        </a>
        <div>
          <p className="eyebrow">Luyện tập có định hướng</p>
          <h1 id="auth-intro-title">Từng bài luyện đưa bạn gần band mục tiêu hơn.</h1>
          <p>Kho đề bốn kỹ năng, mô phỏng thi máy và feedback rõ ràng để biết chính xác bước tiếp theo.</p>
        </div>
      </section>
      <section className="auth-layout__form" aria-label="Authentication form">
        {children}
      </section>
    </main>
  )
}
