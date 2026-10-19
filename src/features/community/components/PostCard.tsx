import type { ReactNode } from 'react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, Edit3, Flag, MessageCircle, Trash2 } from 'lucide-react'
import type { CommunityPost } from '../api/communityApi'
import { ReactionPicker } from './ReactionPicker'
import { ReactionSummary } from './ReactionSummary'
import {
  CATEGORY_LABELS,
  CATEGORY_STYLES,
  safeVideoEmbed,
  type ReactionType,
} from '../utils/communityFormat'
import { getComposerBackground } from './composerBackgrounds'

function PostImage({ url, index, onClick }: { url: string; index: number; onClick: (url: string) => void }) {
  const [failed, setFailed] = useState(false)
  return (
    <button type="button" onClick={() => onClick(url)} aria-label={`Phóng to ảnh đính kèm ${index + 1}`}>
      {failed ? <span className="community-image-fallback" role="img" aria-label={`Ảnh ${index + 1} không tải được`}>Không thể tải ảnh</span> : <img src={url} alt={`Ảnh đính kèm bài viết ${index + 1}`} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />}
    </button>
  )
}

function isUploadedVideo(raw: string) {
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' && (/\.(mp4|webm|mov)$/i.test(url.pathname) || (url.hostname.endsWith('.supabase.co') && url.pathname.includes('/community/videos/')))
  } catch {
    return false
  }
}

export interface PostCardProps {
  post: CommunityPost
  currentUserId?: string | null
  isCommentsOpen: boolean
  onToggleComments: (postId: string) => void
  onReaction: (post: CommunityPost, type: ReactionType) => void
  onToggleBookmark: (post: CommunityPost) => void
  onEditPost: (post: CommunityPost) => void
  onDeletePost: (postId: string) => void
  onFollowAuthor: (authorId: string, currentFollowing: boolean) => void
  onOpenReport: (target: { type: 'POST' | 'COMMENT'; id: string }) => void
  onImageClick: (url: string) => void
  children?: ReactNode
}

