import { useState } from "react"
import { ArrowRight } from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { AuthLayout } from "@/components/layouts/AuthLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuthStore } from "@/features/auth/store/useAuthStore"

export function RegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const signInWithMock = useAuthStore((state) => state.signInWithMock)
  const nextPath = (location.state as { from?: string } | null)?.from ?? "/dashboard"
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    window.setTimeout(() => {
      signInWithMock()
      navigate(nextPath)
    }, 250)
  }

  return (
    <AuthLayout>
      <form className="auth-form" onSubmit={handleSubmit}>
        <div><p className="eyebrow">Bắt đầu lộ trình</p><h2>Tạo tài khoản học tập</h2><p>Bản demo tạo một phiên mock an toàn, không lưu token trong trình duyệt.</p></div>
        <label htmlFor="full-name">Họ và tên<Input id="full-name" autoComplete="name" required /></label>
        <label htmlFor="register-email">Email<Input id="register-email" type="email" autoComplete="email" required /></label>
        <label htmlFor="register-password">Mật khẩu<Input id="register-password" type="password" autoComplete="new-password" minLength={8} required /></label>
        <Button type="submit" size="lg" disabled={isSubmitting}>{isSubmitting ? "Đang tạo phiên…" : <>Tạo tài khoản demo <ArrowRight aria-hidden="true" /></>}</Button>
        <p className="auth-form__security">Đã có tài khoản? <Link to="/auth/login">Đăng nhập</Link></p>
      </form>
    </AuthLayout>
  )
}
