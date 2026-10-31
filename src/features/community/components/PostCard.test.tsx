import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { PostCard } from './PostCard'
import type { CommunityPost } from '../api/communityApi'

const basePost: CommunityPost = {
  id: '00000000-0000-0000-0000-000000000001',
  authorId: '00000000-0000-0000-0000-000000000002',
  category: 'GENERAL',
  title: 'Tiêu đề bài viết',
  body: 'Nội dung chia sẻ kinh nghiệm học IELTS',
  createdAt: '2026-10-18T10:00:00Z',
  imageUrls: [],
  videoUrl: null,
  targetBand: 7.5,
  author: {
    id: '00000000-0000-0000-0000-000000000002',
    displayName: 'Thành viên IELTS',
  },
  reactionCounts: { LIKE: 5 },
  myReaction: 'LIKE',
  commentCount: 3,
  bookmarkedByMe: false,
  followingAuthor: false,
}

describe('PostCard', () => {
  afterEach(() => vi.unstubAllEnvs())
  it('renders standard post body when background is not present', () => {
    render(
      <MemoryRouter>
        <PostCard
          post={basePost}
          isCommentsOpen={false}
          onToggleComments={vi.fn()}
          onReaction={vi.fn()}
          onToggleBookmark={vi.fn()}
          onEditPost={vi.fn()}
          onDeletePost={vi.fn()}
          onFollowAuthor={vi.fn()}
          onOpenReport={vi.fn()}
          onImageClick={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Nội dung chia sẻ kinh nghiệm học IELTS')).toBeInTheDocument()
    expect(document.querySelector('.community-post-background-box')).toBeNull()
  })

  it('renders styled gradient background container when background is set and no media attached', () => {
    const postWithBg: CommunityPost = {
      ...basePost,
      background: 'VIOLET',
    }

    render(
      <MemoryRouter>
        <PostCard
          post={postWithBg}
          isCommentsOpen={false}
          onToggleComments={vi.fn()}
          onReaction={vi.fn()}
          onToggleBookmark={vi.fn()}
          onEditPost={vi.fn()}
          onDeletePost={vi.fn()}
          onFollowAuthor={vi.fn()}
          onOpenReport={vi.fn()}
          onImageClick={vi.fn()}
        />
      </MemoryRouter>,
    )

    const bgBox = document.querySelector('.community-post-background-box')
    expect(bgBox).not.toBeNull()
    expect(bgBox).toHaveTextContent('Nội dung chia sẻ kinh nghiệm học IELTS')
  })

  it('renders normal body without gradient box if post has images even when background key is present', () => {
    const postWithImagesAndBg: CommunityPost = {
      ...basePost,
      background: 'CRIMSON',
      imageUrls: ['https://images.unsplash.com/photo-123'],
    }

    render(
      <MemoryRouter>
        <PostCard
          post={postWithImagesAndBg}
          isCommentsOpen={false}
          onToggleComments={vi.fn()}
          onReaction={vi.fn()}
          onToggleBookmark={vi.fn()}
          onEditPost={vi.fn()}
          onDeletePost={vi.fn()}
          onFollowAuthor={vi.fn()}
          onOpenReport={vi.fn()}
          onImageClick={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(document.querySelector('.community-post-background-box')).toBeNull()
    expect(screen.getByAltText('Ảnh đính kèm bài viết 1')).toBeInTheDocument()
  })

  it('renders uploaded video with native controls and metadata preload', () => {
    vi.stubEnv('VITE_SUPABASE_MEDIA_HOST', 'bucket.supabase.co')
    render(
      <MemoryRouter>
        <PostCard post={{ ...basePost, videoUrl: 'https://bucket.supabase.co/storage/v1/object/public/community/videos/demo.mp4' }} isCommentsOpen={false} onToggleComments={vi.fn()} onReaction={vi.fn()} onToggleBookmark={vi.fn()} onEditPost={vi.fn()} onDeletePost={vi.fn()} onFollowAuthor={vi.fn()} onOpenReport={vi.fn()} onImageClick={vi.fn()} />
      </MemoryRouter>,
    )
    const video = screen.getByLabelText('Video trong bài viết')
    expect(video.tagName).toBe('VIDEO')
    expect(video).toHaveAttribute('preload', 'metadata')
    expect(video).toHaveAttribute('controls')
  })

  it('shows a fallback if an attached image fails to load', async () => {
    render(
      <MemoryRouter>
        <PostCard post={{ ...basePost, imageUrls: ['https://bucket.supabase.co/missing.png'] }} isCommentsOpen={false} onToggleComments={vi.fn()} onReaction={vi.fn()} onToggleBookmark={vi.fn()} onEditPost={vi.fn()} onDeletePost={vi.fn()} onFollowAuthor={vi.fn()} onOpenReport={vi.fn()} onImageClick={vi.fn()} />
      </MemoryRouter>,
    )
    const image = screen.getByAltText('Ảnh đính kèm bài viết 1')
    fireEvent(image, new Event('error'))
    await waitFor(() => expect(screen.getByText('Không thể tải ảnh')).toBeInTheDocument())
  })
})
