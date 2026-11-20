import { useState, type FormEvent } from 'react'
import { ArrowRight } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { requiredText } from '@/lib/validation/fields'
import { useFormErrors } from '@/lib/validation/useFormErrors'
import successOwl from '@/assets/owl/consult-success-owl.png'
import './ConsultationSection.css'

const PHONE_PATTERN = /^(?:0|\+84)\d{9}$/
const PHONE_INVALID_MESSAGE = 'Số điện thoại không hợp lệ (ví dụ 0912345678).'

/** Removes spaces, dots and dashes so "0912 345 678" and "0912.345.678" pass the same check. */
function normalizePhone(value: string): string {
  return value.replace(/[\s.-]/g, '')
}

const consultationSchema = z.object({
  fullName: requiredText('Họ và tên', 150),
  phone: z.string({ error: 'Số điện thoại không được để trống.' })
    .refine((value) => normalizePhone(value) !== '', 'Số điện thoại không được để trống.')
    .refine((value) => normalizePhone(value) === '' || PHONE_PATTERN.test(normalizePhone(value)), PHONE_INVALID_MESSAGE),
})

export function ConsultationSection() {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const form = useFormErrors(consultationSchema, { fullName, phone })
  const nameError = form.field('fullName').error
  const phoneError = form.field('phone').error
  const [successOpen, setSuccessOpen] = useState(false)

  // UI only: the request is not sent anywhere yet, so the form resets after a valid submit.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.validate()) return
    form.reset()
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
              aria-required
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? 'consultation-full-name-error' : undefined}
              onBlur={form.field('fullName').onTouch}
              onChange={(event) => setFullName(event.target.value)}
            />
            {nameError ? <p className="consultation-error" id="consultation-full-name-error" role="alert">{nameError}</p> : null}
            <Input
              id="consultation-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              aria-label="Số điện thoại"
              autoComplete="tel"
              placeholder="Số điện thoại"
              value={phone}
              aria-required
              aria-invalid={phoneError ? true : undefined}
              aria-describedby={phoneError ? 'consultation-phone-error' : undefined}
              onBlur={form.field('phone').onTouch}
              onChange={(event) => setPhone(event.target.value)}
            />
            {phoneError ? <p className="consultation-error" id="consultation-phone-error" role="alert">{phoneError}</p> : null}
            <Button type="submit" className="consultation-submit">Gửi yêu cầu</Button>
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
