import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { overviewApi, type BandSkill, type BandStatistics } from '../api/overviewApi'
import { bandPeriod, bandPeriods, bandPracticeLink, bandRange, hasPlacementReference, selectBandHistory } from '../bandHistoryModel'
import { useStatisticsResource, type StatisticsResource } from '../hooks/useStatisticsResource'
import { useChartView } from '../hooks/useChartView'
import { skillLabels } from '../statisticsFormat'
import { StatisticsCard } from './StatisticsCard'
import { BandHistoryChart } from './StatisticsCharts'

const dateLabel = (date: string) => new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString('vi-VN')
const bandText = (band: number | null) => band === null ? '—' : band.toFixed(1)

interface BandView {
  data: BandStatistics
  skill: BandSkill
  placementBand: number | null
  from: string
  to: string
}

export function BandHistoryPanel({ targetBand = null }: { targetBand?: number | null }) {
  const [params, setParams] = useSearchParams()
  const period = bandPeriod(params.get('period'))
  const { from, to } = bandRange(period)
  const availability = useStatisticsResource(`band-availability:${from}:${to}`, (signal) => overviewApi.bandAvailability(from, to, signal))
  const options = availability.data?.options ?? []
  const { series, skill } = selectBandHistory(options, params.get('series'), params.get('skill'))
  const overallAvailable = options.some((option) => option.seriesKind === series && option.skill === 'OVERALL')
  const bandKey = `${from}:${to}:${series}:${skill}:${availability.data !== null}`
  const [cursorState, setCursorState] = useState({ key: '', stack: [''] })
  const cursors = cursorState.key === bandKey ? cursorState.stack : ['']
  const cursor = cursors.at(-1) ?? ''
  const bands = useStatisticsResource(`bands:${bandKey}:${cursor}`, (signal) => availability.data
    ? overviewApi.bands(from, to, skill, series, cursor, signal) : Promise.resolve(null))
  const resource: StatisticsResource<BandStatistics> = {
    data: availability.data ? bands.data : null,
    error: availability.error ?? bands.error,
    loading: availability.loading || bands.loading,
    reload: availability.error ? availability.reload : bands.reload,
  }
  // The placement test is taken once: its band is the starting line of the chart, not a series.
  const placementRange = bandRange('1y')
  const placement = useStatisticsResource(`band-placement:${placementRange.from}:${skill}`, (signal) => hasPlacementReference(skill)
    ? overviewApi.placementBand(placementRange.from, placementRange.to, skill, signal) : Promise.resolve(null))
  const placementBand = hasPlacementReference(skill) ? placement.data : null
  const currentView = useMemo<BandView | null>(() => resource.data === null ? null : {
    data: resource.data, skill, placementBand, from, to,
  }, [resource.data, skill, placementBand, from, to])
  const { view: chartView, updating: switchingFilter } = useChartView(`${bandKey}:${cursor}`, currentView, resource.loading && !resource.error)
  const view = chartView?.data ?? null
  const displayedSkill = view?.skill ?? skill
  const displayedPlacement = view?.placementBand ?? null
  function filter(values: Record<string, string>) {
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      next.set('tab', 'detailed-stats')
      // Keep the current pair once the learner changes any band filter.
      next.set('series', series)
      next.set('skill', skill)
      for (const [name, value] of Object.entries(values)) next.set(name, value)
      return next
    }, { preventScrollReset: true })
  }
  const change = view?.data.delta
  const practice = bandPracticeLink(displayedSkill)
  return <StatisticsCard title="Hành trình band của bạn"
    subtitle={`${dateLabel(view?.from ?? from)} – ${dateLabel(view?.to ?? to)}`} resource={{ ...resource, data: view?.data ?? null }} className="detailed-band-card" controls={<>
      <div className="detailed-band-head-controls">
        {change != null && <span className={`detailed-band-delta${change < 0 ? ' is-negative' : ''}`}>
          {change < 0 ? <TrendingDown size={14} aria-hidden="true" /> : <TrendingUp size={14} aria-hidden="true" />}
          {change > 0 ? '+' : ''}{change.toFixed(1)} BAND</span>}
        <div className="detailed-periods" role="group" aria-label="Khoảng thời gian thống kê">
          {bandPeriods.map(([value, label]) => <Button key={value} variant="ghost" aria-pressed={period === value} onClick={() => filter({ period: value })}>{label}</Button>)}
        </div>
      </div>
      <div className="detailed-band-toolbar">
        <div className="detailed-band-source">
          <Select value={series} onValueChange={(value) => {
            const next = selectBandHistory(options, value, null)
            filter({ series: next.series, skill: next.skill })
          }}>
            <SelectTrigger aria-label="Loại bài thi"><SelectValue /></SelectTrigger>
            <SelectContent position="popper" collisionPadding={12} className="[&_[data-slot=select-item]]:min-h-11">
              <SelectItem value="MOCK">Thi thử</SelectItem><SelectItem value="OFFICIAL_PRACTICE">Luyện thi chính thức</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="detailed-band-tabs" role="group" aria-label="Kỹ năng band">
          {(['OVERALL', 'LISTENING', 'READING', 'WRITING', 'SPEAKING'] as BandSkill[]).map((key) => <Button key={key} variant="ghost"
            className={`is-${key.toLowerCase()}`}
            aria-pressed={skill === key} disabled={key === 'OVERALL' && !overallAvailable}
            onClick={() => filter({ skill: key })}>{skillLabels[key]}</Button>)}
        </div>
        {availability.data && !overallAvailable && <p className="detailed-band-hint">Overall cần một lần thi được chấm đủ 4 kỹ năng trong khoảng đã chọn.</p>}
      </div>
    </>}>
    {(data) => {
      const highest = data.points.length ? Math.max(...data.points.map((point) => point.band)) : null
      const lastDate = data.points.length ? data.points.reduce((latest, point) => point.submittedAt > latest ? point.submittedAt : latest, '') : null
      const gap = targetBand != null && data.latest != null ? Math.round((targetBand - data.latest) * 10) / 10 : null
      return <div className="detailed-band-content">
        {switchingFilter && <p role="status" className="detailed-band-updating">Đang cập nhật biểu đồ…</p>}
        {data.points.length ? <div className={`detailed-band-body${switchingFilter ? ' is-updating' : ''}`} inert={switchingFilter}>
          <div className="detailed-band-plot"><BandHistoryChart key={chartView?.key} points={data.points} targetBand={targetBand} baseline={data.baseline} placementBand={displayedPlacement} skill={displayedSkill} /></div>
          <aside className="detailed-band-summary" aria-label="Tóm tắt band">
            <div className="detailed-band-latest"><span>Band gần nhất</span><strong>{bandText(data.latest)}<small> / 9.0</small></strong>
              {lastDate && <small>Lần thi ngày {dateLabel(lastDate)}</small>}</div>
            <dl>
              {displayedPlacement != null && <div><dt>Bài đầu vào</dt><dd>{bandText(displayedPlacement)}</dd></div>}
              <div><dt>Lần đầu trong khoảng</dt><dd>{bandText(data.baseline)}</dd></div>
              <div><dt>Cao nhất trong khoảng</dt><dd>{bandText(highest)}</dd></div>
              <div><dt>Số lần thi</dt><dd>{data.points.length}{data.nextCursor ? '+' : ''}</dd></div>
              {targetBand != null && <div><dt>Mục tiêu</dt><dd>{bandText(targetBand)}</dd></div>}
            </dl>
            {gap != null && <p className="detailed-band-goal">{gap > 0 ? `Còn ${gap.toFixed(1)} band nữa là đạt mục tiêu.` : 'Bạn đã đạt band mục tiêu.'}</p>}
            <p className="detailed-band-note">{data.latest != null && data.delta == null ? 'Đã có một kết quả. Cần thêm một lần chấm để so sánh tiến bộ.'
              : displayedSkill === 'OVERALL' ? 'Overall của các lần thi được chấm đủ 4 kỹ năng.' : `Điểm ${skillLabels[displayedSkill]} từ các lần thi đã được chấm.`}</p>
          </aside>
        </div> : <div key={chartView?.key} className="detailed-band-plot overview-chart-enter" inert={switchingFilter}><div className="detailed-empty-chart">
          <strong>Chưa có kết quả trong khoảng này</strong>
          <p>Chọn khoảng thời gian rộng hơn hoặc làm bài luyện để có điểm kỹ năng.</p>
          <Button asChild variant="outline"><Link to={practice.to}>{practice.label}</Link></Button>
        </div></div>}
        {(data.nextCursor || cursors.length > 1) && <div className="statistics-controls detailed-band-pagination">
          <Button variant="outline" disabled={resource.loading || cursors.length === 1} onClick={() => setCursorState({ key: bandKey, stack: cursors.slice(0, -1) })}>Mới hơn</Button>
          <Button variant="outline" disabled={resource.loading || !data.nextCursor} onClick={() => { if (data.nextCursor) setCursorState({ key: bandKey, stack: [...cursors, data.nextCursor] }) }}>Cũ hơn</Button>
        </div>}
      </div>
    }}
  </StatisticsCard>
}
