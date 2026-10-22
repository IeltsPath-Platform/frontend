import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { RefreshCw, Volume2 } from 'lucide-react'
import { prefersReducedMotion } from '@/components/owlPoses'
import { speak } from '../lib/speak'

export interface FlashcardFaceData {
  front: string
  back: string
  imageUrl?: string | null
  ipa?: string | null
  exampleSentence?: string | null
}

interface FlashcardFaceProps {
  card: FlashcardFaceData
  flipped: boolean
  onFlip: () => void
}

/**
 * 3D flip study card: renders both front and back simultaneously within a 1200px perspective.
 * When flipped, the inner container rotates 180 degrees with depth shadow and shine.
 * On mouse hover, tilts subtly following the pointer.
 */
export function FlashcardFace({ card, flipped, onFlip }: FlashcardFaceProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const lastFrontRef = useRef(card.front)
  const [slideKey, setSlideKey] = useState(0)

  // Trigger slide-in animation when a different card is loaded
  useEffect(() => {
    if (lastFrontRef.current !== card.front) {
      lastFrontRef.current = card.front
      setSlideKey((k) => k + 1)
    }
  }, [card.front])

  const lean = (event: ReactPointerEvent<HTMLDivElement>) => {
    const root = rootRef.current
    if (!root || event.pointerType !== 'mouse' || prefersReducedMotion()) return
    const box = root.getBoundingClientRect()
    const leanX = ((event.clientX - box.left) / box.width - 0.5) * 10
    const leanY = ((event.clientY - box.top) / box.height - 0.5) * -10
    root.style.setProperty('--lean-x', `${leanX.toFixed(2)}deg`)
    root.style.setProperty('--lean-y', `${leanY.toFixed(2)}deg`)
  }

  const straighten = () => {
    const root = rootRef.current
    if (!root) return
    root.style.setProperty('--lean-x', '0deg')
    root.style.setProperty('--lean-y', '0deg')
  }

  const speakButton = (text: string, label: string) => (
    <button
      type="button"
      className="flashcard-face-speak"
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation()
        speak(text)
      }}
    >
      <Volume2 aria-hidden="true" />
    </button>
  )

  return (
    <div
      key={`flashcard-${slideKey}`}
      ref={rootRef}
      className={`flashcard-face${flipped ? ' is-flipped' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={
        flipped
          ? `Mặt sau: ${card.back}. Nhấn để lật lại`
          : `Mặt trước: ${card.front}. Nhấn để lật`
      }
      onClick={onFlip}
      onPointerMove={lean}
      onPointerLeave={straighten}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.code === 'Space') {
          if (event.target instanceof HTMLElement && event.target.closest('button')) return
          event.preventDefault()
          onFlip()
        }
      }}
    >
      <div className="flashcard-face-inner">
        {/* Front Face */}
        <div className="flashcard-face-front" aria-hidden={flipped}>
          <span className="flashcard-face-pill">Mặt trước</span>
          <div className="flashcard-face-front-body">
            <div>
              <h2>{card.front}</h2>
              {speakButton(card.front, `Phát âm ${card.front}`)}
              {card.ipa && <p className="flashcard-face-ipa">/{card.ipa}/</p>}
            </div>
            {card.imageUrl && <img src={card.imageUrl} alt="" />}
          </div>
          <small className="flashcard-face-hint">Nhấn hoặc phím Space để lật</small>
        </div>

        {/* Back Face */}
        <div className="flashcard-face-back" aria-hidden={!flipped}>
          <span className="flashcard-face-pill">Mặt sau</span>
          <h2>{card.front}</h2>
          {card.exampleSentence && (
            <>
              <span className="flashcard-face-tag">Ví dụ</span>
              <p className="flashcard-face-example">{card.exampleSentence}</p>
              {speakButton(card.exampleSentence, 'Phát âm câu ví dụ')}
            </>
          )}
          <p className="flashcard-face-meaning">
            <RefreshCw aria-hidden="true" size={16} />
            {card.back}
          </p>
        </div>

        {/* 3D Sheen / Reflection during flip */}
        <span className="flashcard-face-shine" aria-hidden="true" />
      </div>
    </div>
  )
}
