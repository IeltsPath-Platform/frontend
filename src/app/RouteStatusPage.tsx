import { ArrowLeft, BookOpenCheck, Construction } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

interface RouteStatusPageProps {
  title: string
}

export function RouteStatusPage({ title }: RouteStatusPageProps) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--classroom-canvas)] p-6 text-[var(--classroom-text)]">
      <section className="w-full max-w-lg rounded-3xl border border-[var(--classroom-border)] bg-white p-8 text-center shadow-[var(--classroom-shadow)]" aria-labelledby="route-status-heading">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--classroom-soft)] text-[var(--classroom-primary)]"><Construction aria-hidden="true" size={27} /></span>
        <p className="mt-5 text-sm font-bold uppercase tracking-[0.12em] text-[var(--classroom-primary)]">IeltsPath</p>
        <h1 id="route-status-heading" className="mt-2 text-3xl font-extrabold">{title}</h1>
        <p className="mt-3 text-[var(--classroom-text-muted)]">Trang này đã có đường dẫn riêng nhưng nội dung vẫn đang được hoàn thiện.</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--classroom-primary)] px-5 font-bold text-white" to="/overview"><BookOpenCheck aria-hidden="true" size={18} />Về Overview</Link>
          <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--classroom-border)] px-5 font-bold text-[var(--classroom-primary)]" to="/classroom">Đến lớp học</Link>
        </div>
      </section>
    </main>
  )
}

export function NotFoundPage() {
  const location = useLocation()

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--classroom-canvas)] p-6 text-[var(--classroom-text)]">
      <section className="w-full max-w-lg rounded-3xl border border-[var(--classroom-border)] bg-white p-8 text-center shadow-[var(--classroom-shadow)]" aria-labelledby="not-found-heading">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--classroom-soft)] text-[var(--classroom-primary)]"><ArrowLeft aria-hidden="true" size={27} /></span>
        <p className="mt-5 text-sm font-bold uppercase tracking-[0.12em] text-[var(--classroom-primary)]">404</p>
        <h1 id="not-found-heading" className="mt-2 text-3xl font-extrabold">Không tìm thấy trang</h1>
        <p className="mt-3 break-all text-[var(--classroom-text-muted)]">Không có màn hình nào được khai báo cho {location.pathname}.</p>
        <Link className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--classroom-primary)] px-5 font-bold text-white" to="/overview">Về Overview</Link>
      </section>
    </main>
  )
}
