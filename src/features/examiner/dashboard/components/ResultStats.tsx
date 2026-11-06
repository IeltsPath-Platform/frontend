import { AdminEmpty } from '@/features/admin/components/AdminState'
import { BarList, ColumnChart } from '@/features/admin/overview/components/OverviewCharts'
import { sourceLabel, taskLabel } from '@/features/admin/examiner-review/lib/reviewLabels'
import type { CompletedItem } from '../../grading/types'
import { averageBand, bandColumns, countBy, lastDays } from '../lib/dashboardStats'
import { Panel } from './DashboardBlock'

const DAYS = 7

/**
 * What the examiner graded, drawn from the newest finished jobs: how many per day, which bands, which task, where the essay came from.
 * No job is listed here; the finished jobs are a tab of the queue. `loadedAt` is when the numbers were fetched, so "the last 7 days" ends on that day.
 */
export function ResultStats({ items, total, loadedAt }: { items: readonly CompletedItem[]; total: number; loadedAt: Date }) {
  if (items.length === 0) return <AdminEmpty title="Chưa chấm bài nào" />
  const average = averageBand(items)
  return (
    <>
      <div className="ov-panels">
        <Panel title="Số bài chấm 7 ngày gần nhất">
          <ColumnChart columns={lastDays(items, DAYS, loadedAt)} summary="Số bài đã chấm mỗi ngày trong 7 ngày gần nhất" />
        </Panel>

        <Panel
          note={average !== null ? <>Band trung bình <strong>{average.toFixed(1)}</strong></> : undefined}
          title="Phân bố band"
        >
          <ColumnChart columns={bandColumns(items)} summary="Số bài đã chấm theo band tổng, từ 5.0 trở xuống đến 8.0 trở lên" />
        </Panel>

        <Panel title="Theo đề">
          <BarList rows={countBy(items, (item) => taskLabel(item.task))} summary="Số bài đã chấm theo đề" />
        </Panel>

        <Panel title="Theo nguồn bài">
          <BarList rows={countBy(items, (item) => sourceLabel({ attemptType: null, source: item.source }))} summary="Số bài đã chấm theo nguồn bài" />
        </Panel>
      </div>
      {total > items.length ? <p className="adm-muted ov-unknown">Tính trên {items.length} bài chấm gần nhất.</p> : null}
    </>
  )
}
