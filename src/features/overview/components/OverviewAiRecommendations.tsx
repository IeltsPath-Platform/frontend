import React from 'react'
import { Headphones, RefreshCw, PenTool, Play, ChevronLeft, ChevronRight } from 'lucide-react'
import type { AiRecommendationItem } from '@/types/overview'

interface OverviewAiRecommendationsProps {
  recommendations: AiRecommendationItem[]
  onAction?: (id: string) => void
}

export const OverviewAiRecommendations: React.FC<OverviewAiRecommendationsProps> = ({
  recommendations,
  onAction,
}) => {
  return (
    <section className="overview-ai-card">
      {/* Header */}
      <div className="ai-card-header">
        <div className="flex items-center gap-2">
          <h2 className="ai-header-title">Gợi Ý Ôn Luyện Từ AI</h2>
          <span className="ai-pill-tag">Cá nhân hoá theo lộ trình</span>
        </div>
        <span className="sparkle-star">✦</span>
      </div>

      {/* 3 Cards */}
      <div className="ai-cards-grid">
        {recommendations.map((item) => (
          <div key={item.id} className="ai-rec-box">
            <div className="rec-box-top">
              <div className="rec-icon-wrap">
                {item.iconType === 'headphones' && <Headphones size={22} />}
                {item.iconType === 'refresh' && <RefreshCw size={22} />}
                {item.iconType === 'pen' && <PenTool size={22} />}
              </div>
              <span className="rec-badge">{item.badgeText}</span>
            </div>

            <h3 className="rec-title">{item.title}</h3>
            <p className="rec-desc">{item.description}</p>

            <button
              type="button"
              className="rec-action-btn"
              onClick={() => onAction && onAction(item.id)}
            >
              <Play size={12} fill="#ffffff" className="mr-1 inline" />
              <span>Bắt đầu ngay</span>
            </button>
          </div>
        ))}
      </div>

      {/* Carousel footer arrows */}
      <div className="ai-carousel-nav">
        <button type="button" className="carousel-nav-btn" aria-label="Trước">
          <ChevronLeft size={14} />
        </button>
        <button type="button" className="carousel-nav-btn" aria-label="Sau">
          <ChevronRight size={14} />
        </button>
      </div>
    </section>
  )
}
