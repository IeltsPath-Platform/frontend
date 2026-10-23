import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminResource, type AdminResource } from '../../lib/useAdminResource'
import { fetchKnowledgeTreeHealth } from '../../knowledge-graph/api/knowledgeGraphApi'
import { AdminPage } from '../../pages/AdminPage'
import { fetchAuthorWorkItems, fetchContentOverview, fetchQuestionStats } from '../api/overviewApi'
import { BarList, ColumnChart, DonutChart, StackedBar } from '../components/OverviewCharts'
import {
  CEFR_LEVELS, LESSON_STATUS_ROWS, SKILL_ROWS, WORK_STATUS_LABEL,
  correctRate, extremes, formatCount, percent,
} from '../lib/overviewLabels'
import { detailText, kindLabel, subjectText } from '../../work-queue/lib/workQueueLabels'
import type { ContentOverview } from '../types'
import '../overview.css'

const MIN_ATTEMPTS = 20

const GRAPH = '/content-author/knowledge-graph'
const QUESTIONS = '/content-author/questions'
const LESSONS = '/content-author/lessons'

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

/** A titled chart inside the content block, with an optional line of text under it. */
function Panel({ title, note, children }: { title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <div className="ov-panel">
      <h3>{title}</h3>
      {children}
      {note ? <p className="ov-note">{note}</p> : null}
    </div>
  )
}

/** Shown in place of a chart whose numbers the server did not send. */
const unknown = <p className="adm-muted ov-unknown">Chưa có số liệu.</p>

/** The four charts that come from the content overview, laid out as columns of one card. */
function ContentCharts({ data }: { data: ContentOverview }) {
  const activeKnowledgePoints = data.knowledgePoints?.byStatus?.ACTIVE ?? data.knowledgePoints?.total ?? null
  const withoutQuestion = data.activeKnowledgePointsWithoutPublishedQuestion ?? null
  const covered = activeKnowledgePoints !== null && withoutQuestion !== null
    ? Math.max(activeKnowledgePoints - withoutQuestion, 0)
    : null

  const bySkill = data.knowledgePoints?.bySkill
  const skillRows = bySkill
    ? [
        ...SKILL_ROWS
          .filter((row) => row.key !== 'ALL' || (bySkill.ALL ?? 0) > 0)
          .map((row) => ({ key: row.key, label: row.label, color: row.color, value: bySkill[row.key] ?? 0 })),
        ...((bySkill.NONE ?? 0) > 0
          ? [{ key: 'NONE', label: 'Chưa gán kỹ năng', color: 'var(--adm-warn)', value: bySkill.NONE }]
          : []),
      ]
    : null

  const byCefr = data.knowledgePoints?.byCefr
  const cefrColumns = byCefr
    ? [
        ...CEFR_LEVELS.map((level) => ({ key: level, label: level, color: 'var(--adm-accent)', value: byCefr[level] ?? 0 })),
        ...((byCefr.NONE ?? 0) > 0
          ? [{ key: 'NONE', label: 'Chưa gán', color: 'var(--adm-warn)', value: byCefr.NONE, muted: true }]
          : []),
      ]
    : null

  const lessons = data.lessons
  const lessonSlices = lessons ? LESSON_STATUS_ROWS.map((row) => ({ ...row, value: lessons[row.key] ?? 0 })) : null
  const lessonTotal = lessonSlices?.reduce((total, slice) => total + slice.value, 0) ?? 0
  const drafts = data.draftQuestionVersions ?? null

  return (
    <div className="ov-panels">
      <Panel
        note={activeKnowledgePoints !== null ? <Link to={GRAPH}>{formatCount(activeKnowledgePoints)} KP đang hoạt động</Link> : undefined}
        title="Độ phủ câu hỏi"
      >
        {covered !== null && activeKnowledgePoints !== null && activeKnowledgePoints > 0 ? (
          <DonutChart
            centerLabel="KP có câu hỏi"
            centerValue={percent(covered / activeKnowledgePoints)}
            slices={[
              { key: 'covered', label: 'Có câu hỏi đã xuất bản', value: covered, color: 'var(--adm-accent)' },
              { key: 'missing', label: 'Chưa có câu hỏi', value: withoutQuestion ?? 0, color: 'var(--adm-warn)' },
            ]}
            summary={`${covered} trên ${activeKnowledgePoints} KP đang hoạt động đã có câu hỏi xuất bản; ${withoutQuestion} KP chưa có.`}
          />
        ) : unknown}
      </Panel>

      <Panel title="KP theo kỹ năng">
        {skillRows ? <BarList rows={skillRows} summary="Số KP đang hoạt động theo kỹ năng" /> : unknown}
      </Panel>

      <Panel title="KP theo cấp CEFR">
        {cefrColumns ? <ColumnChart columns={cefrColumns} summary="Số KP đang hoạt động theo cấp CEFR, từ A1 đến C2" /> : unknown}
      </Panel>

      <Panel
        note={drafts !== null ? (
          <Link className={drafts > 0 ? 'ov-note__link ov-note__link--warn' : 'ov-note__link'} to={QUESTIONS}>
            {drafts > 0 ? <AlertTriangle aria-hidden="true" size={14} /> : <CheckCircle2 aria-hidden="true" size={14} />}
            <span>Phiên bản câu hỏi chờ xuất bản</span>
            <strong>{formatCount(drafts)}</strong>
          </Link>
        ) : undefined}
        title="Bài học theo trạng thái"
      >
        {lessonSlices ? (
          <>
            <p className="ov-figure"><Link to={LESSONS}><strong>{formatCount(lessonTotal)}</strong> bài học</Link></p>
            <StackedBar slices={lessonSlices} summary={`Bài học theo trạng thái: ${lessonSlices.map((slice) => `${slice.label} ${slice.value}`).join(', ')}`} />
          </>
        ) : unknown}
      </Panel>
    </div>
  )
}