export function PostCard({
  post,
  currentUserId,
  isCommentsOpen,
  onToggleComments,
  onReaction,
  onToggleBookmark,
  onEditPost,
  onDeletePost,
  onFollowAuthor,
  onOpenReport,
  onImageClick,
  children,
}: PostCardProps) {
  const isOwner = post.authorId === currentUserId
  const categoryStyle = CATEGORY_STYLES[post.category] ?? {
    bg: '#F2F4F7',
    text: '#344054',
    border: '#D0D5DD',
  }
  const categoryLabel = CATEGORY_LABELS[post.category] ?? post.category
  const formattedDate = new Date(post.createdAt).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const bgConfig = getComposerBackground(post.background)
  const isBackgroundPost = Boolean(bgConfig && post.imageUrls.length === 0 && !post.videoUrl)

  return (
    <article className="community-post" key={post.id}>
      {/* Post Author Header */}
      <header className="community-post-author">
        <div className="community-avatar" aria-hidden="true">
          {(post.author?.displayName ?? 'H').slice(0, 1).toUpperCase()}
        </div>

        <div className="community-post-author-meta">
          <div className="community-author-top-row">
            <Link to={`/community/users/${post.authorId}`} className="community-author-name">
              {post.author?.displayName ?? 'Học viên IELTSPath'}
            </Link>
            {post.targetBand != null && (
              <span className="community-band-badge" title={`Mục tiêu IELTS ${post.targetBand}`}>
                Target {post.targetBand}
              </span>
            )}
          </div>
          <div className="community-author-sub-row">
            <span
              className="community-category-pill"
              style={{
                backgroundColor: categoryStyle.bg,
                color: categoryStyle.text,
                borderColor: categoryStyle.border,
              }}
            >
              {categoryLabel}
            </span>
            <span className="community-dot-separator" aria-hidden="true">·</span>
            <time dateTime={post.createdAt} className="community-post-time">
              {formattedDate}
            </time>
          </div>
        </div>

        {/* Nút hành động tác giả hoặc theo dõi */}
        {isOwner ? (
          <div className="community-owner-actions">
            <button
              type="button"
              aria-label="Sửa bài viết"
              title="Sửa bài viết"
              onClick={() => onEditPost(post)}
            >
              <Edit3 size={17} />
            </button>
            <button
              type="button"
              aria-label="Xóa bài viết"
              title="Xóa bài viết"
              onClick={() => onDeletePost(post.id)}
            >
              <Trash2 size={17} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="community-follow"
            aria-pressed={post.followingAuthor}
            onClick={() => onFollowAuthor(post.authorId, post.followingAuthor)}
          >
            {post.followingAuthor ? 'Đang theo dõi' : 'Theo dõi'}
          </button>
        )}
      </header>

      {/* Post Content */}
      {post.title && <h2 className="community-post-title">{post.title}</h2>}
      {isBackgroundPost && bgConfig ? (
        <div
          className="community-post-background-box"
          style={{
            background: bgConfig.gradient,
            color: bgConfig.textColor,
            textShadow: bgConfig.textShadow,
          }}
        >
          <p className="community-post-background-text">{post.body}</p>
        </div>
      ) : (
        <p className="community-post-body">{post.body}</p>
      )}

      {/* Images Lightbox */}
      {post.imageUrls.length > 0 && (
        <div className={`community-images community-images-${Math.min(post.imageUrls.length, 4)}`}>
          {post.imageUrls.map((url, index) => <PostImage key={url} url={url} index={index} onClick={onImageClick} />)}
        </div>
      )}

      {/* Video Embed */}
      {post.videoUrl && (
        safeVideoEmbed(post.videoUrl) ? (
          <div className="community-video">
            <iframe
              src={safeVideoEmbed(post.videoUrl) ?? undefined}
              title="Video trong bài viết"
              loading="lazy"
              sandbox="allow-scripts allow-same-origin allow-presentation"
              referrerPolicy="no-referrer"
              allowFullScreen
            />
          </div>
        ) : isUploadedVideo(post.videoUrl) ? (
          <div className="community-video"><video src={post.videoUrl} controls preload="metadata" aria-label="Video trong bài viết" /></div>
        ) : (
          <p>
            <a
              className="community-media-link"
              href={post.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Mở video đính kèm ↗
            </a>
          </p>
        )
      )}

      {/* Dòng tóm tắt tổng số cảm xúc (chỉ hiển thị khi tổng > 0) */}
      <ReactionSummary reactionCounts={post.reactionCounts} />

      {/* Footer thanh hành động: ReactionPicker Facebook-style, Bình luận, Lưu, Báo cáo */}
      <footer className="community-post-footer">
        {/* Nút cảm xúc duy nhất với hover popup Facebook-style */}
        <ReactionPicker
          postId={post.id}
          myReaction={post.myReaction}
          onSelectReaction={(type) => onReaction(post, type)}
        />

        {/* Nút bình luận */}
        <button
          type="button"
          className="community-action-btn community-comment-btn"
          aria-expanded={isCommentsOpen}
          aria-label={`${post.commentCount} Bình luận`}
          onClick={() => onToggleComments(post.id)}
        >
          <MessageCircle size={18} />
          <span className="community-btn-text">
            <span className="community-btn-count">{post.commentCount}</span>
            <span className="community-btn-word"> Bình luận</span>
          </span>
        </button>

        {/* Nút Lưu / Bỏ lưu */}
        <button
          type="button"
          className={`community-action-btn community-save-btn ${post.bookmarkedByMe ? 'is-bookmarked' : ''}`}
          aria-pressed={post.bookmarkedByMe}
          aria-label={post.bookmarkedByMe ? 'Đã lưu bài viết' : 'Lưu bài viết'}
          onClick={() => onToggleBookmark(post)}
        >
          <Bookmark size={18} fill={post.bookmarkedByMe ? 'currentColor' : 'none'} />
          <span className="community-btn-text">{post.bookmarkedByMe ? 'Đã lưu' : 'Lưu'}</span>
        </button>

        {/* Nút Báo cáo (chỉ hiện cho người không phải chủ bài) */}
        {!isOwner && (
          <button
            type="button"
            className="community-action-btn community-report-btn"
            onClick={() => onOpenReport({ type: 'POST', id: post.id })}
          >
            <Flag size={16} />
            <span className="community-btn-text">Báo cáo</span>
          </button>
        )}
      </footer>

      {/* Phần bình luận lồng vào đây */}
      {children}
    </article>
  )
}

