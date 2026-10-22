import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminResource, type AdminResource } from '../../lib/useAdminResource'
import { fetchKnowledgeTreeHealth } from '../../knowledge-graph/api/knowledgeGraphApi'
import { AdminPageHeader } from '../../pages/AdminPageHeader'
import { fetchAuthorWorkItems, fetchContentOverview, fetchQuestionStats } from '../api/overviewApi'
import { WORK_KIND_LABEL, WORK_STATUS_LABEL, correctRate, extremes, percent } from '../lib/overviewLabels'
import '../overview.css'

const MIN_ATTEMPTS = 20

/** One block of the page: its own loading, error and empty states, so a failing source never blanks the rest. */
function Block<T>({ title, to, toLabel, resource, empty, children }: {
  title: string
  to?: string
  toLabel?: string
  resource: AdminResource<T>
  empty?: (data: T) => boolean
  children: (data: T) => ReactNode
}) {
  return (
    <section aria-label={title} className="adm-card ov-block">
      <header className="ov-block__head">
        <h2>{title}</h2>
        {to ? <Link className="qb-link" to={to}>{toLabel ?? 'Mở'}</Link> : null}
      </header>
      {resource.status === 'loading' ? <AdminLoading label="Đang tải…" /> : null}
      {resource.status === 'error' ? <AdminError message={resource.error ?? 'Không tải được dữ liệu.'} onRetry={resource.reload} /> : null}
      {resource.status === 'success' && resource.data !== null
        ? (empty?.(resource.data) ? <AdminEmpty title="Chưa có gì cần xử lý" /> : children(resource.data))
        : null}
    </section>
  )
}

function Stat({ label, value, to, warn }: { label: string; value: number | null | undefined; to: string; warn?: boolean }) {
  return (
    <Link className={`ov-stat${warn && value ? ' ov-stat--warn' : ''}`} to={to}>
      <strong>{value ?? '—'}</strong>
      <span>{label}</span>
    </Link>
  )
}

export function OverviewPage() {
  const overview = useAdminResource('overview|content', (signal) => fetchContentOverview(signal))
  const health = useAdminResource('overview|health', (signal) => fetchKnowledgeTreeHealth(signal))
  const work = useAdminResource('overview|work-items', (signal) => fetchAuthorWorkItems(signal))
  const stats = useAdminResource('overview|question-stats', (signal) => fetchQuestionStats(MIN_ATTEMPTS, signal))

  return (
    <>
      <AdminPageHeader subtitle="Nội dung hiện có và việc cần làm của R&D." title="Tổng quan" />

      <div className="ov-grid">
        <Block resource={overview} title="Nội dung">
          {(data) => (
            <div className="ov-stats">
              <Stat label="KP đang hoạt động" to="/admin/knowledge-graph" value={data.knowledgePoints?.byStatus?.ACTIVE ?? data.knowledgePoints?.total} />
              <Stat label="KP chưa có câu hỏi đã xuất bản" to="/admin/knowledge-graph" value={data.activeKnowledgePointsWithoutPublishedQuestion} warn />
              <Stat label="Phiên bản câu hỏi chờ xuất bản" to="/admin/questions" value={data.draftQuestionVersions} warn />
              <Stat label="Bài học nháp" to="/admin/lessons" value={data.lessons?.DRAFT} />
              <Stat label="Bài học đã xuất bản" to="/admin/lessons" value={data.lessons?.PUBLISHED} />
            </div>
          )}
        </Block>

        <Block resource={health} title="Sức khỏe cây tri thức" to="/admin/knowledge-graph" toLabel="Mở cây tri thức">
          {(data) => (
            <div className="ov-stats">
              <Stat label="KP cô lập" to="/admin/knowledge-graph" value={data.isolatedIds.length} warn />
              <Stat label="KP thiếu CEFR hoặc can-do" to="/admin/knowledge-graph" value={data.missingMetadataIds.length} warn />
              <Stat label="Cạnh tiên quyết sai cấp độ" to="/admin/knowledge-graph" value={data.levelViolations.length} warn />
            </div>
          )}
        </Block>

        <Block empty={(items) => items.length === 0} resource={work} title="Việc cần làm của R&D">
          {(items) => (
            <ul className="ov-list">
              {items.slice(0, 8).map((item) => (
                <li key={item.id}>
                  <span>
                    <strong>{WORK_KIND_LABEL[item.kind] ?? item.kind}</strong>
                    {item.detail ? <span className="adm-muted ov-detail"> {item.detail}</span> : null}
                  </span>
                  <span className="adm-badge">{WORK_STATUS_LABEL[item.status] ?? item.status}</span>
                </li>
              ))}
              {items.length > 8 ? <li className="adm-muted">Và {items.length - 8} việc nữa.</li> : null}
            </ul>
          )}
        </Block>

        <Block
          empty={(items) => items.length === 0}
          resource={stats}
          title="Câu hỏi lệch độ khó"
          to="/admin/questions"
          toLabel="Ngân hàng câu hỏi"
        >
          {(items) => {
            const { hardest, easiest } = extremes(items, 3)
            const row = (stat: (typeof items)[number]) => (
              <li key={stat.questionVersionId}>
                <span><code>{stat.questionVersionId.slice(0, 8)}</code> {stat.difficulty ? <span className="adm-muted">gắn nhãn {stat.difficulty}</span> : null}</span>
                <span>{percent(correctRate(stat))} đúng · {stat.attempts} lượt</span>
              </li>
            )
            return (
              <>
                <h3>Khó nhất</h3>
                <ul className="ov-list">{hardest.map(row)}</ul>
                {easiest.length > 0 ? (<><h3>Dễ nhất</h3><ul className="ov-list">{easiest.map(row)}</ul></>) : null}
                <p className="adm-muted">Chỉ tính câu có ít nhất {MIN_ATTEMPTS} lượt làm đầu tiên.</p>
              </>
            )
          }}
        </Block>
      </div>
    </>
  )
}
