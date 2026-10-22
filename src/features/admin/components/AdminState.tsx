import type { ReactNode } from 'react'
import { AlertTriangle, Inbox, Loader2 } from 'lucide-react'

export function AdminLoading({ label = 'Đang tải…' }: { label?: string }) {
  return (
    <div className="adm-state" role="status" aria-live="polite">
      <Loader2 aria-hidden="true" className="adm-spin" size={22} />
      <p>{label}</p>
    </div>
  )
}

export function AdminError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="adm-state adm-state--error" role="alert">
      <AlertTriangle aria-hidden="true" size={22} />
      <p>{message}</p>
      {onRetry ? <button className="adm-btn" onClick={onRetry} type="button">Thử lại</button> : null}
    </div>
  )
}

export function AdminEmpty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="adm-state" role="status">
      <Inbox aria-hidden="true" size={22} />
      <p><strong>{title}</strong></p>
      {children ? <p className="adm-muted">{children}</p> : null}
    </div>
  )
}
