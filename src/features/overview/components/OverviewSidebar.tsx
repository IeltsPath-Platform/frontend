import React from 'react'
import {
  LayoutDashboard,
  BarChart2,
  Bookmark,
  Clock,
  ShoppingBag,
  HelpCircle,
  User,
  Award,
  MessageSquare,
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
      <nav className="overview-sidebar-nav">
        <button
          type="button"
          className={`sidebar-item-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => onSelectTab('overview')}
        >
          <LayoutDashboard size={18} />
          <span>Tổng quát</span>
        </button>

        <button
          type="button"
          className={`sidebar-item-btn ${activeTab === 'detailed-stats' ? 'active' : ''}`}
          onClick={() => onSelectTab('detailed-stats')}
        >
          <BarChart2 size={18} />
          <span>Dữ liệu chi tiết</span>
        </button>

        <button
          type="button"
          className={`sidebar-item-btn ${activeTab === 'favorites' ? 'active' : ''}`}
          onClick={() => onSelectTab('favorites')}
        >
          <Bookmark size={18} />
          <span>Danh sách yêu thích</span>
        </button>

        <button
          type="button"
          className={`sidebar-item-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => onSelectTab('history')}
        >
          <Clock size={18} />
          <span>Lịch sử ôn luyện</span>
        </button>

        <button
          type="button"
          className={`sidebar-item-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => onSelectTab('orders')}
        >
          <ShoppingBag size={18} />
          <span>Lịch sử đơn hàng</span>
        </button>

        <button
          type="button"
          className={`sidebar-item-btn ${activeTab === 'support' ? 'active' : ''}`}
          onClick={() => onSelectTab('support')}
        >
          <HelpCircle size={18} />
          <span>Hỗ trợ</span>
        </button>

        <button
          type="button"
          className={`sidebar-item-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => onSelectTab('profile')}
        >
          <User size={18} />
          <span>Hồ sơ của tôi</span>
        </button>

        <button
          type="button"
          className={`sidebar-item-btn ${activeTab === 'ranking' ? 'active' : ''}`}
          onClick={() => onSelectTab('ranking')}
        >
          <Award size={18} />
          <span>Xếp hạng</span>
        </button>
      </nav>

      {/* Mentor Box */}
      <div className="overview-mentor-card">
        <span className="mentor-card-label">Mentor của bạn</span>
        <div className="mentor-profile-row">
          <div className="mentor-avatar-badge">
            <span>L</span>
          </div>
          <div className="mentor-info-col">
            <h4 className="mentor-name">Ms. Lan</h4>
            <p className="mentor-role">IELTS Instructor</p>
          </div>
        </div>
        <button type="button" className="mentor-contact-btn">
          <MessageSquare size={13} className="mr-1 inline" />
          <span>Nhắn Mentor</span>
        </button>
      </div>
    </aside>
  )
}
