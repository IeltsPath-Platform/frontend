import type { ReactNode } from 'react'
import { AdminError, AdminLoading } from '@/features/admin/components/AdminState'
import type { AdminResource } from '@/features/admin/lib/useAdminResource'

/** Shows the loading, failed or loaded state of one request, with a retry button when it failed. */
export function AsyncBlock<T>({ resource, label, children }: {
  resource: AdminResource<T>
  label: string
  children: (data: T) => ReactNode
}) {
  if (resource.status === 'loading') return <AdminLoading label={label} />
  if (resource.status === 'error') return <AdminError message={resource.error ?? ''} onRetry={resource.reload} />
  return <>{children(resource.data as T)}</>
}
