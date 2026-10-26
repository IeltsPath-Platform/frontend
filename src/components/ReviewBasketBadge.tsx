import type { ReviewBasketSummary } from '~types/learningPath'

const MAX_SHOWN = 99

/** The number on the review basket link: required reviews and due points together, red while one is required. */
export function ReviewBasketBadge({ summary }: { summary: ReviewBasketSummary | null }) {
  if (!summary) return null
  const count = summary.required + summary.due
  if (count <= 0) return null
  const label = [
    summary.required > 0 ? `${summary.required} bài ôn bắt buộc` : null,
    summary.due > 0 ? `${summary.due} bài đến hạn ôn` : null,
  ].filter(Boolean).join(', ')
  return (
    <span aria-label={label} className="site-nav-badge" data-urgent={summary.required > 0 || undefined} role="img" title={label}>
      {count > MAX_SHOWN ? `${MAX_SHOWN}+` : count}
    </span>
  )
}
