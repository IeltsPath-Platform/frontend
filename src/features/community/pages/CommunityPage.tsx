import { useCallback, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Bookmark, Lightbulb, Plus, Search, Users } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { OwlHero } from '@/components/OwlHero'
import { SiteNavbar } from '@/components/SiteNavbar'
import { useConfirmDialog } from '@/lib/useConfirmDialog'
import { useAuthSession } from '@/features/auth/authSession'
import { HttpError } from '@/lib/httpClient'
import { communityApi, type Comment, type CommunityPost, type PublicProfile } from '../api/communityApi'
import { CommunityFeedTabs } from '../components/CommunityFeedTabs'
import { CommunityOwlBanner } from '../components/CommunityOwlBanner'
import { PostCard } from '../components/PostCard'
import { CommentSection } from '../components/CommentSection'
import { PostComposerModal, type PostFormValues } from '../components/PostComposerModal'
import { ReportDialog } from '../components/ReportDialog'
import { FeedSkeleton } from '../components/FeedSkeleton'
import { QuickComposerBar } from '../components/QuickComposerBar'
import { SandTransition } from '../components/SandTransition'
import {
  COMPOSER_BACKGROUND_KEYS,
  MAX_BACKGROUND_POST_LENGTH,
  isComposerBackgroundKey,
} from '../components/composerBackgrounds'
import { CATEGORY_LABELS, type ReactionType } from '../utils/communityFormat'
import './community.css'

const categories = [
  'GENERAL',
  'QUESTION',
  'DISCUSSION',
  'WRITING_SHARING',
  'SPEAKING_PARTNER',
  'RESOURCE_TIPS',
] as const

const postFormSchema = z.object({
  category: z.enum(categories),
  title: z.string().max(200),
  body: z.string().trim().min(1, 'Hãy viết nội dung bài đăng.').max(20000),
  imageUrls: z.string(),
  videoUrl: z.string(),
  targetBand: z.string(),
  background: z.enum(COMPOSER_BACKGROUND_KEYS).nullable().optional(),
}).superRefine((v, ctx) => {
  const urls = v.imageUrls.split('\n').map((x) => x.trim()).filter(Boolean)
  if (urls.length > 4) ctx.addIssue({ code: 'custom', path: ['imageUrls'], message: 'Tối đa 4 ảnh.' })
  for (const url of [...urls, v.videoUrl].filter(Boolean)) {
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:') throw new Error()
    } catch {
      ctx.addIssue({ code: 'custom', path: ['imageUrls'], message: 'Media cần là URL HTTPS hợp lệ.' })
      break
    }
  }
  if (v.targetBand && (Number(v.targetBand) < 0 || Number(v.targetBand) > 9)) {
    ctx.addIssue({ code: 'custom', path: ['targetBand'], message: 'Band mục tiêu từ 0 đến 9.' })
  }
  if (v.background) {
    if (urls.length > 0 || v.videoUrl.trim()) {
      ctx.addIssue({ code: 'custom', path: ['background'], message: 'Bài viết có màu nền không được đính kèm ảnh hoặc video.' })
    }
    if (v.body.trim().length > MAX_BACKGROUND_POST_LENGTH) {
      ctx.addIssue({ code: 'custom', path: ['background'], message: `Bài viết có màu nền tối đa ${MAX_BACKGROUND_POST_LENGTH} ký tự.` })
    }
  }
})

function CommunitySearchForm({ query, onSearch }: { query: string; onSearch: (query: string) => void }) {
  const [draft, setDraft] = useState(query)
  return (
    <form
      className="community-search"
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        onSearch(draft.trim())
      }}
    >
      <label className="sr-only" htmlFor="community-search-input">Tìm kiếm bài viết</label>
      <input
        id="community-search-input"
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        maxLength={120}
        placeholder="Tìm bài viết trong cộng đồng"
      />
      <button type="submit" aria-label="Tìm kiếm bài viết">
        <Search size={18} />
        <span>Tìm kiếm</span>
      </button>
    </form>
  )
}

function logCommunityFailure(operation: string, error: unknown) {
  const details = error instanceof HttpError
    ? { cause: error.isNetworkError ? 'network' : 'http', status: error.status, code: error.code }
    : { cause: error instanceof Error ? error.name : 'unknown' }
  console.error(`[community] ${operation} failed`, details)
}

