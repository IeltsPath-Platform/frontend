import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminResource, type AdminResource } from '../../lib/useAdminResource'
import { fetchKnowledgeTreeHealth } from '../../knowledge-graph/api/knowledgeGraphApi'
import { AdminPage } from '../../pages/AdminPage'
import { fetchAuthorWorkItems, fetchContentOverview, fetchQuestionLabels, fetchQuestionStats } from '../api/overviewApi'
import { AttentionBlock, type AttentionSource } from '../components/AttentionBlock'
import { CoverageMatrix } from '../components/CoverageMatrix'
import { BarList, ColumnChart, DonutChart, StackedBar } from '../components/OverviewCharts'
import { OverviewKpis, type Kpi } from '../components/OverviewKpis'
import {
  CEFR_LEVELS, LESSON_STATUS_ROWS, SKILL_ROWS, WORK_STATUS_LABEL,
  correctRate, extremes, formatCount, percent,
} from '../lib/overviewLabels'
import { detailText, kindLabel, subjectText } from '../../work-queue/lib/workQueueLabels'
import type { ContentOverview, QuestionStat } from '../types'
import '../overview.css'

const MIN_ATTEMPTS = 20

const GRAPH = '/content-author/knowledge-graph'
/** The graph with only the points that carry a warning (no link, or no CEFR level or can-do). */
const GRAPH_FLAGGED = `${GRAPH}?flagged=1`
const QUESTIONS = '/content-author/questions'
const QUESTIONS_DRAFT = `${QUESTIONS}?status=DRAFT`
const COURSES = '/content-author/courses'
const WORK_ITEMS = '/content-author/work-items'

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

  // How many published questions each active point has: none, one, or two and more.
  const coverage = data.coverage ?? null
  const depthTotal = coverage?.reduce((total, cell) => total + cell.activeKnowledgePoints, 0) ?? 0
  const depthNone = coverage?.reduce((total, cell) => total + cell.withoutPublishedQuestion, 0) ?? 0
  const depthOne = coverage?.reduce((total, cell) => total + cell.withOnePublishedQuestion, 0) ?? 0
  const depthSlices = [
    { key: 'none', label: 'Chưa có câu hỏi', value: depthNone, color: 'var(--adm-danger)' },
    { key: 'one', label: 'Chỉ có 1 câu', value: depthOne, color: 'var(--adm-warn)' },
    { key: 'more', label: 'Từ 2 câu trở lên', value: Math.max(depthTotal - depthNone - depthOne, 0), color: 'var(--adm-ok)' },
  ]

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
        note={coverage && depthOne > 0 ? <Link className="ov-note__link ov-note__link--warn" to={GRAPH}><AlertTriangle aria-hidden="true" size={14} /><span>KP mới có đúng 1 câu hỏi</span><strong>{formatCount(depthOne)}</strong></Link> : undefined}
        title="Độ sâu câu hỏi"
      >
        {coverage && depthTotal > 0
          ? <StackedBar slices={depthSlices} summary={`Số câu hỏi đã xuất bản của mỗi KP: ${depthSlices.map((slice) => `${slice.label} ${slice.value}`).join(', ')}`} />
          : unknown}
      </Panel>
    </div>
  )
}

/** One kind of content on its way to learners: the bar of its statuses, or one line when everything is published. */
function PipelineRow({ label, counts, to }: { label: string; counts: Record<string, number> | null | undefined; to?: string }) {
  if (!counts) return null
  const slices = LESSON_STATUS_ROWS.map((row) => ({ ...row, value: counts[row.key] ?? 0 }))
  const total = slices.reduce((sum, slice) => sum + slice.value, 0)
  const onlyPublished = total > 0 && (counts.PUBLISHED ?? 0) === total
  return (
    <div className="ov-panel">
      <h3>{label}</h3>
      <p className="ov-figure">{to ? <Link to={to}><strong>{formatCount(total)}</strong></Link> : <strong>{formatCount(total)}</strong>}</p>
      {total === 0 ? <p className="adm-muted ov-unknown">Chưa có.</p> : onlyPublished ? (
        <p className="ov-ok"><CheckCircle2 aria-hidden="true" size={16} />Tất cả đã xuất bản</p>
      ) : (
        <StackedBar slices={slices} summary={`${label} theo trạng thái: ${slices.map((slice) => `${slice.label} ${slice.value}`).join(', ')}`} />
      )}
    </div>
  )
}

