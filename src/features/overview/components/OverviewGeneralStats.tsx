import React from 'react'
import {
  Clock,
  Calendar,
  FileCheck2,
  Target,
  Flame,
  Laptop,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { GeneralStudyStats, DayStreakItem } from '@/types/overview'

interface OverviewGeneralStatsProps {
  stats: GeneralStudyStats
  streakDays: DayStreakItem[]
}

export const OverviewGeneralStats: React.FC<OverviewGeneralStatsProps> = ({
  stats,
  streakDays,
}) => {
  return (
    <section className="overview-general-stats-container">
      {/* Title */}
      <div className="stats-section-header">
        <h2 className="stats-main-title">Dữ Liệu Học Tổng Quan</h2>
        <p className="stats-main-subtitle">Thống kê hoạt động học tập của bạn</p>
      </div>

      {/* 5 Stats Cards Row */}
      <div className="five-stats-grid">
        {/* Card 1: Tổng thời gian học */}
        <div className="overview-stat-card card-time">
          <div className="stat-card-icon-circle time-icon">
            <Clock size={20} />
          </div>
          <span className="stat-label">Tổng thời gian học</span>
          <strong className="stat-value">{stats.totalStudyTime}</strong>
          <span className="stat-delta text-blue-600">{stats.studyTimeWeeklyDiff}</span>
        </div>

        {/* Card 2: Số ngày học */}
        <div className="overview-stat-card card-days">
          <div className="stat-card-icon-circle calendar-icon">
            <Calendar size={20} />
          </div>
          <span className="stat-label">Số ngày học</span>
          <strong className="stat-value">{stats.totalStudyDays} ngày</strong>
          <span className="stat-subtext text-slate-500">có hoạt động học tập</span>
        </div>

        {/* Card 3: Số đề đã luyện */}
        <div className="overview-stat-card card-tests">
          <div className="stat-card-icon-circle tests-icon">
            <FileCheck2 size={20} />
          </div>
          <span className="stat-label">Số đề đã luyện</span>
          <strong className="stat-value">{stats.testsCompletedCount} đề</strong>
          <span className="stat-subtext text-emerald-600">đã hoàn thành</span>
        </div>

        {/* Card 4: Tỷ lệ chính xác */}
        <div className="overview-stat-card card-accuracy">
          <div className="stat-card-icon-circle accuracy-icon">
            <Target size={20} />
          </div>
          <span className="stat-label">Tỷ lệ chính xác</span>
          <strong className="stat-value">{stats.averageAccuracyRate}%</strong>
          <span className="stat-subtext text-slate-500">trung bình các bài</span>
        </div>

        {/* Card 5: Streak học */}
        <div className="overview-stat-card card-streak">
          <div className="stat-card-icon-circle streak-icon">
            <Flame size={20} />
          </div>
          <span className="stat-label">Streak học</span>
          <strong className="stat-value">{stats.currentStreakDays} ngày</strong>
          <span className="stat-subtext text-orange-600">kỷ lục cá nhân</span>
        </div>
      </div>

      {/* Chuỗi học LMS tuần này Card */}
      <div className="lms-streak-box">
        {/* Header with week date range */}
        <div className="lms-header-row">
          <div className="flex items-center gap-2">
            <div className="lms-icon-square">
              <Laptop size={18} className="text-orange-500" />
            </div>
            <h3 className="lms-title">Chuỗi học LMS tuần này</h3>
          </div>

          <div className="lms-range-controls">
            <button type="button" className="lms-nav-arrow" aria-label="Tuần trước">
              <ChevronLeft size={14} />
            </button>
            <span className="lms-date-range">02/08/2026 – 08/08/2026</span>
            <button type="button" className="lms-nav-arrow" aria-label="Tuần sau">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Stats highlight & Day flames */}
        <div className="lms-streak-content">
          <div className="lms-streak-highlight">
            <span className="streak-big-num">5</span>
            <span className="streak-big-label">ngày học liên tiếp</span>
          </div>

          <div className="lms-record-stat">
            <strong>28</strong> ngày (Kỷ lục giữ chuỗi học {stats.streakRecordMonth})
          </div>
        </div>

        {/* 7 Days of the week row */}
        <div className="lms-days-row">
          {streakDays.map((d) => (
            <div key={d.dayLabel} className="lms-day-item">
              <div
                className={`day-flame-circle ${
                  d.status === 'completed' ? 'completed' : 'empty'
                }`}
              >
                {d.status === 'completed' ? (
                  <Flame
                    size={22}
                    className={
                      d.badgeColor === 'blue'
                        ? 'text-sky-500 fill-sky-400'
                        : 'text-amber-500 fill-amber-500'
                    }
                  />
                ) : (
                  <div className="empty-day-ring" />
                )}
              </div>
              <span className="day-name-label">{d.dayLabel}</span>
              {d.status === 'completed' && (
                <span
                  className={`day-status-dot ${
                    d.badgeColor === 'blue' ? 'dot-blue' : 'dot-red'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
