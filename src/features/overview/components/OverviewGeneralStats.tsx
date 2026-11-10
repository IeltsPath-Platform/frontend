import type { LearningOverviewStatistics, StreakSummary, StudyTimeStatistics } from '../api/overviewApi'
import type { StatisticsResource } from '../hooks/useStatisticsResource'
import { calendarStatuses, daysAgo, isoDate } from '../overviewViewModel'
import { OverviewBlockStatus } from './OverviewBlockStatus'
import { OverviewStudyChart, type ChartCourse } from './OverviewStudyChart'
import flame from '../assets/streak-flame.png'
import { useState } from 'react'
import { CalendarCheck, ChevronLeft, ChevronRight, Flame, Snowflake } from 'lucide-react'
import { OverviewStreakFreeze } from './OverviewStreakFreeze'

interface OverviewGeneralStatsProps {
  learning: StatisticsResource<LearningOverviewStatistics>
  time: StatisticsResource<StudyTimeStatistics>
  streak: StatisticsResource<StreakSummary>
  courses?: ChartCourse[]
  today: Date
}

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const formatWeekDate = (date: Date) => date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })

export function OverviewGeneralStats({ learning, time, streak, today, courses = [] }: OverviewGeneralStatsProps) {
  const [weeksAgo, setWeeksAgo] = useState(0)
  const sources = [learning, streak]
  const weekStart = daysAgo(today, (today.getDay() + 6) % 7 + weeksAgo * 7)
  const days = Array.from({ length: 7 }, (_, index) => daysAgo(weekStart, -index))
  const statuses = time.data ? calendarStatuses(time.data.days) : {}
  const frozenDays = new Set(streak.data?.frozenDays ?? [])
  const firstRecordedDay = time.data?.days.reduce<string | null>((first, day) => first === null || day.date < first ? day.date : first, null) ?? null
  const canGoBack = firstRecordedDay !== null && isoDate(daysAgo(weekStart, 1)) >= firstRecordedDay
  return (
    <section className="overview-stats-section" aria-labelledby="overview-stats-title">
      <header className="overview-stats-heading"><h2 id="overview-stats-title">Dữ liệu học tổng quan</h2><p>Thống kê hoạt động học tập của bạn</p></header>
      <OverviewBlockStatus loading={sources.some((resource) => resource.loading)} error={sources.find((resource) => resource.error)?.error ?? null} onRetry={() => sources.forEach((resource) => { if (resource.error) resource.reload() })} />
      <div className="overview-stats-dashboard">
        <OverviewStudyChart totalSeconds={learning.data?.totalStudySeconds ?? null} days={time.data?.days ?? null} today={today} courses={courses} />
      </div>
      <section className="overview-week-activity" aria-labelledby="overview-week-title">
        <header>
          <div className="overview-week-heading"><span className="overview-week-calendar-icon"><CalendarCheck size={22} aria-hidden="true" /></span><h3 id="overview-week-title">Ngày có hoạt động học {weeksAgo === 0 ? 'tuần này' : 'theo tuần'}</h3></div>
          <div className="overview-week-navigation">
            <button type="button" aria-label="Tuần trước" disabled={!canGoBack} onClick={() => setWeeksAgo((value) => value + 1)}><ChevronLeft size={18} aria-hidden="true" /></button>
            <span aria-live="polite">{formatWeekDate(weekStart)} – {formatWeekDate(days[6])}</span>
            <button type="button" aria-label="Tuần tiếp theo" disabled={weeksAgo === 0} onClick={() => setWeeksAgo((value) => Math.max(0, value - 1))}><ChevronRight size={18} aria-hidden="true" /></button>
          </div>
        </header>
        <OverviewBlockStatus loading={time.loading} error={time.error} onRetry={time.reload} />
        <div className="overview-week-summary"><p><strong>{streak.data?.currentDays ?? '—'}</strong> ngày liên tiếp có làm bài</p><p><strong>{streak.data?.longestDays ?? '—'}</strong> ngày <span>(Kỷ lục chuỗi làm bài)</span></p></div>
        <ul key={isoDate(weekStart)} className="overview-week-days overview-chart-enter">{days.map((date, index) => {
          const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
          const frozen = frozenDays.has(isoDate(date))
          const active = !frozen && statuses[key] === 'completed'
          const future = isoDate(date) > isoDate(today)
          const description = frozen ? 'Chuỗi được giữ nhờ đóng băng' : active ? 'Có hoạt động học' : future ? 'Ngày sắp tới' : time.loading ? 'Đang tải' : statuses[key] ? 'Chưa ghi nhận hoạt động học' : 'Chưa có dữ liệu'
          return <li key={key} className={frozen ? 'is-frozen' : active ? 'is-active' : ''} aria-label={`${WEEKDAYS[index]}, ${date.toLocaleDateString('vi-VN')}: ${description}`} aria-current={isoDate(date) === isoDate(today) ? 'date' : undefined}><span className="overview-week-flame" aria-hidden="true">{active ? <img src={flame} alt="" width="1272" height="1236" loading="lazy" /> : <span className="overview-week-empty">{frozen ? <Snowflake size={20} strokeWidth={1.8} /> : <Flame size={22} strokeWidth={1.7} />}</span>}</span><strong>{WEEKDAYS[index]}</strong><span className={`overview-week-indicator${!frozen && (!statuses[key] || future) ? ' is-unknown' : ''}`} aria-hidden="true" /></li>
        })}</ul>
        <div className="overview-week-footer">
          <p className="overview-week-note">Ngọn lửa màu: ngày có từ 1 phút học trở lên. Chuỗi liên tiếp chỉ tính ngày có nộp bài.{days.some((date) => frozenDays.has(isoDate(date))) && ' Bông tuyết: ngày chuỗi được giữ nhờ đóng băng.'}</p>
          {streak.data && <OverviewStreakFreeze streak={streak.data} />}
        </div>
      </section>
    </section>
  )
}
