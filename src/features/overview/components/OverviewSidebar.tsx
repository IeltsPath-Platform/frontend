import React from 'react'
import {
  LayoutDashboard,
  BarChart2,
  Trophy,
  User,
} from 'lucide-react'
import type { OverviewSidebarTab } from '@/types/overview'

interface OverviewSidebarProps {
  activeTab: OverviewSidebarTab
  onSelectTab: (tab: OverviewSidebarTab) => void
}

export const OverviewSidebar: React.FC<OverviewSidebarProps> = ({
  activeTab,
  onSelectTab,
}) => {
  return (
    <aside className="overview-navy-sidebar">
      {/* Navigation menu */}
      <nav className="overview-sidebar-nav" aria-label="Điều hướng dashboard">
        <button
          type="button"
          className={`sidebar-item-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => onSelectTab('overview')}
          aria-current={activeTab === 'overview' ? 'page' : undefined}
        >
          <LayoutDashboard size={18} />
          <span>Tổng quát</span>
        </button>

        <button
          type="button"
          className={`sidebar-item-btn ${activeTab === 'detailed-stats' ? 'active' : ''}`}
          onClick={() => onSelectTab('detailed-stats')}
          aria-current={activeTab === 'detailed-stats' ? 'page' : undefined}
        >
          <BarChart2 size={18} />
          <span>Dữ liệu chi tiết</span>
        </button>

        <button
          type="button"
          className={`sidebar-item-btn ${activeTab === 'achievements' ? 'active' : ''}`}
          onClick={() => onSelectTab('achievements')}
          aria-current={activeTab === 'achievements' ? 'page' : undefined}
        >
          <Trophy size={18} />
          <span>Thành tích của tôi</span>
        </button>

        <button
          type="button"
          className={`sidebar-item-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => onSelectTab('profile')}
          aria-current={activeTab === 'profile' ? 'page' : undefined}
        >
          <User size={18} />
          <span>Hồ sơ của tôi</span>
        </button>

      </nav>

    </aside>
  )
}
