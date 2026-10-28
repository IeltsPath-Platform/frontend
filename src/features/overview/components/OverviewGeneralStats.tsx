import React from 'react'
import { Calendar, Clock, FileCheck2, Flame, Target } from 'lucide-react'
import type { PracticeHistory, StreakSummary, StudyTimeStatistics } from '../api/overviewApi'
import type { StatisticsResource } from '../hooks/useStatisticsResource'
import { formatDuration, practiceSummary, studyTotals } from '../overviewViewModel'
import { OverviewBlockStatus } from './OverviewBlockStatus'

interface OverviewGeneralStatsProps {
  time: StatisticsResource<StudyTimeStatistics>
  practice: StatisticsResource<PracticeHistory>
  streak: StatisticsResource<StreakSummary>
  today: Date
}

export const OverviewGeneralStats: React.FC<OverviewGeneralStatsProps> = ({ time, practice, streak, today }) => {
  const totals = time.data ? studyTotals(time.data.days, today) : null
  const tests = practice.data ? practiceSummary(practice.data) : null
  const sources = [time, practice, streak]
  const failed = sources.find((resource) => resource.error)

  return (
    <section className="overview-general-stats-container">
      <div className="stats-section-header">
        <h2 className="stats-main-title">Dữ Liệu Học Tổng Quan</h2>
        <p className="stats-main-subtitle">Thống kê hoạt động học tập của bạn</p>
      </div>

      <OverviewBlockStatus
        loading={sources.some((resource) => resource.loading) && !totals && !tests && !streak.data}
        error={failed?.error ?? null}
        onRetry={() => sources.forEach((resource) => resource.error && resource.reload())}
      />

      <div className="five-stats-grid">
        <div className="overview-stat-card card-time">
          <div className="stat-card-icon-circle time-icon"><Clock size={20} /></div>
          <span className="stat-label">Tổng thời gian học</span>
          <strong className="stat-value">{totals ? formatDuration(totals.totalSeconds) : '—'}</strong>
          <span className="stat-delta text-blue-600">{totals ? `${formatDuration(totals.weekSeconds)} trong 7 ngày qua` : '90 ngày gần nhất'}</span>
        </div>

        <div className="overview-stat-card card-days">
          <div className="stat-card-icon-circle calendar-icon"><Calendar size={20} /></div>
          <span className="stat-label">Số ngày học</span>
          <strong className="stat-value">{totals ? `${totals.studyDays} ngày` : '—'}</strong>
          <span className="stat-subtext text-slate-500">có hoạt động học tập</span>
        </div>

        <div className="overview-stat-card card-tests">
          <div className="stat-card-icon-circle tests-icon"><FileCheck2 size={20} /></div>
          <span className="stat-label">Số đề đã luyện</span>
          <strong className="stat-value">{tests ? `${new Intl.NumberFormat('vi-VN').format(tests.completed)} đề` : '—'}</strong>
          <span className="stat-subtext text-emerald-600">đã hoàn thành</span>
        </div>

        <div className="overview-stat-card card-accuracy">
          <div className="stat-card-icon-circle accuracy-icon"><Target size={20} /></div>
          <span className="stat-label">Tỷ lệ chính xác</span>
          <strong className="stat-value">{tests?.averagePercent != null ? `${tests.averagePercent}%` : '—'}</strong>
          <span className="stat-subtext text-slate-500">
            {tests && tests.sample > 0 ? `trung bình ${tests.sample} bài Reading/Listening gần nhất` : 'chưa có bài Reading/Listening'}
          </span>
        </div>

        <div className="overview-stat-card card-streak">
          <div className="stat-card-icon-circle streak-icon"><Flame size={20} /></div>
          <span className="stat-label">Streak học</span>
          <strong className="stat-value">{streak.data ? `${streak.data.currentDays} ngày` : '—'}</strong>
          <span className="stat-subtext text-orange-600">{streak.data ? `kỷ lục ${streak.data.longestDays} ngày` : 'chuỗi ngày học liên tiếp'}</span>
        </div>
      </div>
    </section>
  )
}
