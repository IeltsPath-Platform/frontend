/** A card of the catalog before its data arrives: the same frame as PracticeTestCard (photo, badge, title, tags, meta), so the page does not jump when the cards replace it. */
export function PracticeCardSkeleton() {
  return (
    <div className="practice-visual-card practice-card-skeleton" aria-hidden="true">
      <div className="card-media">
        <div className="card-image-box practice-skeleton-block" />
        <div className="practice-skeleton-pill practice-skeleton-block" />
      </div>
      <div className="card-body">
        <div className="practice-skeleton-line practice-skeleton-block" style={{ width: '78%', height: '1.15rem' }} />
        <div className="practice-skeleton-line practice-skeleton-block" style={{ width: '42%', marginTop: '0.7rem' }} />
        <div className="practice-skeleton-line practice-skeleton-block" style={{ width: '34%', marginTop: '1.3rem' }} />
      </div>
    </div>
  )
}
