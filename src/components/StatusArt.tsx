import { useId, type ReactNode } from 'react'
import empty from '@/assets/owl/owl-empty.webp'
import error from '@/assets/owl/owl-error.webp'
import locked from '@/assets/owl/owl-locked.webp'
import noResults from '@/assets/owl/owl-no-results.webp'
import notFound from '@/assets/owl/owl-not-found.webp'

/** Which picture and which kind of notice: the page is missing, a search found nothing, there is nothing yet, it failed, or it is locked. */
export type StatusKind = 'not-found' | 'no-results' | 'empty' | 'error' | 'locked'

const ART: Record<StatusKind, string> = { 'not-found': notFound, 'no-results': noResults, empty, error, locked }

/**
 * The owl of the app for a page or a part of a page with nothing to show. The picture has a white background, which mix-blend-multiply lets take the colour of the page behind it, so it sits flat on a grey page. The picture is decoration; the heading and the
 * sentence under it say what is missing and what to do. `role="alert"` only for a failure, so a quiet empty list does not
 * interrupt a screen reader.
 */
export function StatusArt({ kind, title, message, children, headingId, compact = false, page = false }: {
  kind: StatusKind
  title: string
  message?: ReactNode
  /** The way out: usually one or two links or buttons. */
  children?: ReactNode
  headingId?: string
  /** A smaller picture, for a panel inside a page rather than a whole page. */
  compact?: boolean
  /** A whole page of its own: the heading is the h1 of the page. */
  page?: boolean
}) {
  const generatedId = useId()
  const id = headingId ?? generatedId
  const Heading = page ? 'h1' : 'h2'
  return (
    <section aria-labelledby={id} role={kind === 'error' ? 'alert' : undefined} className={`mx-auto grid w-full justify-items-center gap-3 px-4 text-center ${compact ? 'max-w-md py-4' : 'max-w-xl py-8'}`}>
      <img
        alt=""
        className={`h-auto w-full select-none mix-blend-multiply ${compact ? 'max-w-[12rem]' : 'max-w-sm'}`}
        decoding="async"
        draggable={false}
        height={650}
        src={ART[kind]}
        width={866}
      />
      <Heading className={`${compact ? 'text-lg' : 'text-2xl'} font-extrabold`} id={id}>{title}</Heading>
      {message ? (
        <p className="max-w-md break-words text-[var(--classroom-text-muted,#566283)]" role={kind === 'not-found' ? 'alert' : undefined}>{message}</p>
      ) : null}
      {children ? <div className="mt-2 flex flex-wrap items-center justify-center gap-3">{children}</div> : null}
    </section>
  )
}
