import { useState, type FormEvent } from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import successOwl from '@/assets/owl/consult-success-owl.png'
import './ConsultationSection.css'

const PHONE_PATTERN = /^(?:0|\+84)\d{9}$/
const NAME_REQUIRED_MESSAGE = 'Vui lòng nhập họ và tên.'
const PHONE_INVALID_MESSAGE = 'Số điện thoại không hợp lệ (ví dụ 0912345678).'

/** Removes spaces, dots and dashes so "0912 345 678" and "0912.345.678" pass the same check. */
function normalizePhone(value: string): string {
  return value.replace(/[\s.-]/g, '')
}

export function ConsultationSection() {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [successOpen, setSuccessOpen] = useState(false)

  // UI only: the request is not sent anywhere yet, so the form resets after a valid submit.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!fullName.trim()) {
      setError(NAME_REQUIRED_MESSAGE)
      return
    }
    if (!PHONE_PATTERN.test(normalizePhone(phone))) {
      setError(PHONE_INVALID_MESSAGE)
      return
    }
    setError('')
    setFullName('')
    setPhone('')
    setSuccessOpen(true)
  }

  return (
    <section id="home-consultation" className="home-consultation home-section" aria-labelledby="home-consultation-title">
      <div className="home-section-shell">
        <div className="consultation-card">
          <div className="consultation-copy">
            <p className="consultation-kicker">Ứng dụng — Form đăng ký tư vấn</p>
            <h2 id="home-consultation-title">Đăng ký tư vấn ngay</h2>
            <p className="consultation-lead">Nhận lộ trình IELTS miễn phí</p>
          </div>

          <form className="consultation-form" onSubmit={handleSubmit} noValidate>
            <Input
              id="consultation-full-name"
              name="fullName"
              aria-label="Họ và tên"
              autoComplete="name"
              placeholder="Họ và tên"
              value={fullName}
              aria-invalid={error === NAME_REQUIRED_MESSAGE || undefined}
              onChange={(event) => setFullName(event.target.value)}
            />
            <Input
              id="consultation-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              aria-label="Số điện thoại"
              autoComplete="tel"
              placeholder="Số điện thoại"
              value={phone}
              aria-invalid={error === PHONE_INVALID_MESSAGE || undefined}
              onChange={(event) => setPhone(event.target.value)}
            />
            <Button type="submit" className="consultation-submit">Gửi yêu cầu</Button>
            <p className="consultation-error" role="status" aria-live="polite">{error}</p>
          </form>
        </div>
      </div>

      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="consultation-success">
          <img src={successOwl} alt="" className="consultation-success-owl" width="300" height="383" />
          <DialogTitle className="consultation-success-title">Đã gửi yêu cầu tư vấn! 🎉</DialogTitle>
          <DialogDescription className="consultation-success-text">
            Cố vấn sẽ liên hệ với bạn trong vòng <strong>24 giờ</strong> để tìm hiểu trình độ và đề xuất bài test phù hợp.
          </DialogDescription>
          <Button type="button" className="consultation-success-cta" onClick={() => setSuccessOpen(false)}>
            Tiếp tục khám phá <ArrowRight aria-hidden="true" />
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  )
}
