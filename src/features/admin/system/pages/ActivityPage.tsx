import { useState } from 'react'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminResource } from '../../lib/useAdminResource'
import { AdminPage } from '../../pages/AdminPage'
import { fetchActivityStats } from '../api/systemAdminApi'
import { HttpError } from '@/lib/httpClient'
import { activityErrorText } from '../lib/activityErrors'
import type { DateRange, DailyActivity, Retention } from '../types'
import '../system.css'

function utcDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function rangeFor(days: number): DateRange {
  const end = new Date()
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - days + 1)
  return { from: utcDate(start), to: utcDate(end) }
}

function shortDay(day: string) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })
}

function percent(value: number | null) {
  return value === null ? 'Chưa đủ dữ liệu' : `${Math.round(value * 100)}%`
}

function DailyChart({ rows }: { rows: DailyActivity[] }) {
  const width = 760
  const height = 260
  const left = 42
  const right = 12
  const top = 12
  const bottom = 44
  const plotWidth = width - left - right
  const plotHeight = height - top - bottom
  const maximum = Math.max(1, ...rows.map((row) => row.dau))
  const step = rows.length ? plotWidth / rows.length : plotWidth
  const barWidth = Math.max(2, Math.min(22, step * 0.68))
  const labelEvery = Math.max(1, Math.ceil(rows.length / 8))
  const ticks = [0, Math.ceil(maximum / 2), maximum]

  return (
    <div className="sys-chart-wrap">
      <svg aria-labelledby="activity-chart-title activity-chart-description" className="sys-chart" role="img" viewBox={`0 0 ${width} ${height}`}>
        <title id="activity-chart-title">Người học hoạt động theo ngày</title>
        <desc id="activity-chart-description">Biểu đồ cột DAU theo ngày trong khoảng đã chọn.</desc>
        {ticks.map((tick) => {
          const y = top + plotHeight - (tick / maximum) * plotHeight
          return <g key={tick}><line className="sys-chart__grid" x1={left} x2={width - right} y1={y} y2={y} /><text className="sys-chart__axis" textAnchor="end" x={left - 8} y={y + 4}>{tick}</text></g>
        })}
        {rows.map((row, index) => {
          const barHeight = (row.dau / maximum) * plotHeight
          const x = left + index * step + (step - barWidth) / 2
          const y = top + plotHeight - barHeight
          const showLabel = index % labelEvery === 0 || index === rows.length - 1
          return <g key={row.day}><rect className="sys-chart__bar" height={Math.max(row.dau ? 2 : 0, barHeight)} rx="2" width={barWidth} x={x} y={y}><title>{`${row.day}: ${row.dau} người học`}</title></rect>{showLabel ? <text className="sys-chart__axis" textAnchor="middle" x={x + barWidth / 2} y={height - 12}>{shortDay(row.day)}</text> : null}</g>
        })}
      </svg>
      <table className="adm-sr-only"><caption>DAU theo ngày</caption><thead><tr><th>Ngày UTC</th><th>DAU</th></tr></thead><tbody>{rows.map((row) => <tr key={row.day}><td>{row.day}</td><td>{row.dau}</td></tr>)}</tbody></table>
    </div>
  )
}

function RetentionTable({ rows }: { rows: Retention[] }) {
  if (rows.length === 0) return <AdminEmpty title="Chưa có dữ liệu cohort" />
  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <caption className="adm-sr-only">Retention theo cohort tuần, tuần bắt đầu tính theo UTC</caption>
        <thead><tr><th className="adm-stt" scope="col">STT</th><th scope="col">Tuần bắt đầu</th><th scope="col">Cỡ cohort</th><th scope="col">Tuần 1</th><th scope="col">Tuần 2</th><th scope="col">Tuần 4</th><th scope="col">Tuần 8</th></tr></thead>
        <tbody>{rows.map((row, index) => <tr key={row.weekStart}><td className="adm-stt">{index + 1}</td><th scope="row">{new Date(row.weekStart).toLocaleDateString('vi-VN', { timeZone: 'UTC' })}</th><td>{row.size}</td><td>{percent(row.week1)}</td><td>{percent(row.week2)}</td><td>{percent(row.week4)}</td><td>{percent(row.week8)}</td></tr>)}</tbody>
      </table>
    </div>
  )
}

export function ActivityPage() {
  const [draft, setDraft] = useState<DateRange>(() => rangeFor(30))
  const [range, setRange] = useState<DateRange>(draft)
  const resource = useAdminResource(`activity|${range.from}|${range.to}`, async (signal) => {
    try {
      return await fetchActivityStats(range, signal)
    } catch (reason) {
      const message = activityErrorText(reason)
      if (reason instanceof HttpError) throw new HttpError(reason.status, message, reason.body, reason.code)
      throw new Error(message)
    }
  })
  const applyRange = (next: DateRange) => { setDraft(next); setRange(next) }
  const latest = resource.data?.daily.at(-1)

  return (
    <AdminPage subtitle="Ngày tính theo UTC; hoạt động là có trả lời câu hỏi, không phải đăng nhập." title="Hoạt động">
      <div className="sys-activity-controls">
        {[7, 30, 90].map((days) => <button className="adm-btn adm-btn--small" key={days} onClick={() => applyRange(rangeFor(days))} type="button">{days} ngày</button>)}
        <form className="sys-date-range" onSubmit={(event) => { event.preventDefault(); setRange(draft) }}>
          <label className="adm-field"><span>Từ ngày</span><input className="adm-input" onChange={(event) => setDraft((current) => ({ ...current, from: event.target.value }))} type="date" value={draft.from} /></label>
          <label className="adm-field"><span>Đến ngày</span><input className="adm-input" onChange={(event) => setDraft((current) => ({ ...current, to: event.target.value }))} type="date" value={draft.to} /></label>
          <button className="adm-btn adm-btn--primary" type="submit">Áp dụng</button>
        </form>
      </div>
      {resource.status === 'loading' ? <AdminLoading label="Đang tải thống kê hoạt động…" /> : null}
      {resource.status === 'error' ? <AdminError message={resource.error ?? 'Không tải được thống kê hoạt động.'} onRetry={resource.reload} /> : null}
      {resource.status === 'success' && resource.data ? (
        <>
          {resource.data.daily.length === 0 ? <AdminEmpty title="Chưa có dữ liệu hoạt động" /> : (
            <>
              <section aria-label="Hoạt động ngày gần nhất" className="sys-stat-grid">
                <article className="adm-card sys-stat"><span>DAU</span><strong>{latest?.dau ?? 0}</strong><small>{latest?.day ?? range.to}</small></article>
                <article className="adm-card sys-stat"><span>WAU</span><strong>{latest?.wau ?? 0}</strong><small>7 ngày tính đến ngày trên</small></article>
                <article className="adm-card sys-stat"><span>MAU</span><strong>{latest?.mau ?? 0}</strong><small>30 ngày tính đến ngày trên</small></article>
              </section>
              <section aria-label="Biểu đồ DAU" className="adm-card sys-panel"><h2>Người học hoạt động theo ngày</h2><DailyChart rows={resource.data.daily} /></section>
              <section aria-label="Retention theo cohort" className="adm-card sys-panel"><h2>Retention theo cohort tuần</h2><RetentionTable rows={resource.data.retention} /></section>
            </>
          )}
        </>
      ) : null}
    </AdminPage>
  )
}
