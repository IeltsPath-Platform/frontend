import React from 'react'
import { Play } from 'lucide-react'
import { ClassMascot } from '@/components/ClassMascot'

interface PracticeCosmicBannerProps {
  onStartTest?: () => void
}

export const PracticeCosmicBanner: React.FC<PracticeCosmicBannerProps> = ({
  onStartTest,
}) => {
  return (
    <div className="practice-cosmic-card">
      {/* The class mascot, the dinosaur, on the left */}
      <div className="cosmic-mascot-wrapper">
        <ClassMascot size="md" className="cosmic-mascot" />
      </div>

      {/* Middle Banner Content */}
      <div className="cosmic-content">
        <h1 className="cosmic-title">Chưa biết mình đang ở band nào?</h1>
        <p className="cosmic-subtitle">
          Test đầu vào và khám phá trình độ IELTS hiện tại của bạn.
        </p>
        <button
          type="button"
          className="cosmic-test-cta-btn"
          onClick={onStartTest}
        >
          <Play size={14} fill="#ffffff" className="mr-1" />
          <span>TEST NGAY ✦</span>
        </button>
      </div>

      {/* Right Saturn Planet */}
      <div className="cosmic-saturn-wrapper">
        <div className="saturn-planet-sphere" />
        <div className="saturn-planet-rings" />
      </div>
    </div>
  )
}
