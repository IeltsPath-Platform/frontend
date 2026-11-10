import { useState } from 'react'
import { MailWarning } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/toast/toastContext'
import { authApi } from '@/features/auth/api/authApi'

/**
 * Shown to a signed-in learner whose email is not verified. Sensitive actions (changing password, linking a social
 * login) stay blocked until the link is used; this banner only offers to send a fresh one.
 */
export function EmailVerificationBanner({ email }: { email: string }) {
  const { toast } = useToast()
  const [sending, setSending] = useState(false)

  async function resend() {
    setSending(true)
    try {
      const result = await authApi.resendVerification(email)
      toast({ title: result.message, tone: 'success' })
    } catch {
      toast({ title: 'Không gửi được email xác minh. Thử lại sau ít phút.', tone: 'error' })
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="profile-section-card" role="region" aria-label="Xác minh email">
      <div className="profile-section-header">
        <div className="profile-section-title-wrap">
          <MailWarning size={20} aria-hidden="true" />
          <div>
            <h2 className="profile-section-title">Email chưa được xác minh</h2>
            <p className="profile-section-subtitle">
              Một số thao tác như đổi mật khẩu hoặc liên kết Google sẽ bị khóa cho đến khi bạn xác minh {email}.
            </p>
          </div>
        </div>
      </div>
      <Button type="button" variant="outline" onClick={() => void resend()} disabled={sending}>
        {sending ? 'Đang gửi…' : 'Gửi lại email xác minh'}
      </Button>
    </section>
  )
}
