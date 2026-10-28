import React from 'react'
import { useSearchParams } from 'react-router-dom'
import { PracticeNavbar } from '@/features/practice/components/PracticeNavbar'
import { OverviewSidebar } from '../components/OverviewSidebar'
import { OverviewHome } from '../components/OverviewHome'
import { OverviewDetailedStats } from '../components/OverviewDetailedStats'
import { ProfileTab } from '@/features/profile/ProfileTab'
import type { OverviewSidebarTab } from '@/types/overview'
import '../overview.css'

export const OverviewPage: React.FC = () => {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab')
  const tabs: OverviewSidebarTab[] = ['overview', 'detailed-stats', 'favorites', 'history', 'orders', 'support', 'profile', 'ranking']
  const activeSidebarTab = tabs.includes(tab as OverviewSidebarTab) ? tab as OverviewSidebarTab : 'overview'
  const setActiveSidebarTab = (value: OverviewSidebarTab) => setParams((previous) => {
    const next = new URLSearchParams(previous)
    next.set('tab', value)
    return next
  })

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
            {activeSidebarTab === 'overview' && <OverviewHome />}

            {activeSidebarTab === 'detailed-stats' && (
              <OverviewDetailedStats />
            )}

            {activeSidebarTab === 'profile' && (
              <ProfileTab />
            )}

            {activeSidebarTab !== 'overview' &&
              activeSidebarTab !== 'detailed-stats' &&
              activeSidebarTab !== 'profile' && (
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
