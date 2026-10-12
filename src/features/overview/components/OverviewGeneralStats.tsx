import React from 'react'
import {
  Clock,
  Calendar,
  FileCheck2,
  Target,
  Flame,
} from 'lucide-react'
import type { GeneralStudyStats } from '@/types/overview'

interface OverviewGeneralStatsProps {
  stats: GeneralStudyStats
}

export const OverviewGeneralStats: React.FC<OverviewGeneralStatsProps> = ({
  stats,

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
    </section>
  )
}
