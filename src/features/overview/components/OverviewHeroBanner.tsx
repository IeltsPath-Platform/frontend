import React from 'react'
import { ArrowRight, BookOpen, GraduationCap, Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { BandSummary, HeroCourse } from '../overviewViewModel'

interface OverviewHeroBannerProps {
  username: string
  band: BandSummary
  /** Band of the placement test, the start of the journey. */
  journeyStart: number | null
  course: HeroCourse | null
  onContinueStudy?: () => void
}

const band = (value: number | null) => value === null ? '—' : value.toFixed(1)
const date = (value: string | null) => value ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa có'

export const OverviewHeroBanner: React.FC<OverviewHeroBannerProps> = ({ username, band: summary, journeyStart, course, onContinueStudy }) => (
  <div className="overview-intro-grid">
    <section className="overview-welcome" aria-labelledby="overview-welcome-title">
      <div className="hero-user-identity">
        <span className="hero-avatar"><GraduationCap size={28} aria-hidden="true" /></span>
        <div>
          <p className="hero-greeting">Xin chào,</p>
          <h1 id="overview-welcome-title" className="hero-username">{username} <span className="hero-wave">👋</span></h1>
        </div>
      </div>
      <p className="hero-band-summary">
        Band hiện tại{summary.currentIsEstimate ? ' (ước tính)' : ''}: <strong>{band(summary.current)}</strong>
        <ArrowRight size={16} aria-hidden="true" /> Mục tiêu: <strong>{band(summary.target)}</strong>
      </p>
      <div className="hero-action-row">
        <Button className="hero-continue-cta-btn" onClick={onContinueStudy}>Tiếp tục học <Play size={16} fill="currentColor" /></Button>
        <p className="hero-next-lesson-hint">
          {course ? 'Đang học:' : 'Bắt đầu:'}<strong>{course ? course.name : 'Chọn một khóa học'}</strong>
        </p>
      </div>
    </section>

    <section className="overview-course" aria-labelledby="overview-course-title">
      <div className="course-box-header"><BookOpen size={18} aria-hidden="true" /><span>Khoá Đang Học</span></div>
      {course ? (
        <>
          <h2 id="overview-course-title" className="course-name-title">{course.name}</h2>
          <div className="course-dates-text">
            <span>Bắt đầu: {date(course.startedAt)}</span>
            <span>Ngày thi: {date(summary.examDate)}</span>
          </div>
          <div className="course-progress-summary"><span>Tiến Độ Khoá</span><strong>{Math.round(course.percent)}% <small>hoàn thành</small></strong></div>
          <progress className="overview-course-progress" value={course.percent} max={100} aria-label="Tiến độ khoá học" />
          <div className="course-progress-summary">
            <span><strong>{course.completedLessons}</strong>/{course.totalLessons} bài học</span>
            <span>Còn {Math.max(0, course.totalLessons - course.completedLessons)} bài</span>
          </div>
        </>
      ) : (
        <>
          <h2 id="overview-course-title" className="course-name-title">Chưa bắt đầu khóa học nào</h2>
          <p className="overview-hero-empty">Chọn một khóa học để theo dõi tiến độ và bài học tiếp theo tại đây.</p>
          <Link to="/learn" className="overview-hero-empty-link">Xem các khóa học</Link>
        </>
      )}
    </section>

    <section className="hero-journey-timeline" aria-label="IELTS Journey">
      <span className="journey-tag">IELTS JOURNEY</span>
      <div className="journey-track-wrapper">
        <div className="journey-line-track" aria-hidden="true" />
        <div className="journey-node start"><span className="node-caption">Bắt đầu</span><strong className="node-circle">{band(journeyStart)}</strong></div>
        <div className="journey-node current"><span className="node-caption">Hiện tại</span><strong className="node-circle-highlight">{band(summary.current)}</strong></div>
        <div className="journey-node target"><span className="node-caption">Target</span><strong className="node-circle-target">{band(summary.target)}</strong></div>
      </div>
    </section>
  </div>
)