/** Lessons, question versions and packages by status, and the drafts left waiting too long. */
function Pipeline({ data }: { data: ContentOverview }) {
  const stale = data.staleDraftQuestionVersions ?? 0
  return (
    <>
      <div className="ov-panels ov-panels--three">
        <PipelineRow counts={data.lessons} label="Bài học" to={COURSES} />
        <PipelineRow counts={data.questionVersions} label="Phiên bản câu hỏi" to={QUESTIONS} />
        <PipelineRow counts={data.packages} label="Gói đề" to="/content-author/packages" />
      </div>
      {stale > 0 ? (
        <p className="ov-stale">
          <AlertTriangle aria-hidden="true" size={14} />
          <Link to={QUESTIONS_DRAFT}>{formatCount(stale)} phiên bản câu hỏi nháp để quá {data.staleDraftAfterDays ?? 14} ngày chưa xuất bản</Link>
        </p>
      ) : null}
    </>
  )
}

/**
 * The questions answered worst and best, each named by the start of its stem and linking to the question. A name that
 * cannot be read leaves the short code, so the list never depends on the names arriving.
 */
function QuestionStatRows({ items }: { items: readonly QuestionStat[] }) {
  const { hardest, easiest } = extremes(items, 3)
  const ids = [...hardest, ...easiest].map((stat) => stat.questionVersionId)
  const labels = useAdminResource(`overview|question-labels|${ids.join(',')}`, (signal) => fetchQuestionLabels(ids, signal))
  const labelOf = new Map((labels.data ?? []).map((label) => [label.questionVersionId, label]))

  const row = (stat: QuestionStat, tone: 'hard' | 'easy') => {
    const label = labelOf.get(stat.questionVersionId)
    return (
      <li key={stat.questionVersionId}>
        <span>
          {label ? <Link to={`${QUESTIONS}/${label.questionId}`}>{label.label}</Link> : <code>{stat.questionVersionId.slice(0, 8)}</code>}
          {stat.difficulty ? <span className="adm-muted"> gắn nhãn {stat.difficulty}</span> : null}
        </span>
        <span aria-hidden="true" className="ov-rate__track">
          <span className={`ov-rate__fill ov-rate__fill--${tone}`} style={{ width: `${Math.round(correctRate(stat) * 100)}%` }} />
        </span>
        <span>{percent(correctRate(stat))} đúng · {stat.attempts} lượt</span>
      </li>
    )
  }
  return (
    <>
      <h3>Khó nhất</h3>
      <ul className="ov-rates">{hardest.map((stat) => row(stat, 'hard'))}</ul>
      {easiest.length > 0 ? (<><h3>Dễ nhất</h3><ul className="ov-rates">{easiest.map((stat) => row(stat, 'easy'))}</ul></>) : null}
      <p className="adm-muted">Chỉ tính câu có ít nhất {MIN_ATTEMPTS} lượt làm đầu tiên.</p>
    </>
  )
}

