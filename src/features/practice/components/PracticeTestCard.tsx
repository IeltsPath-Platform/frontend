import React from 'react'
import type { PracticeCard } from '@/types/practice'

interface PracticeTestCardProps {
  card: PracticeCard
  onClick: (card: PracticeCard) => void
}

export const PracticeTestCard: React.FC<PracticeTestCardProps> = ({
  card,
  onClick,
}) => {
  const isPro = card.tag === 'PRO'

  return (
    <div
      className="practice-visual-card"
      onClick={() => onClick(card)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick(card)
        }
      }}
    >
      {/* Top Image Section */}
      <div className="card-image-box">
        <img
          src={card.imageUrl}
          alt={card.title}
          className="card-photo"
          loading="lazy"
        />

        {/* Diagonal Ribbon */}
        <div className={`corner-ribbon ${isPro ? 'ribbon-orange' : 'ribbon-green'}`}>
          <span>{card.tag}</span>
        </div>
      </div>

      {/* Bottom Royal Blue Box */}
      <div className="card-blue-box">
        <div className="card-passage-pill">{card.passageBadge}</div>
        <h3 className="card-name-title" title={card.title}>
          {card.title}
        </h3>
        <ul className="card-bullets-list">
          {card.bulletPoints.map((bp, idx) => (
            <li key={idx} className="bullet-point-item">
              <span className="bullet-point-dot">•</span>
              <span>{bp}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
