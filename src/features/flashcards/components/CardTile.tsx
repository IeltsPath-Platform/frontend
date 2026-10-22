import { useState, type ReactNode } from 'react'
import { RotateCw } from 'lucide-react'

interface CardTileProps {
  front: string
  back: string
  imageUrl?: string | null
  example?: string | null
  meta?: ReactNode
  actions?: ReactNode
}

/** Grid tile that flips between term and meaning; actions stay outside the flip button. */
export function CardTile({ front, back, imageUrl, example, meta, actions }: CardTileProps) {
  const [flipped, setFlipped] = useState(false)
  return (
    <article className="flashcard-tile">
      <button type="button" className="flashcard-tile-face" aria-pressed={flipped}
        aria-label={flipped ? `Mặt sau của ${front}` : `Lật thẻ ${front}`} onClick={() => setFlipped((value) => !value)}>
        {imageUrl && !flipped && <img src={imageUrl} alt="" loading="lazy" />}
        {flipped ? (
          <span className="flashcard-tile-back"><b>{back}</b>{example && <i>{example}</i>}</span>
        ) : <strong>{front}</strong>}
        <small><RotateCw aria-hidden="true" size={12} />{flipped ? 'Mặt sau' : 'Mặt trước'}</small>
      </button>
      {(meta || actions) && <footer>{meta && <span className="flashcard-tile-meta">{meta}</span>}{actions}</footer>}
    </article>
  )
}
