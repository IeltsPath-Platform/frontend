import type { ReactNode } from 'react'
import { StatusArt } from './StatusArt'

/** The owl with the map, for a page that does not exist. */
export function NotFoundArt({ title, message, children, headingId = 'not-found-heading' }: {
  title: string
  message?: ReactNode
  children?: ReactNode
  headingId?: string
}) {
  return <StatusArt headingId={headingId} kind="not-found" message={message} page title={title}>{children}</StatusArt>
}