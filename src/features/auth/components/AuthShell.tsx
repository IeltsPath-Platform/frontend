import { Award, BookOpenCheck, PenLine, Sparkles, Star, Trophy } from 'lucide-react'
import type { ReactNode } from 'react'
import { ClassMascot } from '@/components/ClassMascot'
import { InteractiveCanvasBackground } from '@/components/InteractiveCanvasBackground'
import { SiteNavbar } from '@/components/SiteNavbar'
import '../auth.css'

const floatingIcons = [
  { Icon: BookOpenCheck, className: 'auth-floating-icon--book' },
  { Icon: PenLine, className: 'auth-floating-icon--pen' },
  { Icon: Star, className: 'auth-floating-icon--star' },
  { Icon: Award, className: 'auth-floating-icon--award' },
  { Icon: Trophy, className: 'auth-floating-icon--trophy' },
] as const

interface AuthShellProps {
  children: ReactNode
  ambientTitle?: string
  ambientBody?: string
}

export function AuthShell({
  children,
  ambientTitle = 'Mỗi ngày một bước. Gần hơn band mục tiêu.',
  ambientBody = 'Giữ bài học, lộ trình và từ vựng trong một không gian tập trung.',
}: AuthShellProps) {
  return (
    <div className="auth-page">
      <a className="skip-link" href="#auth-main-content">Đi tới biểu mẫu xác thực</a>
      <SiteNavbar />
      <main id="auth-main-content" className="auth-main" tabIndex={-1}>
        <InteractiveCanvasBackground particleCount={160} interactionRadius={150} />
        <div className="auth-backdrop" aria-hidden="true">
          <span className="auth-backdrop-orb auth-backdrop-orb--one" />
          <span className="auth-backdrop-orb auth-backdrop-orb--two" />
          {floatingIcons.map(({ Icon, className }) => (
            <Icon className={`auth-floating-icon ${className}`} key={className} />
          ))}
        </div>
        <div className="auth-shell">
          <section className="auth-ambient-copy" aria-label="Không gian học IELTS">
            <span><Sparkles aria-hidden="true" size={17} /> IELTS SPACE</span>
            <h2>{ambientTitle}</h2>
            <p>{ambientBody}</p>
          </section>
          <ClassMascot className="auth-mascot" size="lg" />
          {children}
        </div>
      </main>
    </div>
  )
}