export function OverviewPage() {
  const overview = useAdminResource('overview|content', (signal) => fetchContentOverview(signal))
  const health = useAdminResource('overview|health', (signal) => fetchKnowledgeTreeHealth(signal))
  const work = useAdminResource('overview|work-items', (signal) => fetchAuthorWorkItems(signal))
  const stats = useAdminResource('overview|question-stats', (signal) => fetchQuestionStats(MIN_ATTEMPTS, signal))
  const activeTotal = overview.data?.knowledgePoints?.byStatus?.ACTIVE ?? overview.data?.knowledgePoints?.total ?? null
  const withoutQuestion = overview.data?.activeKnowledgePointsWithoutPublishedQuestion ?? null
  const drafts = overview.data?.draftQuestionVersions ?? null
  const publishedLessons = overview.data?.lessons?.PUBLISHED ?? null
  const openWork = work.status === 'success' ? work.data?.length ?? 0 : null

  const kpis: Kpi[] = [
    { key: 'kp', label: 'KP đang hoạt động', value: activeTotal !== null ? formatCount(activeTotal) : null, to: GRAPH },
    {
      key: 'coverage',
      label: 'KP có câu hỏi',
      value: activeTotal && withoutQuestion !== null ? percent(Math.max(activeTotal - withoutQuestion, 0) / activeTotal) : null,
      to: GRAPH,
    },
    { key: 'lessons', label: 'Bài học đã xuất bản', value: publishedLessons !== null ? formatCount(publishedLessons) : null, to: COURSES },
    { key: 'drafts', label: 'Bản nháp chờ xuất bản', value: drafts !== null ? formatCount(drafts) : null, to: QUESTIONS_DRAFT, tone: drafts === null ? undefined : drafts > 0 ? 'warn' : 'ok' },
    { key: 'work', label: 'Việc của R&D đang mở', value: openWork !== null ? formatCount(openWork) : null, to: WORK_ITEMS, tone: openWork === null ? undefined : openWork > 0 ? 'warn' : 'ok' },
  ]

  // The kinds of work, from the sources that know them; each source fails on its own.
  const sources: AttentionSource[] = [
    {
      name: 'kết quả kiểm tra cây tri thức',
      resource: health,
      rows: health.data ? [
        { key: 'missing', count: health.data.missingMetadataIds.length, label: 'KP thiếu CEFR hoặc can-do', to: GRAPH_FLAGGED, total: activeTotal },
        { key: 'isolated', count: health.data.isolatedIds.length, label: 'KP cô lập, chưa nối với KP nào', to: GRAPH_FLAGGED, total: activeTotal },
        { key: 'violations', count: health.data.levelViolations.length, label: 'Cạnh tiên quyết sai cấp độ', to: GRAPH },
      ] : [],
    },
    {
      name: 'số liệu nội dung',
      resource: overview,
      rows: overview.data ? [
        { key: 'no-question', count: withoutQuestion ?? 0, label: 'KP chưa có câu hỏi đã xuất bản', to: GRAPH, total: activeTotal },
        { key: 'drafts', count: drafts ?? 0, label: 'Phiên bản câu hỏi chờ xuất bản', to: QUESTIONS_DRAFT },
      ] : [],
    },
  ]

  return (
    <AdminPage subtitle="Nội dung hiện có và việc cần làm của R&D." title="Tổng quan">
      <OverviewKpis items={kpis} />

      <AttentionBlock sources={sources} />

      <Block resource={overview} title="Nội dung" to={GRAPH} toLabel="Mở cây tri thức">
        {(data) => <ContentCharts data={data} />}
      </Block>

      {/* Both blocks need numbers an older server does not send, so they stay out of the page until it does. */}
      {overview.data?.coverage && overview.data.coverage.length > 0 ? (
        <section aria-label="Phủ nội dung theo kỹ năng và cấp CEFR" className="adm-card ov-block">
          <header className="ov-block__head"><h2>Phủ nội dung theo kỹ năng và cấp CEFR</h2></header>
          <CoverageMatrix cells={overview.data.coverage} graphPath={GRAPH} />
        </section>
      ) : null}

      {overview.data?.lessons || overview.data?.questionVersions || overview.data?.packages ? (
        <section aria-label="Dòng chảy nội dung" className="adm-card ov-block">
          <header className="ov-block__head"><h2>Dòng chảy nội dung</h2></header>
          <Pipeline data={overview.data} />
        </section>
      ) : null}

      <div className="ov-grid">
        {/* A block with nothing to show leaves no empty card behind; a failed one still says so. */}
        {work.status === 'success' && (work.data?.length ?? 0) === 0 ? null : (
          <Block resource={work} title="Việc cần làm của R&D">
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
                <li><Link to={WORK_ITEMS}>Xem tất cả</Link></li>
              </ul>
            )}
          </Block>
        )}

        {stats.status === 'success' && (stats.data?.length ?? 0) === 0 ? null : (
          <Block resource={stats} title="Câu hỏi lệch độ khó" to={QUESTIONS} toLabel="Ngân hàng câu hỏi">
            {(items) => <QuestionStatRows items={items} />}
          </Block>
        )}
      </div>
    </AdminPage>
  )
}
