import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommunityPage } from './CommunityPage'

const { communityApiMock, authSessionMock } = vi.hoisted(() => ({
  communityApiMock: {
    feed: vi.fn(),
    userPosts: vi.fn(),
    bookmarks: vi.fn(),
    profile: vi.fn(),
    relationship: vi.fn(),
    follows: vi.fn(),
    comments: vi.fn(),
    comment: vi.fn(),
    mentionSuggestions: vi.fn(),
    reportContent: vi.fn(),
    react: vi.fn(),
    removeReaction: vi.fn(),
  },
  authSessionMock: vi.fn(),
}))

vi.mock('../api/communityApi', () => ({ communityApi: communityApiMock }))
vi.mock('@/features/auth/authSession', () => ({ useAuthSession: authSessionMock }))

const emptyPage = { content: [], nextCursor: null, hasNext: false, size: 10 }
const member = { id: 'member-1', displayName: 'Lan Nguyễn', bio: null, avatarUrl: null }
const post = {
  id: 'post-1',
  authorId: 'author-1',
  category: 'DISCUSSION',
  title: 'Kinh nghiệm IELTS',
  body: 'Một bài viết trong feed theo dõi.',
  createdAt: '2026-10-17T08:00:00Z',
  imageUrls: [],
  reactionCounts: {},
  commentCount: 0,
  bookmarkedByMe: false,
  followingAuthor: true,
}

