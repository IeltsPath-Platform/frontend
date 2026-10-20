import type { CSSProperties } from 'react'
import styles from './OwlConfetti.module.css'

const PIECES = 22
const SHAPES = ['strip', 'dot', 'star'] as const

/**
 * One burst of confetti that plays once on mount and ends invisible. Remount it with a new `key` to burst again.
 * Pieces are spread on a fixed fan instead of random numbers so rendering stays pure.
 */
export function OwlConfetti({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={[styles.root, className].filter(Boolean).join(' ')}>
      {Array.from({ length: PIECES }, (_, index) => {
        const angle = -170 + (index * 160) / (PIECES - 1) + (index % 3) * 4
        const distance = 4.2 + (index % 4) * 1.35
        const style = {
          '--angle': `${angle}deg`,
          '--distance': `${distance}rem`,
          '--spin': `${(index % 2 ? 1 : -1) * (240 + index * 25)}deg`,
          '--delay': `${(index % 5) * 30}ms`,
        } as CSSProperties
        return <span className={`${styles.piece} ${styles[SHAPES[index % SHAPES.length]]} ${styles[`tone${index % 4}`]}`} key={index} style={style} />
      })}
    </span>
  )
}
