import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import type { StatisticsResource } from '../hooks/useStatisticsResource'

export function StatisticsCard<T>({ title, resource, children, controls }: {
  title: string
  resource: StatisticsResource<T>
  children: (data: T) => ReactNode
  controls?: ReactNode
}) {
  return <section className="statistics-card" aria-label={title} aria-busy={resource.loading}>
    <header className="statistics-card-header"><h2>{title}</h2>{controls}</header>
    {resource.error && <div role="alert">
      <p>{resource.error}</p><Button variant="outline" onClick={resource.reload}>Thử lại</Button>
    </div>}
    {resource.data !== null ? children(resource.data) : resource.loading ? <p role="status">Đang tải số liệu…</p> : !resource.error && <p>Chưa có dữ liệu.</p>}
  </section>
}
