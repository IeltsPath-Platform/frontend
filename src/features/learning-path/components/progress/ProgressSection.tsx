import { useId, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ApiResource } from '../../lib/useApiResource'

/** One block of the progress page. It loads on its own, so a failure here leaves the other blocks usable. */
export function ProgressSection<T>({ title, resource, children }: {
  title: string
  resource: ApiResource<T>
  children: (data: T) => ReactNode
}) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="lp-progress-section">
      <h2 id={titleId}>{title}</h2>
      {resource.status === 'loading' ? (
        <p className="lp-hint" role="status"><Loader2 aria-hidden="true" className="lp-spin" size={16} /> Đang tải…</p>
      ) : null}
      {resource.error ? (
        <div className="lp-error" role="alert">
          <p>{resource.error.message}</p>
          <Button className="lp-btn" onClick={resource.reload} type="button" variant="outline">Thử lại</Button>
        </div>
      ) : null}
      {resource.data ? children(resource.data) : null}
    </section>
  )
}
