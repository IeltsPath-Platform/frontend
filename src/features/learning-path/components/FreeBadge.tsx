import styles from './FreeBadge.module.css'

/**
 * Marks a knowledge point that a paying course teaches in the first lessons of its skill, the ones it shows free (the same
 * lessons the course page tags "Học thử miễn phí"). Small enough to sit in the head of a box; the words are kept for a screen
 * reader, which would otherwise hear only "Free".
 */
export function FreeBadge() {
  return (
    <span className={styles.badge} title="Học thử miễn phí: điểm này được dạy trong các bài học miễn phí của khóa">
      Free
      <span className="lp-sr-only"> (học thử miễn phí)</span>
    </span>
  )
}
