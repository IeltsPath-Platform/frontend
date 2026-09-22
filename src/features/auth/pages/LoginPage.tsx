import { useState } from "react"
import { ArrowRight, LockKeyhole } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { AuthLayout } from "@/components/layouts/AuthLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuthStore } from "@/features/auth/store/useAuthStore"

export function LoginPage() {
  const navigate = useNavigate()
  const signInWithMock = useAuthStore((state) => state.signInWithMock)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    window.setTimeout(() => {
      signInWithMock()
      navigate("/dashboard")
    }, 250)
  }

  return (
    <AuthLayout>
      <form className="auth-form" onSubmit={handleSubmit}>
        <div><p className="eyebrow">Chào mừng trở lại</p><h2>Tiếp tục lộ trình của bạn</h2><p>Đăng nhập bản demo để khám phá toàn bộ mock workspace.</p></div>
        <label htmlFor="email">Email<Input id="email" type="email" autoComplete="email" defaultValue="minh.anh@ieltspath.local" required /></label>
        <label htmlFor="password">Mật khẩu<Input id="password" type="password" autoComplete="current-password" defaultValue="ieltspath" required /></label>
        <Button type="submit" size="lg" disabled={isSubmitting}>{isSubmitting ? "Đang vào học…" : <>Vào không gian học <ArrowRight aria-hidden="true" /></>}</Button>
        <p className="auth-form__security"><LockKeyhole aria-hidden="true" size={16} /> Phiên thật sẽ dùng HttpOnly cookie; trình duyệt không lưu token.</p>
        <p className="auth-form__security">Chưa có tài khoản? <Link to="/auth/register">Tạo tài khoản demo</Link></p>
      </form>
    </AuthLayout>
  )
}
