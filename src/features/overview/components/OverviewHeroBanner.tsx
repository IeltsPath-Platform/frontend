import { BookOpen, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { BandSummary, HeroCourse } from '../overviewViewModel'
import { percentLabel } from '../statisticsFormat'
import mascot from '../assets/mascot-owl-idea.png'
import dots from '../assets/hero-grid-dots.png'

interface OverviewHeroBannerProps {
  username: string
  band: BandSummary
  bandSourceLabel?: string
  journeyStart: number | null
  courses: HeroCourse[]
  courseLoading?: boolean
  courseError?: boolean
  onContinueStudy?: (course: HeroCourse | null) => void
}
const formatBand = (value: number | null) => value === null ? '—' : value.toFixed(1)

function ProgressRing({ percent }: { percent: number | null }) {
  const clamped = Math.min(100, Math.max(0, percent ?? 0))
  const circumference = 2 * Math.PI * 34
  return (
    <div className="overview-course-ring">
      <svg viewBox="0 0 80 80" role="img" aria-label={percent === null ? 'Chưa có dữ liệu tiến độ' : `Hoàn thành ${Math.round(clamped)}%`}>
        <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" opacity="0.2" strokeWidth="7" />
        <circle cx="40" cy="40" r="34" fill="none" stroke="var(--overview-yellow)" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${circumference * clamped / 100} ${circumference}`} />
      </svg>
      <span>{percent === null ? '—' : `${Math.round(clamped)}%`}<small>{percent === null ? 'chưa có dữ liệu' : 'hoàn thành'}</small></span>
    </div>
  )
}

export function OverviewHeroBanner({ username, band, bandSourceLabel, journeyStart, courses, courseLoading = false, courseError = false, onContinueStudy }: OverviewHeroBannerProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const course = courses.find((item) => item.id === selectedCourseId) ?? courses[0] ?? null
  const canChooseCourse = courses.length > 1 && course !== null
  const courseState = courseLoading ? 'Đang tải khóa học…' : courseError ? 'Chưa tải được khóa học' : 'Chưa có khóa học'
  return (
    <section className="overview-hero" aria-labelledby="overview-welcome-title">
      <img className="overview-hero-dots" src={dots} alt="" width="658" height="565" />
      <div className="overview-hero-welcome">
        <div className="overview-hero-identity">
          <span className="overview-hero-avatar"><img src={mascot} alt="" width="1334" height="1356" /></span>
          <div><p>Xin chào,</p><h1 id="overview-welcome-title">{username} <span className="hero-wave" aria-hidden="true">👋</span></h1></div>
        </div>
        <div className="overview-hero-action">
          <Button className="overview-continue-button" onClick={() => onContinueStudy?.(course)}>Tiếp tục học <Play size={16} fill="currentColor" aria-hidden="true" /></Button>
          <p>{course ? 'Đang học: ' : courseLoading || courseError ? '' : 'Bắt đầu: '}<strong>{course?.name ?? (courseLoading || courseError ? courseState : 'Chọn một khóa học')}</strong></p>
        </div>
      </div>
      <div className="overview-hero-progress">
        <div className="overview-hero-course-grid">
          <section className="overview-hero-glass overview-course-info" aria-labelledby="overview-course-title">
            <p className="overview-hero-eyebrow"><BookOpen size={14} aria-hidden="true" /> {canChooseCourse ? `Đang học ${courses.length} khóa` : 'Khóa đang học'}</p>
            <h2 id="overview-course-title">{canChooseCourse ? <Select value={course.id} onValueChange={setSelectedCourseId}>
              <SelectTrigger className="overview-course-switcher" aria-label="Chọn khóa học"><SelectValue>{course.name}</SelectValue></SelectTrigger>
              <SelectContent className="overview-course-options" position="popper" align="start" sideOffset={8} collisionPadding={12}>
                {courses.map((item) => <SelectItem key={item.id} value={item.id} textValue={item.name} className="overview-course-option"><span className="overview-course-option-copy"><span className="overview-course-option-icon" aria-hidden="true"><BookOpen size={16} /></span><strong>{item.name}</strong><span className="overview-course-option-meta">{item.completedLessons}/{item.totalLessons} bài</span><span className="overview-course-option-percent">{percentLabel(item.percent)}</span></span></SelectItem>)}
              </SelectContent>
            </Select> : course?.name ?? courseState}</h2>
            <p>{course?.startedAt ? `Bắt đầu: ${new Date(course.startedAt).toLocaleDateString('vi-VN')}` : courseLoading || courseError ? 'Tiến độ sẽ hiện khi dữ liệu sẵn sàng' : 'Sẵn sàng cho hành trình mới'}</p>
          </section>
          <section className="overview-hero-glass overview-course-completion" aria-label="Tiến độ khóa học">
            <ProgressRing percent={course?.percent ?? null} />
            <div><p className="overview-hero-eyebrow">Tiến độ khóa</p><strong>{course?.completedLessons ?? '—'} <small>/ {course?.totalLessons ?? '—'} bài</small></strong><p>{course ? `Còn ${Math.max(0, course.totalLessons - course.completedLessons)} bài học` : 'Chưa có tiến độ'}</p></div>
          </section>
        </div>
        <section className="overview-journey" aria-label="Hành trình IELTS">
          <span className="overview-journey-label">IELTS JOURNEY</span>
          <div className="overview-journey-track">
            <span><small>Bắt đầu</small><strong>{formatBand(journeyStart)}</strong></span>
            <span className="overview-journey-current"><small>Hiện tại</small><strong>{formatBand(band.current)}</strong></span>
            <span className="overview-journey-target"><small>Mục tiêu</small><strong>{formatBand(band.target)}</strong></span>
          </div>
          {band.current !== null && bandSourceLabel && <p className="overview-journey-source">{bandSourceLabel}</p>}
        </section>
      </div>
    </section>
  )
}
