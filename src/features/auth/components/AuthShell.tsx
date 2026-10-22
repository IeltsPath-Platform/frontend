import { Award, BookOpenCheck, PenLine, Sparkles, Star, Trophy } from 'lucide-react'
import type { ReactNode } from 'react'
import { OwlHero } from '@/components/OwlHero'
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
  showNavbar?: boolean
}

export function AuthShell({
  children,
  ambientTitle = 'Mỗi ngày một bước. Gần hơn band mục tiêu.',
  ambientBody = 'Giữ bài học, lộ trình và từ vựng trong một không gian tập trung.',
  showNavbar = true,
}: AuthShellProps) {
  return (
    <div className="auth-page">
      <a className="skip-link" href="#auth-main-content">Đi tới biểu mẫu xác thực</a>
      {showNavbar && <SiteNavbar />}
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
          <OwlHero className="auth-mascot" enter="left" pose="wave" size="lg" />
          {children}
        </div>
      </main>
    </div>
  )
}
