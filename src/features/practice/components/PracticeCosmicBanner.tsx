import React from 'react'
import { Play } from 'lucide-react'

interface PracticeCosmicBannerProps {
  onStartTest?: () => void
}

export const PracticeCosmicBanner: React.FC<PracticeCosmicBannerProps> = ({
  onStartTest,
}) => {
  return (
    <div className="practice-cosmic-card">
      {/* 3D Owl Mascot on the Left */}
      <div className="cosmic-mascot-wrapper">
        <svg
          className="cosmic-owl-mascot"
          viewBox="0 0 180 180"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Cap */}
          <polygon points="90,12 148,32 90,52 32,32" fill="#0f2b7a" />
          <polygon points="56,42 56,62 90,75 124,62 124,42" fill="#091e56" />
          <path d="M136,36 V66 L142,72" stroke="#f59e0b" strokeWidth="2.5" />
          <circle cx="142" cy="74" r="3" fill="#f59e0b" />

          {/* Owl Body in Navy Suit */}
          <ellipse cx="90" cy="115" rx="46" ry="50" fill="#1d4ed8" />
          {/* White Shirt Collar & Blue Tie */}
          <polygon points="90,85 76,105 104,105" fill="#ffffff" />
          <polygon points="87,95 93,95 95,120 90,128 85,120" fill="#2563eb" />

          {/* Glasses & Big Eyes */}
          <circle cx="70" cy="88" r="16" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
          <circle cx="110" cy="88" r="16" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
          <line x1="86" y1="88" x2="94" y2="88" stroke="#cbd5e1" strokeWidth="3" />
          <circle cx="72" cy="88" r="9" fill="#0f2b7a" />
          <circle cx="108" cy="88" r="9" fill="#0f2b7a" />
          <circle cx="75" cy="85" r="3.5" fill="#ffffff" />
          <circle cx="111" cy="85" r="3.5" fill="#ffffff" />

          {/* Beak */}
          <polygon points="85,98 95,98 90,108" fill="#f59e0b" />

          {/* Clipboard on right */}
          <g transform="translate(108, 92) rotate(-6)">
            <rect x="0" y="0" width="38" height="52" rx="4" fill="#fcd34d" stroke="#d97706" strokeWidth="1.5" />
            <rect x="11" y="-4" width="16" height="7" rx="2" fill="#94a3b8" />
            <text x="6" y="16" fontSize="7" fill="#1e293b" fontWeight="bold">✔ Listening</text>
            <text x="6" y="26" fontSize="7" fill="#1e293b" fontWeight="bold">✔ Reading</text>
            <text x="6" y="36" fontSize="7" fill="#1e293b" fontWeight="bold">✔ Writing</text>
            <text x="6" y="46" fontSize="7" fill="#1e293b" fontWeight="bold">✔ Speaking</text>
          </g>

          {/* Pen in hand */}
          <line x1="38" y1="90" x2="52" y2="105" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
        </svg>
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
