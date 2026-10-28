import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { overviewApi, type BandSkill, type SeriesKind } from '../api/overviewApi'
import { useStatisticsResource } from '../hooks/useStatisticsResource'
import { StatisticsCard } from './StatisticsCard'
import { BandHistoryChart, SkillCompletionChart, StudyTimeChart } from './StatisticsCharts'
import { percentLabel, skillLabels } from '../statisticsFormat'
import '../statistics.css'

function dayString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function currentRange(period: string) {
  const start = new Date()
  const end = new Date(start)
  if (period === 'month') { start.setDate(1); end.setMonth(end.getMonth() + 1, 0) }
  else { start.setDate(start.getDate() - (start.getDay() + 6) % 7); end.setTime(start.getTime()); end.setDate(end.getDate() + 6) }
  return { from: dayString(start), to: dayString(end) }
}
const NOTEBOOK_LEVELS = { UNKNOWN: 'Chưa hiểu', FAMILIAR: 'Quen mặt', LEARNING: 'Đang học', MASTERED: 'Đã thuộc' } as const

export function OverviewDetailedStats() {
  const [params, setParams] = useSearchParams()
  const period = params.get('period') === 'month' ? 'month' : 'week'
  const courseId = params.get('course') ?? ''
  const requestedSkill = params.get('skill') ?? 'OVERALL'
  const skill: BandSkill = Object.hasOwn(skillLabels, requestedSkill) ? requestedSkill as BandSkill : 'OVERALL'
  const requestedSeries = params.get('series')
  const series: SeriesKind = requestedSeries === 'MOCK' || requestedSeries === 'OFFICIAL_PRACTICE' ? requestedSeries : 'PLACEMENT'
  const { from, to } = currentRange(period)
  const [coursePage, setCoursePage] = useState(0)
  const [cursorState, setCursorState] = useState({ key: '', stack: [''] })
  const bandKey = `${from}:${to}:${series}:${skill}`
  const cursors = cursorState.key === bandKey ? cursorState.stack : ['']
  const cursor = cursors.at(-1) ?? ''
  const page = courseId ? 0 : coursePage
  const time = useStatisticsResource(`time:${from}:${to}:${courseId}`, (signal) => overviewApi.time(from, to, courseId, signal))
  const progress = useStatisticsResource(`progress:${page}:${courseId}`, (signal) => overviewApi.progress(page, courseId, signal))
  const bands = useStatisticsResource(`bands:${bandKey}:${cursor}`, (signal) => overviewApi.bands(from, to, skill, series, cursor, signal))
  const vocabulary = useStatisticsResource('notebook', overviewApi.notebook)
  function filter(name: string, value: string) {
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      next.set('tab', 'detailed-stats')
      if (value) next.set(name, value); else next.delete(name)
      return next
    })
  }
  return <div className="statistics-dashboard">
    <header className="statistics-heading"><div><h1>Dữ liệu chi tiết</h1><p>Theo dõi hoạt động và kết quả học của bạn.</p></div><div className="statistics-controls" aria-label="Bộ lọc thời gian">
      <Button variant={period === 'week' ? 'default' : 'outline'} onClick={() => filter('period', 'week')}>Tuần này</Button><Button variant={period === 'month' ? 'default' : 'outline'} onClick={() => filter('period', 'month')}>Tháng này</Button>
    </div></header>
    <p className="statistics-muted">{from} — {to}. Tiến độ bài học và từ vựng là số liệu hiện tại; bộ lọc thời gian áp dụng cho thời gian học và lịch sử band.</p>
    {courseId && <div className="statistics-controls"><p>Khóa: {progress.data?.courses[0]?.name ?? 'đã chọn'} (thời gian học và tiến độ).</p><Button variant="outline" onClick={() => filter('course', '')}>Tất cả khóa đã bắt đầu</Button></div>}
    <StatisticsCard title="Biểu đồ thời gian học" resource={time}>{(data) => <><StudyTimeChart days={data.days} /><p className="statistics-muted">Chỉ ghi nhận lúc học có hoạt động trên tab hiển thị. Ngày thống kê theo múi giờ được ghi tại thời điểm học.{courseId ? ' Mục tiêu chung không áp dụng riêng cho khóa.' : ''}</p></>}</StatisticsCard>
    <div className="statistics-two-columns">
      <StatisticsCard title="Tiến độ 4 kỹ năng" resource={progress}>{(data) => <><p className="statistics-muted">Bài học hoàn thành / nội dung hiện đang xuất bản của {courseId ? 'khóa đã chọn' : 'các khóa đã bắt đầu'}. Bài nhiều kỹ năng được tính cho từng kỹ năng.</p><SkillCompletionChart skills={data.skills} />{data.totalCourses === 0 && <Button asChild><Link to="/learn">Bắt đầu học</Link></Button>}</>}</StatisticsCard>
      <StatisticsCard title="Lịch sử band" resource={bands} controls={<div className="statistics-controls">
        <Select value={series} onValueChange={(value) => filter('series', value)}><SelectTrigger aria-label="Loại bài thi"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PLACEMENT">Đầu vào</SelectItem><SelectItem value="MOCK">Thi thử</SelectItem><SelectItem value="OFFICIAL_PRACTICE">Luyện thi chính thức</SelectItem></SelectContent></Select>
        <Select value={skill} onValueChange={(value) => filter('skill', value)}><SelectTrigger aria-label="Kỹ năng band"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(skillLabels).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select>
      </div>}>{(data) => <>
        {data.points.length ? <><BandHistoryChart points={data.points} /><p>Đầu kỳ: <strong>{data.baseline?.toFixed(1) ?? '—'}</strong> · Gần nhất: <strong>{data.latest?.toFixed(1) ?? '—'}</strong> · Thay đổi: {data.delta === null ? '—' : `${data.delta > 0 ? '+' : ''}${data.delta.toFixed(1)}`}</p></> : <p>Chưa có kết quả đủ điều kiện trong khoảng thời gian này. Overall cần cả 4 kỹ năng được đo trong cùng một lần thi.</p>}
        <p className="statistics-muted">Chỉ kết quả đã đo; loại trừ band mặc định và dữ liệu cũ không rõ nguồn. Chấm lại cập nhật điểm của lần thi gốc.</p>
        <div className="statistics-controls"><Button variant="outline" disabled={cursors.length === 1} onClick={() => setCursorState({ key: bandKey, stack: cursors.slice(0, -1) })}>Trang trước</Button><Button variant="outline" disabled={!data.nextCursor} onClick={() => { if (data.nextCursor) setCursorState({ key: bandKey, stack: [...cursors, data.nextCursor] }) }}>Trang tiếp</Button></div>
      </>}</StatisticsCard>
    </div>
    <StatisticsCard title="Từ vựng cần ôn" resource={vocabulary}>{(data) => <>
      <p><strong className="statistics-number">{percentLabel(data.total ? (data.masteredCount / data.total) * 100 : null)}</strong> đã thuộc · {data.learnedCount}/{data.total} từ đã học · {data.dueNow} đến hạn ôn</p>
      <ul className="statistics-buckets">{(Object.keys(NOTEBOOK_LEVELS) as (keyof typeof NOTEBOOK_LEVELS)[]).map((level) => <li key={level}><strong>{data.byLevel[level] ?? 0}</strong><span>{NOTEBOOK_LEVELS[level]}</span></li>)}</ul>
      <p className="statistics-muted">Mỗi nghĩa từ chỉ tính một lần. Mức hiểu dựa trên tự đánh giá sau khi lật đáp án.</p><Button asChild><Link to={data.dueNow ? '/vocabulary/notebook/review' : '/vocabulary/notebook'}>{data.total ? (data.dueNow ? 'Ôn ngay' : 'Mở sổ tay từ vựng') : 'Thêm từ để bắt đầu'}</Link></Button>
    </>}</StatisticsCard>
    <StatisticsCard title="Các khóa học của tôi" resource={progress}>{(data) => <>
      {data.courses.length === 0 ? <p>Chưa bắt đầu khóa học nào. <Link to="/learn">Khám phá khóa học</Link></p> : <div className="statistics-course-grid">{data.courses.map((course) => <article className="statistics-course" key={course.courseId}><h3>{course.name}</h3><p>{course.completedLessons}/{course.totalLessons} bài · {percentLabel(course.percent)}</p>{course.percent !== null && <progress max={100} value={course.percent} aria-label={`Tiến độ ${course.name}`} />}<p className="statistics-muted">Học gần nhất: {course.lastStudiedAt ? new Date(course.lastStudiedAt).toLocaleString('vi-VN') : 'Chưa có lịch sử thời gian'}</p><div className="statistics-controls"><Button asChild><Link to={`/learn/courses/${course.resumeTarget.courseId}`}>Tiếp tục học</Link></Button><Button variant="outline" onClick={() => filter('course', course.courseId)}>Xem số liệu</Button></div></article>)}</div>}
      {!courseId && <div className="statistics-controls statistics-pagination"><Button variant="outline" disabled={page === 0} onClick={() => setCoursePage(page - 1)}>Trước</Button><span>Trang {page + 1} · {data.totalCourses} khóa</span><Button variant="outline" disabled={!data.hasNext} onClick={() => setCoursePage(page + 1)}>Tiếp</Button></div>}
    </>}</StatisticsCard>
  </div>
}
