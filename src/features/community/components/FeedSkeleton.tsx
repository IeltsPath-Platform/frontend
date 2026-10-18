export function FeedSkeleton() {
  return (
    <div className="community-feed-skeleton" aria-label="Đang tải bài viết" aria-busy="true">
      {[1, 2, 3].map((index) => (
        <article key={index} className="community-post community-skeleton-post">
          <header className="community-post-author">
            <div className="community-avatar community-skeleton-avatar community-shimmer" />
            <div className="community-post-author-meta">
              <div className="community-skeleton-line community-skeleton-title community-shimmer" />
              <div className="community-skeleton-line community-skeleton-sub community-shimmer" />
            </div>
          </header>
          <div className="community-skeleton-line community-skeleton-heading community-shimmer" />
          <div className="community-skeleton-paragraph">
            <div className="community-skeleton-line community-shimmer" />
            <div className="community-skeleton-line community-shimmer" />
            <div className="community-skeleton-line community-skeleton-short community-shimmer" />
          </div>
          <footer className="community-post-footer">
            <div className="community-skeleton-btn community-shimmer" />
            <div className="community-skeleton-btn community-shimmer" />
            <div className="community-skeleton-btn community-shimmer" />
          </footer>
        </article>
      ))}
    </div>
  )
}

