import React from 'react'
import { ArrowRight, BookOpen, GraduationCap, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { UserAcademicProfile } from '@/types/overview'

interface OverviewHeroBannerProps {
  profile: UserAcademicProfile
  onContinueStudy?: () => void
}

export const OverviewHeroBanner: React.FC<OverviewHeroBannerProps> = ({ profile, onContinueStudy }) => (
  <div className="overview-intro-grid">
    <section className="overview-welcome" aria-labelledby="overview-welcome-title">
      <div className="hero-user-identity">
        <span className="hero-avatar"><GraduationCap size={28} aria-hidden="true" /></span>
        <div>
          <p className="hero-greeting">Xin chào,</p>
          <h1 id="overview-welcome-title" className="hero-username">{profile.username} <span className="hero-wave">👋</span></h1>
        </div>
      </div>
      <p className="hero-band-summary">Band hiện tại: <strong>{profile.currentBand.toFixed(1)}</strong><ArrowRight size={16} aria-hidden="true" /> Mục tiêu: <strong>{profile.targetBand.toFixed(1)}</strong></p>
      <div className="hero-action-row">
        <Button className="hero-continue-cta-btn" onClick={onContinueStudy}>Tiếp tục học <Play size={16} fill="currentColor" /></Button>
        <p className="hero-next-lesson-hint">Bài học tiếp theo:<strong>{profile.nextLessonText}</strong></p>
      </div>
    </section>

    <section className="overview-course" aria-labelledby="overview-course-title">
      <div className="course-box-header"><BookOpen size={18} aria-hidden="true" /><span>Khoá Đang Học</span></div>
      <h2 id="overview-course-title" className="course-name-title">{profile.currentCourse}</h2>
      <div className="course-dates-text"><span>Khai giảng: {profile.startDate}</span><span>Kết thúc: {profile.endDate}</span></div>
      <div className="course-progress-summary"><span>Tiến Độ Khoá</span><strong>{profile.courseCompletedPercent}% <small>hoàn thành</small></strong></div>
      <progress className="overview-course-progress" value={profile.courseCompletedPercent} max={100} aria-label="Tiến độ khoá học" />
      <div className="course-progress-summary"><span><strong>{profile.lessonsCount}</strong>/{profile.totalLessons} buổi</span><span>Còn {profile.remainingLessons} buổi kết thúc</span></div>
    </section>

    <section className="hero-journey-timeline" aria-label="IELTS Journey">
      <span className="journey-tag">IELTS JOURNEY</span>
      <div className="journey-track-wrapper">
        <div className="journey-line-track" aria-hidden="true" />
        <div className="journey-node start"><span className="node-caption">Bắt đầu</span><strong className="node-circle">{profile.journeyStart}</strong></div>
        <div className="journey-node current"><span className="node-caption">Hiện tại</span><strong className="node-circle-highlight">{profile.journeyCurrent}</strong></div>
        <div className="journey-node target"><span className="node-caption">Target</span><strong className="node-circle-target">{profile.journeyTarget.toFixed(1)}</strong></div>
      </div>
    </section>
  </div>
)