function renderCommunity(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/community/users/:userId" element={<CommunityPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CommunityPage feed and profile tabs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authSessionMock.mockReturnValue({ userName: 'Học viên', userId: 'current-user', roles: ['CUSTOMER'] })
    communityApiMock.feed.mockResolvedValue(emptyPage)
    communityApiMock.userPosts.mockResolvedValue(emptyPage)
    communityApiMock.bookmarks.mockResolvedValue(emptyPage)
    communityApiMock.profile.mockResolvedValue({ ...member, id: 'profile-1' })
    communityApiMock.relationship.mockResolvedValue({ following: false, followerCount: 0, followingCount: 0 })
    communityApiMock.follows.mockResolvedValue({ ...emptyPage, content: [member] })
    communityApiMock.comments.mockResolvedValue({ content: [] })
    communityApiMock.comment.mockResolvedValue({})
    communityApiMock.mentionSuggestions.mockResolvedValue([member])
    communityApiMock.reportContent.mockResolvedValue({ id: 'report-1', contentType: 'POST', contentId: 'post-1', reason: 'Spam', status: 'PENDING', createdAt: '2026-10-17T08:00:00Z' })
    communityApiMock.react.mockResolvedValue({})
    communityApiMock.removeReaction.mockResolvedValue({})
    vi.stubGlobal('IntersectionObserver', class {
      observe() {}
      disconnect() {}
    })
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      disconnect() {}
      unobserve() {}
    })
  })

  it('loads the following feed and shows its empty state with follow suggestions', async () => {
    communityApiMock.feed.mockImplementation((_cursor: unknown, _category: unknown, scope: string) =>
      Promise.resolve(scope === 'ALL' ? { ...emptyPage, content: [{ author: member }] } : emptyPage),
    )

    renderCommunity('/community?tab=following')

    await waitFor(() => expect(communityApiMock.feed).toHaveBeenCalledWith(undefined, undefined, 'FOLLOWING', undefined))
    expect(await screen.findByRole('heading', { name: 'Bạn chưa có bài viết từ người đang theo dõi' })).toBeInTheDocument()
    expect(screen.getByText('Thử theo dõi những học viên đang chia sẻ gần đây:')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Lan Nguyễn/ })).toBeInTheDocument()
  })

  it('renders following posts once when switching feed tabs back and forth', async () => {
    communityApiMock.feed.mockImplementation((_cursor: unknown, _category: unknown, scope: string) =>
      Promise.resolve(scope === 'FOLLOWING' ? { ...emptyPage, content: [post] } : emptyPage),
    )

    renderCommunity('/community?tab=following')
    expect(await screen.findByText('Một bài viết trong feed theo dõi.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Tất cả' }))
    await waitFor(() => expect(communityApiMock.feed).toHaveBeenCalledWith(undefined, undefined, 'ALL', undefined))
    fireEvent.click(screen.getByRole('link', { name: 'Đang theo dõi' }))
    await waitFor(() => expect(screen.getAllByText('Một bài viết trong feed theo dõi.')).toHaveLength(1))
  })

  it('keeps following as a profile list tab when a userId is present', async () => {
    renderCommunity('/community/users/profile-1?tab=following')

    expect(await screen.findByRole('heading', { name: 'Đang theo dõi' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /Lan Nguyễn/ })).toBeInTheDocument()
    await waitFor(() => expect(communityApiMock.follows).toHaveBeenCalledWith('profile-1', 'following'))
    expect(communityApiMock.feed).not.toHaveBeenCalled()
  })

  it('loads and renders search results from the query string', async () => {
    communityApiMock.feed.mockImplementation((_cursor: unknown, _category: unknown, _scope: unknown, query: string) =>
      Promise.resolve(query === 'reading' ? { ...emptyPage, content: [post] } : emptyPage),
    )

    renderCommunity('/community?q=reading')

    expect(await screen.findByText('Một bài viết trong feed theo dõi.')).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Tìm kiếm bài viết' })).toHaveValue('reading')
    expect(communityApiMock.feed).toHaveBeenCalledWith(undefined, undefined, 'ALL', 'reading')
  })

  it('offers accessible keyboard mention suggestions and submits the stable user reference', async () => {
    communityApiMock.feed.mockResolvedValue({ ...emptyPage, content: [post] })
    renderCommunity('/community')
    await screen.findByText('Một bài viết trong feed theo dõi.')
    fireEvent.click(screen.getByRole('button', { name: /Bình luận/ }))
    const input = await screen.findByRole('combobox', { name: 'Viết bình luận' })
    fireEvent.change(input, { target: { value: '@La' }, currentTarget: { selectionStart: 3 } })
    expect(await screen.findByRole('listbox', { name: 'Gợi ý người được nhắc' })).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-expanded', 'true')
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(input).toHaveValue('@[Lan Nguyễn](member-1) ')
    fireEvent.click(screen.getByRole('button', { name: 'Gửi bình luận' }))
    await waitFor(() => expect(communityApiMock.comment).toHaveBeenCalledWith('post-1', '@[Lan Nguyễn](member-1)', undefined))
  })

  it('submits a report from the rendered community page using the current URL target', async () => {
    communityApiMock.feed.mockResolvedValue({ ...emptyPage, content: [post] })
    renderCommunity('/community')
    await screen.findByText('Một bài viết trong feed theo dõi.')
    fireEvent.click(screen.getByRole('button', { name: 'Báo cáo' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Lý do báo cáo' }), { target: { value: 'Spam nội dung' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi báo cáo' }))
    await waitFor(() => expect(communityApiMock.reportContent).toHaveBeenCalledWith('POST', 'post-1', 'Spam nội dung'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Đã gửi báo cáo để ADMIN xem xét.')
  })

  it('optimistically updates reaction and rolls back when API fails', async () => {
    communityApiMock.feed.mockResolvedValue({ ...emptyPage, content: [post] })
    communityApiMock.react.mockRejectedValueOnce(new Error('Network error'))

    renderCommunity('/community')
    await screen.findByText('Một bài viết trong feed theo dõi.')

    const likeButton = screen.getByRole('button', { name: 'Thích' })
    expect(likeButton).toHaveAttribute('aria-pressed', 'false')

    // Bấm like
    fireEvent.click(likeButton)

    // Gọi API react với 'LIKE'
    expect(communityApiMock.react).toHaveBeenCalledWith('post-1', 'LIKE')

    // Rollback sau khi lỗi: alert hiển thị lỗi và nút quay về trạng thái chưa thích
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể cập nhật cảm xúc.')
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Thích' })).toHaveAttribute('aria-pressed', 'false')
    })
  })

  it('toggles reaction successfully on main button click', async () => {
    communityApiMock.feed.mockResolvedValue({ ...emptyPage, content: [post] })
    communityApiMock.react.mockResolvedValue({})

    renderCommunity('/community')
    await screen.findByText('Một bài viết trong feed theo dõi.')

    const likeButton = screen.getByRole('button', { name: 'Thích' })
    fireEvent.click(likeButton)

    await waitFor(() => {
      expect(communityApiMock.react).toHaveBeenCalledWith('post-1', 'LIKE')
    })
  })

  it('displays reaction summary when post has reactions and does not display individual 0 count lines', async () => {
    const postWithReactions = {
      ...post,
      reactionCounts: { LIKE: 5, LOVE: 2 },
    }
    communityApiMock.feed.mockResolvedValue({ ...emptyPage, content: [postWithReactions] })

    renderCommunity('/community')
    await screen.findByText('Một bài viết trong feed theo dõi.')

    // Hiển thị tổng số 7
    expect(screen.getByText('7')).toBeInTheDocument()

    // Không còn dòng đếm rời rạc dạng "0 Thích" hay "0 Yêu thích"
    expect(screen.queryByText(/0 Thích/)).not.toBeInTheDocument()
    expect(screen.queryByText(/0 Yêu thích/)).not.toBeInTheDocument()
    expect(screen.queryByText(/0 Hữu ích/)).not.toBeInTheDocument()
    expect(screen.queryByText(/0 Chính xác/)).not.toBeInTheDocument()
  })
})
