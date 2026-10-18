import { Link } from 'react-router-dom'
import { feedPathForScope, type FeedScope } from '../utils/feedNavigation'

type Props = { activeScope: FeedScope; category?: string; query?: string }

export function CommunityFeedTabs({ activeScope, category, query }: Props) {
  return <nav className="community-feed-tabs" aria-label="Loại bảng tin">
    <Link to={feedPathForScope('ALL', category, query)} aria-current={activeScope === 'ALL' ? 'page' : undefined}>Tất cả</Link>
    <Link to={feedPathForScope('FOLLOWING', category, query)} aria-current={activeScope === 'FOLLOWING' ? 'page' : undefined}>Đang theo dõi</Link>
  </nav>
}
