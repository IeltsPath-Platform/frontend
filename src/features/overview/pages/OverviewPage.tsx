import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PracticeNavbar } from '@/features/practice/components/PracticeNavbar'
import { OverviewSidebar } from '../components/OverviewSidebar'
import { OverviewHeroBanner } from '../components/OverviewHeroBanner'
import { OverviewActivityCalendar } from '../components/OverviewActivityCalendar'
import { OverviewGeneralStats } from '../components/OverviewGeneralStats'
import { OverviewLearningOrbit } from '../components/OverviewLearningOrbit'
import { OverviewStudyPlanAndAutonomy } from '../components/OverviewStudyPlanAndAutonomy'
import { OverviewAiRecommendations } from '../components/OverviewAiRecommendations'
import { OverviewDetailedStats } from '../components/OverviewDetailedStats'
import {
  MOCK_USER_PROFILE,
  MOCK_GENERAL_STATS,
  MOCK_WEEKLY_STREAK,
  MOCK_ORBIT_SKILLS,
  MOCK_STUDY_PLAN_TASKS,
  MOCK_SPACE_AUTONOMY_NODES,
  MOCK_AI_RECOMMENDATIONS,
} from '@/mocks/overviewData'
import type { OverviewSidebarTab } from '@/types/overview'
import '../overview.css'

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate()
  const [activeSidebarTab, setActiveSidebarTab] =
    useState<OverviewSidebarTab>('overview')

  const handleStartPractice = () => {
    navigate('/practice-tests')
  }

  return (
    <div className="overview-page-root">
      {/* 1. Unified Royal Navy Header */}
      <PracticeNavbar activeTab="overview" />

      {/* 2. Main Shell Layout */}
      <div className="overview-main-shell">
        <div className="overview-layout-grid">
          {/* Left Dark Navy Sidebar */}
          <OverviewSidebar
            activeTab={activeSidebarTab}
            onSelectTab={setActiveSidebarTab}
          />

          {/* Right Main Content */}
          <main className="overview-main-content">
            {activeSidebarTab === 'overview' && (
              <div className="overview-flow-sections">
                {/* Hero Banner (Top Box) */}
                <OverviewHeroBanner
                  profile={MOCK_USER_PROFILE}
                  onContinueStudy={handleStartPractice}
                />

                {/* Dữ liệu học tổng quan và lịch hoạt động */}
                <OverviewGeneralStats
                  stats={MOCK_GENERAL_STATS}
                />

                <OverviewActivityCalendar streakDays={MOCK_WEEKLY_STREAK} currentStreakDays={MOCK_GENERAL_STATS.currentStreakDays} />

                {/* My Learning Orbit */}
                <OverviewLearningOrbit skills={MOCK_ORBIT_SKILLS} />

                {/* Study Plan & SPACE Autonomy */}
                <OverviewStudyPlanAndAutonomy
                  tasks={MOCK_STUDY_PLAN_TASKS}
                  autonomyNodes={MOCK_SPACE_AUTONOMY_NODES}
                  onStartStudy={handleStartPractice}
                />

                {/* Gợi Ý Ôn Luyện Từ AI */}
                <OverviewAiRecommendations
                  recommendations={MOCK_AI_RECOMMENDATIONS}
                  onAction={() => handleStartPractice()}
                />
              </div>
            )}

            {activeSidebarTab === 'detailed-stats' && (
              <OverviewDetailedStats />
            )}

            {activeSidebarTab !== 'overview' &&
              activeSidebarTab !== 'detailed-stats' && (
                <div className="overview-placeholder-card">
                  <h3 className="font-bold text-lg text-slate-800 mb-2">
                    Tính năng đang được cập nhật
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Khu vực này đang hoàn thiện đồng bộ dữ liệu. Bạn có thể quay lại
                    màn hình Overview hoặc Dữ liệu chi tiết.
                  </p>
                  <button
                    type="button"
                    className="overview-back-btn"
                    onClick={() => setActiveSidebarTab('overview')}
                  >
                    Quay về Overview
                  </button>
                </div>
              )}
          </main>
        </div>
      </div>
    </div>
  )
}
