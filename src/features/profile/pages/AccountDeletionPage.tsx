import { useState } from 'react'
import { CheckCircle2, LogIn, Trash2 } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { SiteNavbar } from '@/components/SiteNavbar'
import { useAuthSession } from '@/features/auth/authSession'
import { DeleteAccountDialog } from '../components/DeleteAccountSection'
import { DELETION_CONSEQUENCES } from '../lib/accountDeletion'
import '../profile.css'

const cardClass = 'flex w-full max-w-2xl flex-col gap-4 rounded-3xl border border-[var(--classroom-border)] bg-white p-8 shadow-[var(--classroom-shadow)]'

/**
 * Public page linked from the Google Play listing: explains what deleting an account removes and lets a signed-in
 * user do it. Guests are sent to sign in and brought back here.
 */
export function AccountDeletionPage() {
  const session = useAuthSession()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  return (
    <>
      <SiteNavbar />
      <main className="flex min-h-dvh justify-center bg-[var(--classroom-canvas)] px-6 py-24 text-[var(--classroom-text)]">
        <section className={cardClass} aria-labelledby="account-deletion-heading">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-600">
            <Trash2 aria-hidden="true" size={26} />
          </span>
          <p className="mt-5 text-sm font-bold uppercase tracking-[0.12em] text-[var(--classroom-primary)]">IeltsPath</p>
          <h1 id="account-deletion-heading" className="mt-2 text-3xl font-extrabold">Xóa tài khoản IeltsPath</h1>
          <p className="mt-3 text-[var(--classroom-text-muted)]">
            Bạn có thể tự xóa tài khoản ngay trên trang này hoặc trong ứng dụng (Tài khoản → Xóa tài khoản). Việc xóa
            được thực hiện ngay, không có thời gian chờ và không thể hoàn tác.
          </p>

          <h2 className="mt-7 text-lg font-bold">Điều gì xảy ra khi xóa</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-[var(--classroom-text-muted)]">
            {DELETION_CONSEQUENCES.map((item) => <li key={item}>{item}</li>)}
          </ul>

          <h2 className="mt-7 text-lg font-bold">Cách xóa</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-[var(--classroom-text-muted)]">
            <li>Đăng nhập bằng tài khoản muốn xóa.</li>
            <li>Bấm "Xóa tài khoản", nhập chữ XÓA để xác nhận.</li>
            <li>Nhập mật khẩu hiện tại, hoặc xác thực bằng Google nếu bạn chỉ đăng nhập bằng Google.</li>
          </ol>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {session.isLoggedIn ? (
              <Button type="button" variant="destructive" onClick={() => setOpen(true)}>
                <Trash2 aria-hidden="true" size={16} /> Xóa tài khoản {session.email ? `(${session.email})` : ''}
              </Button>
            ) : (
              <Button type="button" onClick={() => navigate('/login', { state: { from: location } })}>
                <LogIn aria-hidden="true" size={16} /> Đăng nhập để xóa tài khoản
              </Button>
            )}
          </div>
          <p className="mt-6 text-sm text-[var(--classroom-text-muted)]">
            Không đăng nhập được? Hãy dùng chức năng Quên mật khẩu trước, rồi quay lại trang này.
          </p>
        </section>
      </main>
      {open && <DeleteAccountDialog hasPassword={session.hasPassword} onCancel={() => setOpen(false)} />}
    </>
  )
}

/** Shown after a successful deletion, once the local session has been cleared. */
export function AccountDeletedPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--classroom-canvas)] p-6 text-[var(--classroom-text)]">
      <section className={`${cardClass} max-w-lg text-center`} aria-labelledby="account-deleted-heading">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 aria-hidden="true" size={26} />
        </span>
        <h1 id="account-deleted-heading" className="mt-5 text-2xl font-extrabold">Tài khoản đã được xóa</h1>
        <p className="mt-3 text-[var(--classroom-text-muted)]">
          Bạn đã được đăng xuất khỏi mọi thiết bị. Dữ liệu học tập sẽ được dọn khỏi hệ thống trong ít phút.
        </p>
        <Link className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--classroom-primary)] px-5 font-bold text-white" to="/home">
          Về trang chủ
        </Link>
      </section>
    </main>
  )
}
