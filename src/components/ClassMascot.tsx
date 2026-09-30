import defaultMascotImage from '@/assets/triceratops-class-mascot.png'
import styles from './ClassMascot.module.css'

export type ClassMascotSize = 'sm' | 'md' | 'lg'

export interface ClassMascotProps {
  className?: string
  imageSrc?: string
  imageAlt?: string
  size?: ClassMascotSize
}

/** A decorative classroom mascot with self-contained, transform-only motion. */
export function ClassMascot({
  className,
  imageSrc = defaultMascotImage,
  imageAlt = '',
  size = 'md',
}: ClassMascotProps) {
  const isDecorative = imageAlt.length === 0

  return (
    <figure className={[styles.root, styles[size], className].filter(Boolean).join(' ')} aria-hidden={isDecorative || undefined}>
      <span className={styles.orbit} aria-hidden="true" />
      <span className={`${styles.spark} ${styles.sparkA}`} aria-hidden="true" />
      <span className={`${styles.spark} ${styles.sparkB}`} aria-hidden="true" />
      <img className={styles.image} src={imageSrc} alt={imageAlt} />
    </figure>
  )
}
