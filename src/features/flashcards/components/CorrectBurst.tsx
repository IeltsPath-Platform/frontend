const RAYS = 10

/** Celebration drawn over a question answered correctly: a ring pulse, a self-drawing check mark and rays. */
export function CorrectBurst({ streak = 0 }: { streak?: number }) {
  return (
    <span className={`correct-burst${streak >= 3 ? ' is-streak' : ''}`} aria-hidden="true">
      <span className="correct-burst-ring" />
      {Array.from({ length: RAYS }, (_, index) => (
        <i key={index} style={{ ['--angle' as string]: `${(360 / RAYS) * index}deg`, ['--delay' as string]: `${(index % 3) * 40}ms` }} />
      ))}
      <svg viewBox="0 0 52 52" className="correct-burst-check">
        <circle cx="26" cy="26" r="24" />
        <path d="M15 27 l7 7 l15 -16" />
      </svg>
    </span>
  )
}
