import React from 'react'
import { Play, ChevronRight, GraduationCap } from 'lucide-react'
import type { UserAcademicProfile } from '@/types/overview'

interface OverviewHeroBannerProps {
  profile: UserAcademicProfile
  onContinueStudy?: () => void
}

export const OverviewHeroBanner: React.FC<OverviewHeroBannerProps> = ({
  profile,
  onContinueStudy,
}) => {
  return (
    <section className="overview-hero-card">
      <div className="hero-top-row">
        {/* User Identity */}
        <div className="hero-user-identity">
          <div className="hero-owl-avatar-wrap">
            <div className="hero-owl-circle">
              <GraduationCap size={28} className="text-white" />
            </div>
            <span className="hero-online-status-dot" />
          </div>

          <div className="hero-user-copy">
            <span className="hero-greeting">Xin chào,</span>
            <h1 className="hero-username">{profile.username} 👋</h1>
            <div className="hero-target-pill">
              <span>Band hiện tại: {profile.currentBand.toFixed(1)}</span>
              <span className="mx-1.5 text-amber-400">➔</span>
              <span className="text-amber-300 font-bold">
                Mục tiêu: {profile.targetBand.toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Course Info Middle Box */}
        <div className="hero-course-info-box">
          <div className="course-box-header">
            <Play size={11} fill="#ffffff" className="mr-1 inline" />
            <span>Khoá Đang Học</span>
          </div>
          <h2 className="course-name-title">{profile.currentCourse}</h2>
          <div className="course-dates-text">
            <span>Khai giảng: {profile.startDate}</span>
            <br />
            <span>Kết thúc: {profile.endDate}</span>
          </div>
        </div>

        {/* Progress Gauge Far-Right Box */}
        <div className="hero-progress-gauge-box">
          <div className="circular-gauge-wrapper">
            <svg className="gauge-svg" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="34"
                className="gauge-track-bg"
                strokeWidth="7"
              />
              <circle
                cx="40"
                cy="40"
                r="34"
                className="gauge-track-progress"
                strokeWidth="7"
                strokeDasharray="213.6"
                strokeDashoffset={213.6 * (1 - profile.courseCompletedPercent / 100)}
              />
            </svg>
            <div className="gauge-label-inner">
              <span className="gauge-percent">{profile.courseCompletedPercent}%</span>
              <span className="gauge-sub">hoàn thành</span>
            </div>
          </div>

          <div className="gauge-meta-col">
            <span className="gauge-title">Tiến Độ Khoá</span>
            <div className="gauge-lessons-count">
              <strong>{profile.lessonsCount}</strong>
              <small>/{profile.totalLessons}</small>
            </div>
            <span className="gauge-remaining">
              Còn {profile.remainingLessons} buổi kết thúc
            </span>
            <button type="button" className="gauge-details-link">
              <span>Chi tiết</span>
              <ChevronRight size={13} className="ml-0.5 inline" />
            </button>
          </div>
        </div>
      </div>

      {/* CTA Button & Next Lesson */}
      <div className="hero-action-row">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="hero-continue-cta-btn"
            onClick={onContinueStudy}
          >
            <span>Tiếp tục học</span>
            <Play size={14} fill="#ffffff" className="ml-1.5 inline" />
          </button>
          <span className="hero-next-lesson-hint">
            Bài học tiếp theo: <strong>{profile.nextLessonText}</strong>
          </span>
        </div>
      </div>

      {/* Bottom IELTS Journey Progress Bar */}
      <div className="hero-journey-timeline">
        <span className="journey-tag">IELTS JOURNEY</span>

        <div className="journey-track-wrapper">
          <div className="journey-line-track" />

          {/* Start node */}
          <div className="journey-node start">
            <span className="node-caption">Bắt đầu</span>
            <div className="node-circle">{profile.journeyStart}</div>
          </div>

          {/* Current node */}
          <div className="journey-node current">
            <span className="node-caption">Hiện tại</span>
            <div className="node-circle-highlight">{profile.journeyCurrent}</div>
          </div>

          {/* Target node */}
          <div className="journey-node target">
            <span className="node-caption">Target</span>
            <div className="node-circle-target">{profile.journeyTarget.toFixed(1)}</div>
          </div>
        </div>
      </div>
    </section>
  )
}
