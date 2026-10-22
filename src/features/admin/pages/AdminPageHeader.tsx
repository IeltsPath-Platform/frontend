import type { ReactNode } from 'react'

export function AdminPageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="adm-page-header">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p className="adm-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="adm-page-header__actions">{actions}</div> : null}
    </header>
  )
}
