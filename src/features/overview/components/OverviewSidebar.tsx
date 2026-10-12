import React from 'react'
import {
  LayoutDashboard,
  BarChart2,
  Clock,
  User,
  Award,
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
          className={`sidebar-item-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => onSelectTab('history')}
          aria-current={activeTab === 'history' ? 'page' : undefined}
        >
          <Clock size={18} />
          <span>Lịch sử ôn luyện</span>
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

        <button
          type="button"
          className={`sidebar-item-btn ${activeTab === 'ranking' ? 'active' : ''}`}
          onClick={() => onSelectTab('ranking')}
          aria-current={activeTab === 'ranking' ? 'page' : undefined}
        >
          <Award size={18} />
          <span>Xếp hạng</span>
        </button>
      </nav>

    </aside>
  )
}
