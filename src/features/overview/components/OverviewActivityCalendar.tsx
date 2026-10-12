import { useState } from 'react'
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DayStreakItem } from '@/types/overview'

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const

function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

function monthWeeks(month: Date) {
  const offset = (month.getDay() + 6) % 7
  const length = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  return Array.from({ length: Math.ceil((offset + length) / 7) }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => {
      const number = week * 7 + day - offset + 1
      return number > 0 && number <= length
        ? new Date(month.getFullYear(), month.getMonth(), number)
        : null
    }),
  )
}

export function OverviewActivityCalendar({
  streakDays,
  currentStreakDays,
}: {
  streakDays: DayStreakItem[]
  currentStreakDays: number
}) {
  const [today] = useState(() => new Date())
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selection, setSelection] = useState<{ keys: string[]; label: string } | null>(null)
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (today.getDay() + 6) % 7)
  // The existing fixture has weekday statuses only; keep it scoped to this week.
  const statuses = new Map(streakDays.map((item) => {
    const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + WEEKDAYS.indexOf(item.dayLabel))
    return [dateKey(date), item.status] as const
  }))
  const weeks = monthWeeks(month)
  const selectedStatuses = selection?.keys.map((key) => statuses.get(key)) ?? []
  const completed = selectedStatuses.filter((status) => status === 'completed').length
  const recorded = selectedStatuses.filter((status) => status !== undefined).length
  const selectionDetail = selection?.keys.length === 1
    ? selectedStatuses[0] === 'completed' ? 'Đã học — có trong chuỗi tuần này.'
      : selectedStatuses[0] === 'missed' ? 'Chưa học.'
        : selectedStatuses[0] === 'upcoming' ? 'Ngày học sắp tới.' : 'Chưa có dữ liệu cho ngày này.'
    : recorded > 0 ? `${completed} ngày đã học / ${recorded} ngày có dữ liệu trong tuần này.`
      : 'Chưa có dữ liệu cho tuần này.'

  function changeMonth(offset: number) {
    setMonth(new Date(month.getFullYear(), month.getMonth() + offset, 1))
    setSelection(null)
  }

  return (
    <section className="activity-calendar" aria-labelledby="activity-calendar-title">
      <div className="activity-calendar-header">
        <div>
          <h2 id="activity-calendar-title">Biểu đồ “chăm chỉ” của bạn</h2>
          <p>Bấm vào ngày/tuần để xem hoạt động học tập.</p>
        </div>
        <span className="activity-calendar-legend"><span aria-hidden="true" /> Đã học</span>
      </div>

      <div className="activity-calendar-toolbar">
        <span className="activity-streak-summary">
          <span className="activity-flame" aria-hidden="true"><Flame className="size-6" /></span>
          <span><strong>{currentStreakDays} ngày</strong> giữ chuỗi</span>
        </span>
        <div className="activity-month-controls">
          <Button variant="ghost" size="icon" className="activity-month-arrow" aria-label="Tháng trước" onClick={() => changeMonth(-1)}><ChevronLeft /></Button>
          <Button variant="ghost" className="activity-today-button" onClick={() => { setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelection(null) }}>Tháng này</Button>
          <Button variant="ghost" size="icon" className="activity-month-arrow" aria-label="Tháng sau" onClick={() => changeMonth(1)}><ChevronRight /></Button>
        </div>
      </div>

      <div className="activity-calendar-scroll" role="region" aria-label="Lịch hoạt động học tập">
            <table className="activity-month-table" key={dateKey(month)}>
              <caption>Tháng {month.getMonth() + 1} / {month.getFullYear()}</caption>
              <thead><tr><th scope="col"><span className="sr-only">Tuần</span></th>{WEEKDAYS.map((day) => <th key={day} scope="col">{day}</th>)}</tr></thead>
              <tbody>{weeks.map((week, index) => {
                const weekNumber = index + 1
                const dates = week.filter((date) => date !== null)
                const keys = dates.map(dateKey)
                const weekSelected = selection?.keys.length === keys.length && keys.every((key) => selection.keys.includes(key))
                return (
                  <tr key={weekNumber} className={weekSelected ? 'activity-week-selected' : undefined}>
                    <th scope="row"><Button variant="ghost" className="activity-week-button" aria-pressed={weekSelected} aria-label={`Tuần ${weekNumber}, tháng ${month.getMonth() + 1}/${month.getFullYear()}`} onClick={() => setSelection({ keys, label: `Tuần ${weekNumber} · ${dates[0].toLocaleDateString('vi-VN')} – ${dates[dates.length - 1].toLocaleDateString('vi-VN')}` })}>Tuần {weekNumber}</Button></th>
                    {week.map((date, dayIndex) => {
                      if (!date) return <td key={dayIndex} />
                      const key = dateKey(date)
                      const isCompleted = statuses.get(key) === 'completed'
                      const isToday = key === dateKey(today)
                      const isSelected = selection?.keys.includes(key) ?? false
                      return (
                        <td key={dayIndex}>
                          <Button variant="ghost" className={`activity-day${isCompleted ? ' activity-day-completed' : ''}${isToday ? ' activity-day-today' : ''}`} aria-pressed={isSelected} aria-current={isToday ? 'date' : undefined} aria-label={`${date.toLocaleDateString('vi-VN')}${isToday ? ', hôm nay' : ''}, ${isCompleted ? 'đã học' : statuses.get(key) === 'missed' ? 'chưa học' : statuses.get(key) === 'upcoming' ? 'sắp tới' : 'chưa có dữ liệu'}`} onClick={() => setSelection({ keys: [key], label: date.toLocaleDateString('vi-VN') })}>
                            <span>{date.getDate()}</span>
                            {isCompleted && <span className="activity-flame activity-day-flame" aria-hidden="true"><Flame className="size-4" /></span>}
                          </Button>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}</tbody>
            </table>
      </div>

      <div className="activity-calendar-detail" aria-live="polite">
        {selection ? <><strong>{selection.label}</strong><span>{selectionDetail}</span></> : <span>Chọn một ngày hoặc tuần để xem chi tiết.</span>}
      </div>
      <p className="activity-calendar-note">Dữ liệu mẫu · Hoạt động minh họa trong tuần hiện tại.</p>
    </section>
  )
}