export function CommunityPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { postId, userId } = useParams()
  const [search, setSearch] = useSearchParams()
  const searchQuery = search.get('q')?.trim() ?? ''
  const isBookmarks = search.get('tab') === 'bookmarks'
  const isFollowingFeed = !userId && !isBookmarks && search.get('tab') === 'following'
  const requestedProfileTab = search.get('tab')
  const profileTab = userId && (requestedProfileTab === 'followers' || requestedProfileTab === 'following')
    ? requestedProfileTab
    : 'posts'

  const { userName, userId: currentUserId, roles } = useAuthSession()
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [followSuggestions, setFollowSuggestions] = useState<PublicProfile[]>([])
  const [cursor, setCursor] = useState<string | undefined>()
  const [hasNext, setHasNext] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { confirm, confirmDialog } = useConfirmDialog()
  const [composer, setComposer] = useState(false)
  const [composerMediaIntent, setComposerMediaIntent] = useState<'IMAGE' | 'VIDEO' | null>(null)
  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null)
  const [activeCategory, setActiveCategory] = useState(search.get('category') ?? '')
  const [commentPost, setCommentPost] = useState<string | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [replies, setReplies] = useState<Record<string, Comment[]>>({})
  const [replyTo, setReplyTo] = useState<string | undefined>()
  const [editingComment, setEditingComment] = useState<Comment | null>(null)
  const [editedCommentBody, setEditedCommentBody] = useState('')
  const [commentText, setCommentText] = useState('')
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionSuggestions, setMentionSuggestions] = useState<PublicProfile[]>([])
  const [mentionIndex, setMentionIndex] = useState(0)
  const [formValidationError, setFormValidationError] = useState('')
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [profilePeople, setProfilePeople] = useState<PublicProfile[]>([])
  const [profilePeopleCursor, setProfilePeopleCursor] = useState<string | undefined>()
  const [profilePeopleHasNext, setProfilePeopleHasNext] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [reportTarget, setReportTarget] = useState<{ type: 'POST' | 'COMMENT'; id: string } | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [reportMessage, setReportMessage] = useState('')
  const [showSandTransition, setShowSandTransition] = useState(() => {
    const navigationState = location.state as { communityLoginTransition?: boolean } | null
    return Boolean(navigationState?.communityLoginTransition)
      && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  })
  const [relationship, setRelationship] = useState<{ following: boolean; followerCount: number; followingCount: number } | null>(null)
  const observerRef = useRef<HTMLDivElement>(null)
  const loadRef = useRef<(resetList?: boolean) => Promise<void>>(async () => undefined)
  const loadingRef = useRef(false)

  useEffect(() => {
    const navigationState = location.state as { communityLoginTransition?: boolean } | null
    if (!navigationState?.communityLoginTransition) return

    navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true, state: null })
  }, [location.hash, location.pathname, location.search, location.state, navigate])

  const completeSandTransition = useCallback(() => setShowSandTransition(false), [])

  const scopeKey = `${postId ?? 'feed'}:${userId ?? 'all'}:${isBookmarks ? 'bookmarks' : 'posts'}:${profileTab}:${isFollowingFeed ? 'following' : 'all'}:${activeCategory}:${searchQuery}`
  const activeScopeRef = useRef(scopeKey)
  const profilePeopleScope = `${userId ?? ''}:${profileTab}`
  const profilePeopleScopeRef = useRef(profilePeopleScope)

  const form = useForm<PostFormValues>({
    defaultValues: {
      category: 'GENERAL',
      title: '',
      body: '',
      imageUrls: '',
      videoUrl: '',
      targetBand: '',
      background: null,
    },
  })

  // Mention Suggestions Query
  useEffect(() => {
    if (mentionQuery.length < 2) return
    const timer = window.setTimeout(() => {
      void communityApi
        .mentionSuggestions(mentionQuery)
        .then(setMentionSuggestions)
        .catch(() => setMentionSuggestions([]))
    }, 180)
    return () => window.clearTimeout(timer)
  }, [mentionQuery])

  const updateMentionQuery = (value: string, caret: number) => {
    const beforeCaret = value.slice(0, caret)
    const match = beforeCaret.match(/@([\p{L}\p{N}_ .-]{2,80})$/u)
    const nextQuery = match?.[1].trim() ?? ''
    setMentionQuery(nextQuery)
    if (nextQuery.length < 2) setMentionSuggestions([])
    setMentionIndex(0)
  }

  const insertMention = (person: PublicProfile) => {
    const input = document.getElementById(`comment-${commentPost}`) as HTMLTextAreaElement | null
    const caret = input?.selectionStart ?? commentText.length
    const before = commentText.slice(0, caret).replace(/@[\p{L}\p{N}_ .-]{2,80}$/u, '')
    const next = `${before}@[${person.displayName}](${person.id}) ${commentText.slice(caret)}`
    setCommentText(next)
    setMentionQuery('')
    setMentionSuggestions([])
    requestAnimationFrame(() => {
      input?.focus()
      const newPos = before.length + person.displayName.length + person.id.length + 6
      input?.setSelectionRange(newPos, newPos)
    })
  }

  const handleMentionKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!mentionSuggestions.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setMentionIndex((index) => (index + 1) % mentionSuggestions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setMentionIndex((index) => (index + mentionSuggestions.length - 1) % mentionSuggestions.length)
    } else if (event.key === 'Enter' && mentionSuggestions[mentionIndex]) {
      event.preventDefault()
      insertMention(mentionSuggestions[mentionIndex])
    } else if (event.key === 'Escape') {
      setMentionSuggestions([])
      setMentionQuery('')
    }
  }

  // Load Feed Data
  const load = useCallback(async (resetList = false) => {
    if (activeScopeRef.current !== scopeKey || loadingRef.current || (!hasNext && !resetList)) return
    loadingRef.current = true
    setLoading(true)
    setError('')
    try {
      const currentCursor = resetList ? undefined : cursor
      if (userId && profileTab !== 'posts') return
      const page = userId
        ? await communityApi.userPosts(userId, currentCursor)
        : isBookmarks
        ? await communityApi.bookmarks(currentCursor)
        : await communityApi.feed(
            currentCursor,
            activeCategory || undefined,
            isFollowingFeed ? 'FOLLOWING' : 'ALL',
            searchQuery || undefined,
          )
      if (activeScopeRef.current !== scopeKey) return
      setPosts((current) => (resetList ? page.content : [...current, ...page.content.filter((post) => !current.some((item) => item.id === post.id))]))
      setCursor(page.nextCursor ?? undefined)
      setHasNext(page.hasNext)
    } catch (error) {
      logCommunityFailure('feed.load', error)
      if (activeScopeRef.current === scopeKey) {
        setError('Không thể tải bảng tin. Kiểm tra kết nối rồi thử lại.')
      }
    } finally {
      if (activeScopeRef.current === scopeKey) {
        loadingRef.current = false
        setLoading(false)
      }
    }
  }, [activeCategory, cursor, hasNext, isBookmarks, isFollowingFeed, profileTab, scopeKey, searchQuery, userId])

  useEffect(() => {
    loadRef.current = load
  }, [load])

  useEffect(() => {
    activeScopeRef.current = scopeKey
    loadingRef.current = false
    queueMicrotask(() => {
      if (activeScopeRef.current !== scopeKey) return
      setLoading(false)
      setError('')
      setPosts([])
      setFollowSuggestions([])
      setCursor(undefined)
      setHasNext(true)
      if (!postId && profileTab === 'posts') void loadRef.current(true)
    })
  }, [scopeKey, postId, profileTab])

  // Gợi ý theo dõi khi feed following trống
  useEffect(() => {
    if (!isFollowingFeed || loading || posts.length > 0 || error) return
    let active = true
    void communityApi
      .feed(undefined, activeCategory || undefined, 'ALL', searchQuery || undefined)
      .then((page) => {
        if (!active) return
        const seen = new Set<string>()
        const suggestions = page.content
          .flatMap((post) => {
            const person = post.author
            if (!person || person.id === currentUserId || post.followingAuthor || seen.has(person.id)) {
              return []
            }
            seen.add(person.id)
            return [person]
          })
          .slice(0, 4)
        setFollowSuggestions(suggestions)
      })
      .catch((error: unknown) => {
        logCommunityFailure('feed.suggestions', error)
        if (active) setFollowSuggestions([])
      })
    return () => {
      active = false
    }
  }, [activeCategory, currentUserId, error, isFollowingFeed, loading, posts.length, searchQuery])

  // Infinite Scroll Sentinel
  useEffect(() => {
    if (postId || profileTab !== 'posts') return
    const node = observerRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void load()
      },
      { rootMargin: '240px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [load, postId, profileTab])

  // Single post load
  useEffect(() => {
    if (!postId) return
    void communityApi
      .post(postId)
      .then((post) => setPosts([post]))
      .catch((error: unknown) => {
        logCommunityFailure('post.load', error)
        setError('Không thể tải bài viết.')
      })
  }, [postId])

  // User profile load
  useEffect(() => {
    if (!userId) return
    void Promise.all([communityApi.profile(userId), communityApi.relationship(userId)])
      .then(([person, relation]) => {
        setProfile(person)
        setRelationship(relation)
      })
      .catch((error: unknown) => {
        logCommunityFailure('profile.load', error)
        setError('Không thể tải hồ sơ học viên.')
      })
  }, [userId])

  // Profile followers / following list
  const loadProfilePeople = useCallback(async (resetList = false) => {
    if (!userId || profileTab === 'posts') return
    const requestScope = profilePeopleScope
    try {
      const page = await communityApi.follows(userId, profileTab, resetList ? undefined : profilePeopleCursor)
      if (profilePeopleScopeRef.current !== requestScope) return
      setProfilePeople((current) => (resetList ? page.content : [...current, ...page.content.filter((person) => !current.some((item) => item.id === person.id))]))
      setProfilePeopleCursor(page.nextCursor ?? undefined)
      setProfilePeopleHasNext(page.hasNext)
    } catch (error) {
      logCommunityFailure('profile.followers.load', error)
      if (profilePeopleScopeRef.current === requestScope) {
        setError('Không thể tải danh sách học viên.')
      }
    }
  }, [profilePeopleCursor, profilePeopleScope, profileTab, userId])

  useEffect(() => {
    profilePeopleScopeRef.current = profilePeopleScope
    queueMicrotask(() => {
      if (profilePeopleScopeRef.current !== profilePeopleScope) return
      setProfilePeople([])
      setProfilePeopleCursor(undefined)
      setProfilePeopleHasNext(false)
      if (!userId || profileTab === 'posts') return
      void communityApi
        .follows(userId, profileTab)
        .then((page) => {
          if (profilePeopleScopeRef.current !== profilePeopleScope) return
          setProfilePeople(page.content)
          setProfilePeopleCursor(page.nextCursor ?? undefined)
          setProfilePeopleHasNext(page.hasNext)
        })
        .catch((error: unknown) => {
          logCommunityFailure('profile.followers.load', error)
          if (profilePeopleScopeRef.current === profilePeopleScope) {
            setError('Không thể tải danh sách học viên.')
          }
        })
    })
  }, [userId, profileTab, profilePeopleScope])

  // Submit Post
  const submitPost = form.handleSubmit(async (raw) => {
    const parsed = postFormSchema.safeParse(raw)
    if (!parsed.success) {
      setFormValidationError(parsed.error.issues[0]?.message ?? 'Kiểm tra lại nội dung bài viết.')
      return
    }
    setFormValidationError('')
    const value = parsed.data
    try {
      const payload = {
        category: value.category,
        title: value.title || undefined,
        body: value.body,
        imageUrls: value.imageUrls.split('\n').map((x) => x.trim()).filter(Boolean),
        videoUrl: value.videoUrl || undefined,
        targetBand: value.targetBand ? Number(value.targetBand) : undefined,
        background: value.background ?? null,
      }
      const saved = editingPost
        ? await communityApi.update(editingPost.id, payload)
        : await communityApi.create(payload)
      setPosts((current) => [saved, ...current.filter((item) => item.id !== saved.id)])
      setComposer(false)
      setComposerMediaIntent(null)
      setEditingPost(null)
      form.reset()
    } catch (error) {
      logCommunityFailure('post.save', error)
      setError('Bài viết chưa được đăng. Vui lòng kiểm tra nội dung và thử lại.')
    }
  })

  // Optimistic Reaction Update with Rollback
  const toggleReaction = async (post: CommunityPost, type: ReactionType) => {
    const previousReaction = post.myReaction
    const previousCounts = { ...post.reactionCounts }

    // Tính toán optimistic count mới
    const nextCounts = { ...previousCounts }
    if (previousReaction) {
      nextCounts[previousReaction] = Math.max(0, (nextCounts[previousReaction] ?? 0) - 1)
    }
    if (previousReaction !== type) {
      nextCounts[type] = (nextCounts[type] ?? 0) + 1
    }
    const nextMyReaction = previousReaction === type ? null : type

    // Cập nhật giao diện tức thời (Optimistic Update)
    setPosts((items) =>
      items.map((item) =>
        item.id === post.id
          ? { ...item, myReaction: nextMyReaction, reactionCounts: nextCounts }
          : item,
      ),
    )

    try {
      if (previousReaction === type) {
        await communityApi.removeReaction(post.id, type)
      } else {
        await communityApi.react(post.id, type)
      }
    } catch (error) {
      // Rollback về trạng thái cũ nếu gặp lỗi
      logCommunityFailure('reaction.update', error)
      setPosts((items) =>
        items.map((item) =>
          item.id === post.id
            ? { ...item, myReaction: previousReaction, reactionCounts: previousCounts }
            : item,
        ),
      )
      setError('Không thể cập nhật cảm xúc.')
    }
  }

  // Toggle Bookmark
  const toggleBookmark = async (post: CommunityPost) => {
    try {
      await communityApi.bookmark(post.id, post.bookmarkedByMe)
      setPosts((items) =>
        items.map((item) =>
          item.id === post.id ? { ...item, bookmarkedByMe: !item.bookmarkedByMe } : item,
        ),
      )
    } catch (error) {
      logCommunityFailure('bookmark.update', error)
      setError('Không thể cập nhật bài đã lưu.')
    }
  }

  // Open / Close Comments
  const openComments = async (id: string) => {
    setCommentPost(commentPost === id ? null : id)
    setReplyTo(undefined)
    setEditingComment(null)
    if (commentPost === id) return
    try {
      const result = await communityApi.comments(id)
      setComments(result.content)
    } catch (error) {
      logCommunityFailure('comments.load', error)
      setError('Không thể tải bình luận.')
    }
  }

  // Open Replies
  const openReplies = async (id: string) => {
    if (replies[id]) {
      setReplies((current) => {
        const next = { ...current }
        delete next[id]
        return next
      })
      return
    }
    try {
      const result = await communityApi.replies(id)
      setReplies((current) => ({ ...current, [id]: result.content }))
    } catch (error) {
      logCommunityFailure('replies.load', error)
      setError('Không thể tải phản hồi.')
    }
  }

  // Send Comment
  const sendComment = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!commentPost || !commentText.trim()) return
    try {
      await communityApi.comment(commentPost, commentText.trim(), replyTo)
      setCommentText('')
      setReplyTo(undefined)
      if (replyTo) {
        const result = await communityApi.replies(replyTo)
        setReplies((current) => ({ ...current, [replyTo]: result.content }))
      } else {
        const result = await communityApi.comments(commentPost)
        setComments(result.content)
      }
    } catch (error) {
      logCommunityFailure('comment.send', error)
      setError('Không thể gửi bình luận.')
    }
  }

  // Save Comment Edit
  const saveCommentEdit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editingComment || !editedCommentBody.trim()) return
    try {
      await communityApi.updateComment(editingComment.id, editedCommentBody.trim())
      setComments((current) =>
        current.map((comment) =>
          comment.id === editingComment.id ? { ...comment, body: editedCommentBody.trim() } : comment,
        ),
      )
      setEditingComment(null)
    } catch (error) {
      logCommunityFailure('comment.update', error)
      setError('Không thể sửa bình luận.')
    }
  }

  return (
    <div className="community-page">
      <SiteNavbar />

      <div className={`community-layout${showSandTransition ? ' community-transition-enter' : ''}`}>
        {/* Left Rail */}
        <aside className="community-rail community-left">
          <section className="community-welcome">
            <CommunityOwlBanner />
            <div className="community-avatar">
              {userName.slice(0, 1).toUpperCase()}
            </div>
            <h2>Chào bạn, {userName}</h2>
            <p>Cùng luyện tập và tiến bộ với cộng đồng IELTSPath.</p>
          </section>

          <nav aria-label="Community">
            <Link className={!isBookmarks && !userId ? 'selected' : ''} to="/community">
              <Users size={18} /> Bảng tin
            </Link>
            <Link className={isBookmarks ? 'selected' : ''} to="/community?tab=bookmarks">
              <Bookmark size={18} /> Đã lưu
            </Link>
            {roles?.includes('ADMIN') && (
              <Link to="/community/admin/reports">Hàng chờ vi phạm</Link>
            )}
          </nav>
        </aside>

        {/* Main Feed Content */}
        <main className="community-main">
          {userId && profile && (
            <section className="community-profile">
              <div className="community-avatar">
                {profile.displayName.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <h1>{profile.displayName}</h1>
                <p>{profile.bio || 'Đang cùng cộng đồng chinh phục mục tiêu IELTS.'}</p>
                <span>
                  {relationship?.followerCount ?? 0} người theo dõi ·{' '}
                  {relationship?.followingCount ?? 0} đang theo dõi
                </span>
              </div>
              {profile.id !== currentUserId && (
                <button
                  type="button"
                  className="community-primary"
                  onClick={() =>
                    void communityApi
                      .follow(userId, relationship?.following ?? false)
                      .then(() => communityApi.relationship(userId))
                      .then(setRelationship)
                      .catch(() => setError('Không thể cập nhật theo dõi.'))
                  }
                >
                  {relationship?.following ? 'Đang theo dõi' : 'Theo dõi'}
                </button>
              )}
            </section>
          )}

          {userId && profile && (
            <section className="community-public-profile">
              <div className="community-avatar community-profile-avatar">
                {profile.avatarUrl?.startsWith('https://') ? (
                  <img src={profile.avatarUrl} alt="" referrerPolicy="no-referrer" />
                ) : (
                  profile.displayName.slice(0, 1).toUpperCase()
                )}
              </div>
              <div className="community-profile-summary">
                <h2>{profile.displayName}</h2>
                {profile.bio && <p>{profile.bio}</p>}
                <div className="community-profile-stats">
                  {profile.targetBand != null && (
                    <span>Mục tiêu IELTS {profile.targetBand}</span>
                  )}
                  {profile.streak != null && (
                    <span>{profile.streak} ngày học liên tục</span>
                  )}
                  {relationship && (
                    <span>
                      {relationship.followerCount} người theo dõi ·{' '}
                      {relationship.followingCount} đang theo dõi
                    </span>
                  )}
                </div>
              </div>
              {userId !== currentUserId && relationship && (
                <button
                  type="button"
                  className="community-primary"
                  onClick={() =>
                    void communityApi
                      .follow(userId, relationship.following)
                      .then(() =>
                        setRelationship({
                          ...relationship,
                          following: !relationship.following,
                          followerCount: relationship.followerCount + (relationship.following ? -1 : 1),
                        }),
                      )
                      .catch(() => setError('Không thể cập nhật theo dõi.'))
                  }
                >
                  {relationship.following ? 'Đang theo dõi' : 'Theo dõi'}
                </button>
              )}
            </section>
          )}

          {userId && (
            <nav className="community-profile-tabs" aria-label="Các mục hồ sơ">
              <Link to={`/community/users/${userId}`} className={profileTab === 'posts' ? 'active' : ''}>
                Bài viết
              </Link>
              <Link to={`/community/users/${userId}?tab=followers`} className={profileTab === 'followers' ? 'active' : ''}>
                Người theo dõi
              </Link>
              <Link to={`/community/users/${userId}?tab=following`} className={profileTab === 'following' ? 'active' : ''}>
                Đang theo dõi
              </Link>
            </nav>
          )}

          <header className="community-heading">
            <div>
              <p className="community-eyebrow">IELTSPATH COMMUNITY</p>
              <h1>
                {postId
                  ? 'Cuộc trò chuyện'
                  : isBookmarks
                  ? 'Bài viết đã lưu'
                  : userId
                  ? profileTab === 'followers'
                    ? 'Người theo dõi'
                    : profileTab === 'following'
                    ? 'Đang theo dõi'
                    : `Bài viết của ${profile?.displayName ?? 'học viên'}`
                  : 'Cùng nhau tiến bộ'}
              </h1>
              <p>Chia sẻ câu hỏi, kinh nghiệm và mục tiêu học tập.</p>
            </div>
            <OwlHero className="community-heading-owl" decor={false} enter="right" poses={['wave', 'cheer', 'idea']} size="sm" />
            {!postId && !isBookmarks && !userId && (
              <button
                className="community-primary"
                type="button"
                onClick={() => setComposer(true)}
              >
                <Plus size={18} /> Bài viết mới
              </button>
            )}
          </header>

          {!postId && !userId && !isBookmarks && (
            <CommunitySearchForm
              key={searchQuery}
              query={searchQuery}
              onSearch={(value) => {
                const params = new URLSearchParams(search)
                if (value) params.set('q', value)
                else params.delete('q')
                params.delete('cursor')
                setSearch(params)
              }}
            />
          )}

          {!postId && !userId && !isBookmarks && (
            <CommunityFeedTabs
              activeScope={isFollowingFeed ? 'FOLLOWING' : 'ALL'}
              category={activeCategory || undefined}
              query={searchQuery || undefined}
            />
          )}

          {!postId && !userId && !isBookmarks && (
            <div className="community-categories" aria-label="Lọc theo chủ đề">
              <button
                className={!activeCategory ? 'active' : ''}
                onClick={() => setActiveCategory('')}
                type="button"
              >
                Tất cả chủ đề
              </button>
              {categories.map((category) => (
                <button
                  className={activeCategory === category ? 'active' : ''}
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  type="button"
                >
                  {CATEGORY_LABELS[category] ?? category}
                </button>
              ))}
            </div>
          )}

          {error && (
            <div className="community-alert" role="alert">
              <span>{error}</span>
              <button
                type="button"
                onClick={() =>
                  postId
                    ? void communityApi.post(postId).then((post) => setPosts([post])).catch((cause: unknown) => logCommunityFailure('post.retry', cause))
                    : void load(true)
                }
              >
                Thử lại
              </button>
            </div>
          )}

          {!postId && !userId && !isBookmarks && (
            <QuickComposerBar
              userName={userName}
              onOpenComposer={(mediaType) => {
                setComposerMediaIntent(mediaType ?? null)
                setComposer(true)
              }}
            />
          )}

          {/* Followers / Following Profile List */}
          {userId && profileTab !== 'posts' && (
            <section className="community-people-list">
              {profilePeople.length ? (
                profilePeople.map((person) => (
                  <Link key={person.id} to={`/community/users/${person.id}`}>
                    <span className="community-avatar">
                      {person.avatarUrl?.startsWith('https://') ? (
                        <img src={person.avatarUrl} alt="" referrerPolicy="no-referrer" />
                      ) : (
                        person.displayName.slice(0, 1).toUpperCase()
                      )}
                    </span>
                    <span>
                      {person.displayName}
                      <small>
                        {person.bio || 'Học viên IELTSPath'}
                        {person.targetBand != null ? ` · mục tiêu ${person.targetBand}` : ''}
                        {person.streak != null ? ` · streak ${person.streak} ngày` : ''}
                      </small>
                    </span>
                  </Link>
                ))
              ) : (
                <p>Danh sách này hiện chưa có học viên.</p>
              )}
              {profilePeopleHasNext && (
                <button
                  type="button"
                  className="community-secondary"
                  onClick={() => void loadProfilePeople()}
                >
                  Tải thêm
                </button>
              )}
            </section>
          )}

          {/* Skeleton Shimmer khi đang tải ban đầu */}
          {loading && posts.length === 0 && <FeedSkeleton />}

          {/* Feed Post List */}
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              isCommentsOpen={commentPost === post.id}
              onToggleComments={openComments}
              onReaction={toggleReaction}
              onToggleBookmark={toggleBookmark}
              onEditPost={(p) => {
                setEditingPost(p)
                form.reset({
                  category: p.category as PostFormValues['category'],
                  title: p.title ?? '',
                  body: p.body,
                  imageUrls: p.imageUrls.join('\n'),
                  videoUrl: p.videoUrl ?? '',
                  targetBand: p.targetBand?.toString() ?? '',
                  background: isComposerBackgroundKey(p.background) ? p.background : null,
                })
                setComposer(true)
              }}
              onDeletePost={(id) => {
                void confirm({ title: 'Xóa bài viết?', message: 'Bạn muốn xóa bài viết này?', confirmLabel: 'Xóa bài viết', tone: 'danger' }).then((confirmed) => {
                  if (!confirmed) return
                  void communityApi
                    .delete(id)
                    .then(() => setPosts((items) => items.filter((item) => item.id !== id)))
                    .catch(() => setError('Không thể xóa bài viết.'))
                })
              }}
              onFollowAuthor={(authorId, following) => {
                void communityApi
                  .follow(authorId, following)
                  .then(() =>
                    setPosts((items) =>
                      items.map((p) =>
                        p.id === post.id ? { ...p, followingAuthor: !p.followingAuthor } : p,
                      ),
                    ),
                  )
                  .catch(() => setError('Không thể cập nhật theo dõi.'))
              }}
              onOpenReport={setReportTarget}
              onImageClick={setLightboxImage}
            >
              {commentPost === post.id && (
                <CommentSection
                  postId={post.id}
                  currentUserId={currentUserId}
                  comments={comments}
                  replies={replies}
                  replyTo={replyTo}
                  editingComment={editingComment}
                  editedCommentBody={editedCommentBody}
                  commentText={commentText}
                  mentionSuggestions={mentionSuggestions}
                  mentionIndex={mentionIndex}
                  onSetCommentText={setCommentText}
                  onUpdateMentionQuery={updateMentionQuery}
                  onMentionKeyDown={handleMentionKeyDown}
                  onInsertMention={insertMention}
                  onSendComment={sendComment}
                  onReplyTo={setReplyTo}
                  onStartEditComment={(comment) => {
                    setEditingComment(comment)
                    setEditedCommentBody(comment.body)
                  }}
                  onCancelEditComment={() => setEditingComment(null)}
                  onChangeEditedCommentBody={setEditedCommentBody}
                  onSaveCommentEdit={saveCommentEdit}
                  onDeleteComment={(commentId) => {
                    void confirm({ title: 'Xóa bình luận?', message: 'Bạn muốn xóa bình luận này?', confirmLabel: 'Xóa bình luận', tone: 'danger' }).then((confirmed) => {
                      if (!confirmed) return
                      void communityApi
                        .deleteComment(commentId)
                        .then(() => setComments((items) => items.filter((item) => item.id !== commentId)))
                        .catch(() => setError('Không thể xóa bình luận.'))
                    })
                  }}
                  onOpenReplies={openReplies}
                  onOpenReport={setReportTarget}
                />
              )}
            </PostCard>
          ))}

          {/* Empty States */}
          {posts.length === 0 && !loading && !error && profileTab === 'posts' && (
            searchQuery ? (
              <section className="community-empty-state" role="status">
                <OwlHero className="community-empty-owl" decor={false} pose="confused" size="sm" />
                <h2>Không tìm thấy bài viết phù hợp</h2>
                <p>Hãy thử từ khóa khác hoặc điều chỉnh chủ đề.</p>
              </section>
            ) : isFollowingFeed ? (
              <section className="community-empty-state community-following-empty" role="status">
                <OwlHero className="community-empty-owl" decor={false} pose="tired" size="sm" />
                <h2>Bạn chưa có bài viết từ người đang theo dõi</h2>
                <p>Thử theo dõi những học viên đang chia sẻ gần đây:</p>
                {followSuggestions.length ? (
                  <ul className="community-follow-suggestions">
                    {followSuggestions.map((person) => (
                      <li key={person.id}>
                        <Link to={`/community/users/${person.id}`}>
                          <span className="community-avatar">
                            {person.displayName.slice(0, 1).toUpperCase()}
                          </span>
                          {person.displayName}
                        </Link>
                        <button
                          type="button"
                          className="community-secondary"
                          onClick={() =>
                            void communityApi
                              .follow(person.id, false)
                              .then(() =>
                                setFollowSuggestions((current) =>
                                  current.filter((candidate) => candidate.id !== person.id),
                                ),
                              )
                              .catch(() => setError('Không thể cập nhật theo dõi.'))
                          }
                        >
                          Theo dõi
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Chưa có học viên gợi ý. Hãy xem mục Tất cả để khám phá bài viết mới.</p>
                )}
              </section>
            ) : (
              <section className="community-empty-state">
                <OwlHero className="community-empty-owl" pose="idea" size="sm" />
                <h2>Bảng tin đang chờ câu chuyện đầu tiên</h2>
                <p>Chia sẻ câu hỏi hoặc kinh nghiệm học tập của bạn.</p>
                <button
                  className="community-primary"
                  type="button"
                  onClick={() => setComposer(true)}
                >
                  Tạo bài viết
                </button>
              </section>
            )
          )}

          {/* Sentinel for Infinite Scroll */}
          {profileTab === 'posts' && (
            <div ref={observerRef} className="community-sentinel" aria-hidden="true" />
          )}

          {/* Loading indicator */}
          {loading && posts.length > 0 && (
            <p className="community-loading" role="status">
              Đang tải bài viết…
            </p>
          )}
          {profileTab === 'posts' && !hasNext && posts.length > 0 && (
            <p className="community-loading">Bạn đã xem hết bảng tin.</p>
          )}
        </main>

        {/* Right Rail */}
        <aside className="community-rail community-right">
          <section>
            <h2>Đáng chú ý</h2>
            <p>Các bài viết gần đây được cộng đồng quan tâm.</p>
            <ol className="community-trending">
              {[...posts]
                .sort(
                  (a, b) =>
                    Object.values(b.reactionCounts).reduce((x, y) => x + y, 0) -
                    Object.values(a.reactionCounts).reduce((x, y) => x + y, 0),
                )
                .slice(0, 3)
                .map((post, index) => {
                  const title = post.title || post.body.slice(0, 65)
                  const reactionCount = Object.values(post.reactionCounts).reduce((x, y) => x + y, 0)
                  return (
                    <li key={post.id}>
                      <Link className="community-trending-link" to={`/community/posts/${post.id}`}>
                        <span className="community-trending-rank" aria-hidden="true">{index + 1}</span>
                        <span className="community-trending-content">
                          <span
                            className="community-trending-title"
                            title={title}
                            style={{
                              display: '-webkit-box',
                              overflow: 'hidden',
                              overflowWrap: 'anywhere',
                              textOverflow: 'ellipsis',
                              wordBreak: 'break-word',
                              WebkitBoxOrient: 'vertical',
                              WebkitLineClamp: 2,
                            }}
                          >
                            {title}
                          </span>
                          <span className="community-trending-reactions">{reactionCount} cảm xúc</span>
                        </span>
                      </Link>
                    </li>
                  )
                })}
            </ol>
          </section>

          <section>
            <h2>Chủ đề phổ biến</h2>
            <ul>
              {categories.slice(1).map((cat) => (
                <li key={cat}>
                  <button type="button" onClick={() => setActiveCategory(cat)}>
                    {CATEGORY_LABELS[cat] ?? cat}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="community-ielts-tips-card">
            <OwlHero className="community-tips-owl" decor={false} enter="right" pose="cool" size="sm" />
            <div className="community-ielts-tips-header">
              <Lightbulb size={18} className="community-ielts-tips-icon" />
              <h2>Mẹo luyện thi IELTS</h2>
            </div>
            <ul className="community-ielts-tips-list">
              <li>
                <strong>Writing Task 2:</strong> Lập dàn ý 5 phút trước khi viết để đảm bảo mạch lạc (Coherence & Cohesion).
              </li>
              <li>
                <strong>Speaking Part 2:</strong> Áp dụng cấu trúc <em>Past - Present - Future</em> để mở rộng câu trả lời tự nhiên.
              </li>
              <li>
                <strong>Listening:</strong> Đọc trước câu hỏi và gạch chân từ khóa trong 30 giây chuẩn bị mỗi phần.
              </li>
            </ul>
          </section>
        </aside>

        {/* Composer Modal */}
        <PostComposerModal
          key={`${composer ? 'open' : 'closed'}-${composerMediaIntent ?? 'default'}`}
          isOpen={composer}
          initialMediaType={composerMediaIntent ?? undefined}
          openMediaOnOpen={Boolean(composerMediaIntent)}
          isEditing={Boolean(editingPost)}
          form={form}
          formValidationError={formValidationError}
          categories={categories}
          userName={userName}
          onSubmit={submitPost}
          onClose={() => {
            setComposer(false)
            setComposerMediaIntent(null)
            setEditingPost(null)
            form.reset()
          }}
        />

        {/* Image Lightbox Modal */}
        {lightboxImage && (
          <div
            className="community-modal-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setLightboxImage(null)
            }}
          >
            <section
              className="community-lightbox"
              role="dialog"
              aria-modal="true"
              aria-label="Ảnh phóng to"
            >
              <button
                type="button"
                aria-label="Đóng ảnh"
                onClick={() => setLightboxImage(null)}
              >
                ×
              </button>
              <img
                src={lightboxImage}
                alt="Ảnh phóng to từ bài viết"
                referrerPolicy="no-referrer"
              />
            </section>
          </div>
        )}

        {confirmDialog}

        {/* Report Dialog */}
        <ReportDialog
          target={reportTarget}
          reason={reportReason}
          message={reportMessage}
          onChangeReason={setReportReason}
          onSubmit={(event) => {
            event.preventDefault()
            const reason = reportReason.trim()
            if (!reason) {
              setReportMessage('Hãy nhập lý do báo cáo.')
              return
            }
            if (!reportTarget) return
            void communityApi
              .reportContent(reportTarget.type, reportTarget.id, reason)
              .then(() => {
                setError('Đã gửi báo cáo để ADMIN xem xét.')
                setReportTarget(null)
              })
              .catch((cause: unknown) => {
                setReportMessage(
                  cause instanceof HttpError && cause.status === 409
                    ? 'Bạn đã báo cáo nội dung này.'
                    : 'Không thể gửi báo cáo. Vui lòng thử lại.',
                )
              })
          }}
          onClose={() => setReportTarget(null)}
        />
      </div>
      {showSandTransition && <SandTransition onComplete={completeSandTransition} />}
    </div>
  )
}
