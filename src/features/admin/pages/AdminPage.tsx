import type { ReactNode } from 'react'

/**
 * One screen of the admin area: a title bar (title, hint, actions) over a content card, each padded on its own, as in
 * the other back-office tools the staff already use.
 */
export function AdminPage({ title, subtitle, actions, children }: {
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <>
      <header className="adm-titlebar">
        <div className="adm-titlebar__text">
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions ? <div className="adm-titlebar__actions">{actions}</div> : null}
      </header>
      <section className="adm-content">{children}</section>
    </>
  )
}
