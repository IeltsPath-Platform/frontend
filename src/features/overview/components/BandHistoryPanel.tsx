import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { overviewApi, type BandSkill, type BandStatistics } from '../api/overviewApi'
import { bandPeriod, bandPeriods, bandPracticeLink, bandRange, selectBandHistory } from '../bandHistoryModel'
import { useStatisticsResource, type StatisticsResource } from '../hooks/useStatisticsResource'
import { skillLabels } from '../statisticsFormat'
import { StatisticsCard } from './StatisticsCard'
import { BandHistoryChart } from './StatisticsCharts'

const dateLabel = (date: string) => new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString('vi-VN')

export function BandHistoryPanel() {
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
  function filter(values: Record<string, string>) {
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      next.set('tab', 'detailed-stats')
      // Keep the current pair once the learner changes any band filter.
      next.set('series', series)
      next.set('skill', skill)
      for (const [name, value] of Object.entries(values)) next.set(name, value)
      return next
    })
  }
  const change = resource.data?.delta
  const practice = bandPracticeLink(series, skill)
  return <StatisticsCard title={change != null && change > 0 ? 'Bạn đang tiến bộ!' : 'Hành trình band của bạn'}
    subtitle={`${dateLabel(from)} – ${dateLabel(to)}`} resource={resource} className="detailed-band-card" controls={<>
      {change != null && <span className={`detailed-band-delta${change < 0 ? ' is-negative' : ''}`}>{change > 0 ? '+' : ''}{change.toFixed(1)} BAND</span>}
      <div className="detailed-periods" role="group" aria-label="Khoảng thời gian thống kê">
        {bandPeriods.map(([value, label]) => <Button key={value} variant="ghost" aria-pressed={period === value} onClick={() => filter({ period: value })}>{label}</Button>)}
      </div>
      <div className="detailed-band-source">
        <Select value={series} onValueChange={(value) => {
          const next = selectBandHistory(options, value, null)
          filter({ series: next.series, skill: next.skill })
        }}>
          <SelectTrigger aria-label="Loại bài thi"><SelectValue /></SelectTrigger>
          <SelectContent position="popper" collisionPadding={12} className="[&_[data-slot=select-item]]:min-h-11">
            <SelectItem value="MOCK">Thi thử</SelectItem><SelectItem value="PLACEMENT">Đầu vào</SelectItem><SelectItem value="OFFICIAL_PRACTICE">Luyện thi chính thức</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="detailed-band-tabs" role="group" aria-label="Kỹ năng band">
        {(['OVERALL', 'LISTENING', 'READING', 'WRITING', 'SPEAKING'] as BandSkill[]).map((key) => <Button key={key} variant="ghost"
          aria-pressed={skill === key} disabled={key === 'OVERALL' ? !overallAvailable : series === 'PLACEMENT' && key === 'SPEAKING'}
          onClick={() => filter({ skill: key })}>{skillLabels[key]}</Button>)}
      </div>
      {availability.data && !overallAvailable && <p className="detailed-band-hint">Overall cần một lần thi được chấm đủ 4 kỹ năng trong khoảng đã chọn.</p>}
    </>}>
    {(data) => <>
      <div className="detailed-band-plot">{data.points.length ? <BandHistoryChart points={data.points} /> : <div className="detailed-empty-chart">
        <strong>Chưa có kết quả trong khoảng này</strong>
        <p>Chọn khoảng thời gian rộng hơn hoặc làm bài luyện để có điểm kỹ năng.</p>
        <Button asChild variant="outline"><Link to={practice.to}>{practice.label}</Link></Button>
      </div>}</div>
      <div className="detailed-band-result"><div><span>Band gần nhất</span><strong>{data.latest?.toFixed(1) ?? '—'}<small> / 9.0</small></strong></div>
        <p>{data.latest != null && data.delta == null ? 'Đã có một kết quả. Cần thêm một lần chấm để so sánh tiến bộ.'
          : skill === 'OVERALL' ? 'Overall của các lần thi được chấm đủ 4 kỹ năng.' : `Điểm ${skillLabels[skill]} từ các lần thi đã được chấm.`}</p>
      </div>
      {(data.nextCursor || cursors.length > 1) && <div className="statistics-controls detailed-band-pagination">
        <Button variant="outline" disabled={cursors.length === 1} onClick={() => setCursorState({ key: bandKey, stack: cursors.slice(0, -1) })}>Mới hơn</Button>
        <Button variant="outline" disabled={!data.nextCursor} onClick={() => { if (data.nextCursor) setCursorState({ key: bandKey, stack: [...cursors, data.nextCursor] }) }}>Cũ hơn</Button>
      </div>}
    </>}
  </StatisticsCard>
}
