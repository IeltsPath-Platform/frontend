import { useAdminResource } from '../../lib/useAdminResource'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { listPackages } from '../api/packageApi'
import { placementPoolSchema } from '../types'
import { PLACEMENT_POOLS } from '@/features/learning-path/placement/placementPools'

export function PlacementPoolSummary() {
  const resource = useAdminResource('placement-pool-published-counts', () => listPackages({ type: 'PLACEMENT_TEST' }))
  if (resource.status === 'loading') return <AdminLoading label="Đang tải số đề đã xuất bản theo kho…" />
  if (resource.status === 'error') return <AdminError message={resource.error!} onRetry={resource.reload} />

  const counts = new Map(PLACEMENT_POOLS.map(({ pool }) => [pool, 0]))
  for (const item of resource.data ?? []) {
    if (item.status !== 'PUBLISHED' || !item.placementPool) continue
    const parsedPool = placementPoolSchema.safeParse(item.placementPool)
    if (parsedPool.success) counts.set(parsedPool.data, (counts.get(parsedPool.data) ?? 0) + 1)
  }

  return (
    <section className="adm-placement-summary" aria-labelledby="adm-placement-summary-title">
      <h2 id="adm-placement-summary-title">Đề đầu vào đã xuất bản</h2>
      <div className="adm-placement-summary__pools">
        {PLACEMENT_POOLS.map(({ pool, label }) => {
          const count = counts.get(pool) ?? 0
          return (
            <article className="adm-placement-summary__pool" data-needs-more={count < 2} key={pool}>
              <h3>{label}</h3>
              <p><strong>{count}</strong> đề đã xuất bản</p>
              {count === 0 ? <p className="adm-placement-summary__warning">Chưa có đề, học viên không chọn được kho này</p>
                : count < 2 ? <p className="adm-placement-summary__warning">Cần thêm đề: lượt thi lại sẽ lặp đề</p> : null}
            </article>
          )
        })}
      </div>
    </section>
  )
}
