import { useState } from 'react'
import { overviewApi, type StudyDay } from '../api/overviewApi'
import { useStatisticsResource } from '../hooks/useStatisticsResource'
import { daysAgo, formatDuration, isoDate } from '../overviewViewModel'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import iconTime from '../assets/stat-icon-time.png'
import { OverviewBlockStatus } from './OverviewBlockStatus'
import { StudyDaysGraph, type DayPoint } from './StudyDaysGraph'

type Range = 7 | 14 | 30
const RANGES: Range[] = [7, 14, 30]
/** How far back the overview loads study time. A course view covers the same window. */
const WINDOW_DAYS = 90

export interface ChartCourse {
  id: string
  name: string
}

interface OverviewStudyChartProps {
  totalSeconds: number | null
  days: StudyDay[] | null
  today: Date
  courses?: ChartCourse[]
}

/** Local dates of one seven-day block, counted back from today; offset 0 is the last seven days, 7 the week before. */
function weekKeys(today: Date, offset: number): string[] {
  return Array.from({ length: 7 }, (_, index) => isoDate(daysAgo(today, offset + 6 - index)))
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

/** Recorded seconds of a list of days; untracked days add nothing. */
function recordedSeconds(days: StudyDay[]): number {
  return days.reduce((total, day) => day.status === 'NOT_TRACKED' ? total : total + Math.max(0, day.actualSeconds ?? 0), 0)
}

/**
 * Recorded study time per day for the chart and the week-on-week change. Untracked days are left out.
 * The course filter shows one course's days over the same window; "all" shows the whole account.
 */
export function OverviewStudyChart({ totalSeconds, days, today, courses = [] }: OverviewStudyChartProps) {
  const [range, setRange] = useState<Range>(7)
  const [courseId, setCourseId] = useState('')
  const todayKey = isoDate(today)
  const windowFrom = isoDate(daysAgo(today, WINDOW_DAYS - 1))
  const courseTime = useStatisticsResource(`overview-time-course:${windowFrom}:${todayKey}:${courseId}`, (signal) =>
    courseId ? overviewApi.time(windowFrom, todayKey, courseId, signal) : Promise.resolve(null))
  const courseName = courses.find((course) => course.id === courseId)?.name
  const shownDays = courseId ? courseTime.data?.days ?? null : days
  const headTotal = courseId ? (shownDays === null ? null : recordedSeconds(shownDays)) : totalSeconds

  const byDate = new Map<string, { actual: number | null; planned: number | null }>()
  for (const day of shownDays ?? []) {
    if (day.status === 'NOT_TRACKED') continue
    const previous = byDate.get(day.date)
    const actual = day.actualSeconds === null ? null : Math.max(0, day.actualSeconds)
    byDate.set(day.date, {
      actual: actual === null ? previous?.actual ?? null : (previous?.actual ?? 0) + actual,
      planned: day.plannedSeconds ?? previous?.planned ?? null,
    })
  }

  const points: DayPoint[] = Array.from({ length: range }, (_, index) => {
    const date = daysAgo(today, range - 1 - index)
    const key = isoDate(date)
    const entry = byDate.get(key)
    return { date, key, actual: entry?.actual ?? null, planned: entry?.planned ?? null, isToday: key === todayKey }
  })

  const lastTracked = weekKeys(today, 0).map((key) => byDate.get(key)?.actual).filter((value): value is number => value != null)
  const previousTracked = weekKeys(today, 7).map((key) => byDate.get(key)?.actual).filter((value): value is number => value != null)
  const comparison = lastTracked.length > 0 && previousTracked.length > 0
    ? lastTracked.length === 7 && previousTracked.length === 7
      ? { delta: sum(lastTracked) - sum(previousTracked), average: false }
      : { delta: sum(lastTracked) / lastTracked.length - sum(previousTracked) / previousTracked.length, average: true }
    : null

  const hasPlan = points.some((point) => point.planned !== null)

  return (
    <section className="overview-study-chart" aria-label="Tổng thời gian học">
      <div className="overview-study-chart-head">
        <span className="overview-stat-icon overview-study-chart-icon" aria-hidden="true"><img src={iconTime} alt="" width="1254" height="1254" /></span>
        <div className="overview-study-chart-total"><p>Tổng thời gian học</p><strong>{headTotal === null ? '—' : formatDuration(headTotal)}</strong>
          {comparison !== null && (
            <span className={`overview-study-change${comparison.delta < 0 ? ' is-down' : ''}`}>
              {`${comparison.delta > 0 ? '▲ +' : comparison.delta < 0 ? '▼ −' : ''}${formatDuration(Math.abs(comparison.delta))} ${comparison.average ? 'trung bình mỗi ngày học so với 7 ngày trước' : 'so với 7 ngày trước'}`}
            </span>
          )}
        </div>
        <span className="overview-study-period">{courseId ? `${WINDOW_DAYS} ngày qua` : 'Từ trước đến nay'}</span>
      </div>
      <div className="overview-study-frame">
        <div className="overview-study-controls">
          <p className="overview-study-graph-caption">{`Từng ngày trong ${range} ngày qua`}</p>
          <div className="overview-study-filters">
            <Select value={courseId || 'all'} onValueChange={(value) => setCourseId(value === 'all' ? '' : value)}>
              <SelectTrigger aria-label="Lọc theo khóa học" className="overview-study-course-select"><SelectValue>{courseName ?? 'Tất cả khóa học'}</SelectValue></SelectTrigger>
              <SelectContent position="popper" align="end" collisionPadding={12}>
                <SelectItem value="all">Tất cả khóa học</SelectItem>
                {courses.map((course) => <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="overview-study-range" role="group" aria-label="Khoảng thời gian">
              {RANGES.map((value) => (
                <button key={value} type="button" aria-pressed={range === value} onClick={() => setRange(value)}>{`${value} ngày`}</button>
              ))}
            </div>
          </div>
        </div>
        <OverviewBlockStatus loading={courseId !== '' && courseTime.loading} error={courseId ? courseTime.error : null} onRetry={courseTime.reload} />
        {shownDays === null ? <p className="overview-study-chart-empty">Chưa có dữ liệu biểu đồ</p> : (
          <>
            <StudyDaysGraph points={points} ariaLabel={`Thời gian học từng ngày trong ${range} ngày qua`} />
            <p className="overview-study-chart-note">Đường cam nối các ngày có dữ liệu để thấy xu hướng lên xuống.</p>
            {hasPlan && <p className="overview-study-chart-note"><span aria-hidden="true">▬</span> Vạch là mục tiêu của ngày. Cột xanh lá là ngày đạt mục tiêu.</p>}
            {comparison?.average && (
              <p className="overview-study-chart-note">{`Tuần này có ${lastTracked.length}/7 ngày học được ghi nhận, tuần trước ${previousTracked.length}/7.`}</p>
            )}
          </>
        )}
      </div>
      <ul className="overview-sr-only">
        {points.map((point) => (
          <li key={point.key}>{point.date.toLocaleDateString('vi-VN')}: {point.actual === null ? 'Chưa có dữ liệu' : formatDuration(point.actual)}</li>
        ))}
      </ul>
    </section>
  )
}