/** One check of the knowledge tree: how many points it flags, with a bar against all active points when known. */
function HealthRow({ label, count, total }: { label: string; count: number; total: number | null }) {
  const ok = count === 0
  return (
    <li className={ok ? 'ov-check' : 'ov-check ov-check--warn'}>
      {ok ? <CheckCircle2 aria-label="Ổn" size={16} /> : <AlertTriangle aria-label="Cần xử lý" size={16} />}
      <Link to={GRAPH}>
        <strong>{count}</strong>
        <span>{label}</span>
      </Link>
      {total && count > 0 ? (
        <span aria-hidden="true" className="ov-check__track">
          <span className="ov-check__fill" style={{ width: `${Math.min(100, (count / total) * 100)}%` }} />
        </span>
      ) : null}
    </li>
  )
}

export function OverviewPage() {
  const overview = useAdminResource('overview|content', (signal) => fetchContentOverview(signal))
  const health = useAdminResource('overview|health', (signal) => fetchKnowledgeTreeHealth(signal))
  const work = useAdminResource('overview|work-items', (signal) => fetchAuthorWorkItems(signal))
  const stats = useAdminResource('overview|question-stats', (signal) => fetchQuestionStats(MIN_ATTEMPTS, signal))
  const activeTotal = overview.data?.knowledgePoints?.byStatus?.ACTIVE ?? overview.data?.knowledgePoints?.total ?? null

  return (
    <AdminPage subtitle="Nội dung hiện có và việc cần làm của R&D." title="Tổng quan">

      <Block resource={overview} title="Nội dung" to={GRAPH} toLabel="Mở cây tri thức">
        {(data) => <ContentCharts data={data} />}
      </Block>

      <div className="ov-grid">
        <Block resource={health} title="Sức khỏe cây tri thức" to={GRAPH} toLabel="Mở cây tri thức">
          {(data) => (
            <ul aria-label="Kết quả kiểm tra cây tri thức" className="ov-checks">
              <HealthRow count={data.isolatedIds.length} label="KP cô lập" total={activeTotal} />
              <HealthRow count={data.missingMetadataIds.length} label="KP thiếu CEFR hoặc can-do" total={activeTotal} />
              <HealthRow count={data.levelViolations.length} label="Cạnh tiên quyết sai cấp độ" total={null} />
            </ul>
          )}
        </Block>

        <Block
          empty={(items) => items.length === 0}
          resource={stats}
          title="Câu hỏi lệch độ khó"
          to={QUESTIONS}
          toLabel="Ngân hàng câu hỏi"
        >
          {(items) => {
            const { hardest, easiest } = extremes(items, 3)
            const row = (stat: (typeof items)[number], tone: 'hard' | 'easy') => (
              <li key={stat.questionVersionId}>
                <span><code>{stat.questionVersionId.slice(0, 8)}</code> {stat.difficulty ? <span className="adm-muted">gắn nhãn {stat.difficulty}</span> : null}</span>
                <span aria-hidden="true" className="ov-rate__track">
                  <span className={`ov-rate__fill ov-rate__fill--${tone}`} style={{ width: `${Math.round(correctRate(stat) * 100)}%` }} />
                </span>
                <span>{percent(correctRate(stat))} đúng · {stat.attempts} lượt</span>
              </li>
            )
            return (
              <>
                <h3>Khó nhất</h3>
                <ul className="ov-rates">{hardest.map((stat) => row(stat, 'hard'))}</ul>
                {easiest.length > 0 ? (<><h3>Dễ nhất</h3><ul className="ov-rates">{easiest.map((stat) => row(stat, 'easy'))}</ul></>) : null}
                <p className="adm-muted">Chỉ tính câu có ít nhất {MIN_ATTEMPTS} lượt làm đầu tiên.</p>
              </>
            )
          }}
        </Block>

        <Block empty={(items) => items.length === 0} resource={work} title="Việc cần làm của R&D">
          {(items) => (
            <ul className="ov-list">
              {items.slice(0, 8).map((item) => (
                <li key={item.id}>
                  <span>
                    <strong>{kindLabel(item.kind)}</strong>
                    <span className="adm-muted ov-detail"> {subjectText(item)}{detailText(item) ? ` · ${detailText(item)}` : ''}</span>
                  </span>
                  <span className="adm-badge">{WORK_STATUS_LABEL[item.status] ?? item.status}</span>
                </li>
              ))}
              {items.length > 8 ? <li className="adm-muted">Và {items.length - 8} việc nữa.</li> : null}
              <li><Link to="/content-author/work-items">Xem tất cả</Link></li>
            </ul>
          )}
        </Block>
      </div>
    </AdminPage>
  )
}
