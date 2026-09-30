import { Award, BookOpenCheck, PenLine, Sparkles, Star, Trophy } from 'lucide-react'
import { useState } from 'react'
import { ClassMascot } from '@/components/ClassMascot'
import { InteractiveCanvasBackground } from '@/components/InteractiveCanvasBackground'
import { SiteNavbar } from '@/components/SiteNavbar'
import { AuthForm, type AuthMode } from '../components/AuthForm'
import { signInForDemo } from '../authSession'
import type { SocialProvider } from '../components/SocialButtons'
import '../auth.css'

interface AuthPageProps {
  mode: AuthMode
}

const floatingIcons = [
  { Icon: BookOpenCheck, className: 'auth-floating-icon--book' },
  { Icon: PenLine, className: 'auth-floating-icon--pen' },
  { Icon: Star, className: 'auth-floating-icon--star' },
  { Icon: Award, className: 'auth-floating-icon--award' },
  { Icon: Trophy, className: 'auth-floating-icon--trophy' },
] as const

function AuthBackdrop() {
  return (
    <div className="auth-backdrop" aria-hidden="true">
      <span className="auth-backdrop-orb auth-backdrop-orb--one" />
      <span className="auth-backdrop-orb auth-backdrop-orb--two" />
      {floatingIcons.map(({ Icon, className }) => <Icon className={`auth-floating-icon ${className}`} key={className} />)}
    </div>
  )
}

export function AuthPage({ mode }: AuthPageProps) {
  const [statusMessage, setStatusMessage] = useState('')

  function handleSubmit(email: string) {
    signInForDemo(email)
    setStatusMessage('Bạn đã đăng nhập ở chế độ giao diện. Tính năng xác thực thực tế sẽ khả dụng khi backend được kết nối.')
  }

  function handleSocialSelect(provider: SocialProvider) {
    setStatusMessage(`Đăng nhập với ${provider} chưa được kết nối trong môi trường hiện tại.`)
  }

  return (
    <div className="auth-page">
      <a className="skip-link" href="#auth-main-content">Đi tới biểu mẫu xác thực</a>
      <SiteNavbar />
      <main id="auth-main-content" className="auth-main" tabIndex={-1}>
        <InteractiveCanvasBackground particleCount={160} interactionRadius={150} />
        <AuthBackdrop />
        <div className="auth-shell">
          <section className="auth-ambient-copy" aria-label="Không gian học IELTS">
            <span><Sparkles aria-hidden="true" size={17} /> IELTS SPACE</span>
            <h2>Mỗi ngày một bước. Gần hơn band mục tiêu.</h2>
            <p>Giữ bài học, lộ trình và từ vựng trong một không gian tập trung.</p>
          </section>
          <ClassMascot className="auth-mascot" size="lg" />
          <AuthForm mode={mode} statusMessage={statusMessage} onSubmit={handleSubmit} onSocialSelect={handleSocialSelect} />
        </div>
      </main>
    </div>
  )
}
