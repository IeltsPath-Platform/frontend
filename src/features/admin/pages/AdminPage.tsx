import type { ReactNode } from 'react'

/**
 * One screen of the admin area: a title bar (title, hint, actions) over a content card, each padded on its own, as in
 * the other back-office tools the staff already use.
 */
export function AdminPage({ title, subtitle, actions, plain = false, children }: {
  title: string
  subtitle?: string
  actions?: ReactNode
  /** Lay the page out as a stack of `.adm-block` cards of its own, instead of wrapping everything in one content card. */
  plain?: boolean
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
      {plain ? <div className="adm-stack">{children}</div> : <section className="adm-content">{children}</section>}
    </>
  )
}
