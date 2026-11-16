import type { ReactNode } from 'react'
import { AlertTriangle, Inbox } from 'lucide-react'
import { Loading } from '@/components/loading/Loading'

export function AdminLoading({ label = 'Đang tải…' }: { label?: string }) {
  return <Loading label={label} variant="block" />
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
