import React, { useState } from 'react'
import { ArrowRight, Clock3 } from 'lucide-react'
import type { PracticeCard } from '@/types/practice'

interface PracticeTestCardProps {
  card: PracticeCard
  onClick: (card: PracticeCard) => void
}

/** "Passage 2: Cooling cities" under a "Passage 2" badge repeats itself, so the title drops the part that the badge shows. */
function displayTitle(card: PracticeCard) {
  const prefix = `${card.passageBadge}:`
  return card.title.toLowerCase().startsWith(prefix.toLowerCase()) ? card.title.slice(prefix.length).trim() || card.title : card.title
}

export const PracticeTestCard: React.FC<PracticeTestCardProps> = ({
  card,
  onClick,
}) => {
  // The photo fades in once it has loaded; until then the box shimmers like the skeleton card it replaces.
  const [photoLoaded, setPhotoLoaded] = useState(false)
  const formats = card.formatLabels ?? card.bulletPoints.slice(0, -1)
  const meta = card.meta ?? card.bulletPoints.at(-1)
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
      {/* The part badge hangs from the top-right corner of the photo. */}
      <div className="card-media">
        <div className={`card-image-box${card.imageUrl && !photoLoaded ? ' is-loading' : ''}`}>
          {card.imageUrl ? (
            <img
              ref={(image) => { if (image?.complete && image.naturalWidth > 0) setPhotoLoaded(true) }}
              src={card.imageUrl}
              alt=""
              className={`card-photo${photoLoaded ? ' is-loaded' : ''}`}
              decoding="async"
              onLoad={() => setPhotoLoaded(true)}
              onError={() => setPhotoLoaded(true)}
            />
          ) : (
            <div className="card-photo card-photo-empty" aria-hidden="true" />
          )}
        </div>
        <div className="card-passage-pill">{card.passageBadge}</div>
      </div>

      <div className="card-body">
        <h3 className="card-name-title" title={card.title}>
          {displayTitle(card)}
        </h3>
        {formats.length > 0 && (
          <ul className="card-format-list" aria-label="Dạng câu hỏi">
            {formats.map((label) => <li key={label}>{label}</li>)}
          </ul>
        )}
        {meta && (
          <p className="card-meta">
            <Clock3 size={14} aria-hidden="true" />
            {meta}
            <ArrowRight className="card-meta-arrow" size={16} aria-hidden="true" />
          </p>
        )}
      </div>
    </div>
  )
}
