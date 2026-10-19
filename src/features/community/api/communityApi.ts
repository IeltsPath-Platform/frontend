import { z } from 'zod'
import { apiRequest, HttpError } from '@/lib/httpClient'

const profileSchema = z.object({ id: z.string().guid(), displayName: z.string(), avatarUrl: z.string().nullable().optional(), bio: z.string().nullable().optional(), targetBand: z.number().nullable().optional(), streak: z.number().optional() })
export type PublicProfile = z.infer<typeof profileSchema>
export const postSchema = z.object({ id: z.string().guid(), authorId: z.string().guid(), category: z.string(), title: z.string().nullable(), body: z.string(), createdAt: z.string(), imageUrls: z.array(z.string()).default([]), videoUrl: z.string().nullable().optional(), targetBand: z.number().nullable().optional(), background: z.enum(['VIOLET', 'CRIMSON', 'MIDNIGHT', 'SUNSET', 'OCEAN', 'FOREST', 'ROSE', 'AURORA']).nullable().optional(), author: profileSchema.nullable().optional(), reactionCounts: z.record(z.string(), z.number()).default({}), myReaction: z.string().nullable().optional(), commentCount: z.number().default(0), bookmarkedByMe: z.boolean().default(false), followingAuthor: z.boolean().default(false) })
export type CommunityPost = z.infer<typeof postSchema>
export const cursorPageSchema = z.object({ content: z.array(postSchema), nextCursor: z.string().nullable(), hasNext: z.boolean(), size: z.number() })
const profilePageSchema = z.object({ content: z.array(profileSchema), nextCursor: z.string().nullable(), hasNext: z.boolean(), size: z.number() })
export const notificationSchema = z.object({ id: z.string().guid(), actorId: z.string().guid(), eventType: z.string(), postId: z.string().guid().nullable(), commentId: z.string().guid().nullable(), createdAt: z.string(), readAt: z.string().nullable() })
export type Notification = z.infer<typeof notificationSchema>
export const notificationPreferenceSchema = z.object({ eventType: z.string(), enabled: z.boolean() })
export type NotificationPreference = z.infer<typeof notificationPreferenceSchema>
const contentReportSchema = z.object({ id: z.string().guid(), contentType: z.enum(['POST', 'COMMENT']), contentId: z.string().guid(), reason: z.string(), status: z.enum(['PENDING', 'DISMISSED', 'ACTIONED']), createdAt: z.string() })
export type ContentReport = z.infer<typeof contentReportSchema>
const reportQueueItemSchema = z.object({ id: z.string().guid(), reporterId: z.string().guid(), reporterDisplayName: z.string().nullable().optional(), contentType: z.enum(['POST', 'COMMENT']), contentId: z.string().guid(), contentAuthorId: z.string().guid().nullable(), contentAuthorDisplayName: z.string().nullable().optional(), contentPreview: z.string().nullable(), reason: z.string(), status: z.literal('PENDING'), createdAt: z.string() })
const reportQueueSchema = z.object({ content: z.array(reportQueueItemSchema), page: z.number(), size: z.number(), totalElements: z.number(), totalPages: z.number(), sort: z.string() })

const IMAGE_MAX_SIZE = 5 * 1024 * 1024
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const uploadedImageSchema = z.object({ url: z.string().url(), key: z.string(), contentType: z.string(), size: z.number() })

export class MediaUploadError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'MediaUploadError'
    this.status = status
  }
}

function validateMediaFile(file: File, types: Set<string>, maxSize: number, label: string) {
  if (!types.has(file.type)) {
    throw new MediaUploadError(`Tệp ${label} không được hỗ trợ. Vui lòng chọn đúng định dạng.`)
  }
  if (file.size <= 0) throw new MediaUploadError(`Tệp ${label} đang trống.`)
  if (file.size > maxSize) {
    throw new MediaUploadError(`Tệp ${label} vượt quá dung lượng tối đa ${Math.round(maxSize / (1024 * 1024))} MB.`)
  }
}

function uploadError(error: unknown): MediaUploadError {
  if (error instanceof MediaUploadError) return error
  if (error instanceof HttpError) {
    const messages: Record<number, string> = {
      400: 'Tệp không hợp lệ hoặc bị lỗi. Hãy chọn tệp khác.',
      413: 'Tệp vượt quá dung lượng cho phép.',
      415: 'Định dạng tệp này chưa được hỗ trợ.',
      429: 'Bạn đã tải lên quá nhiều lần. Vui lòng thử lại sau.',
      503: 'Tải tệp từ máy tạm thời chưa khả dụng, hãy dùng đường dẫn URL.',
    }
    return new MediaUploadError(messages[error.status] ?? 'Không thể tải tệp lên. Vui lòng thử lại.', error.status)
  }
  return new MediaUploadError('Không thể tải tệp lên. Vui lòng kiểm tra kết nối và thử lại.')
}

export function getMediaUploadErrorMessage(error: unknown) {
  return uploadError(error).message
}

export type ContentReportQueueItem = z.infer<typeof reportQueueItemSchema>
export type ContentReportQueue = z.infer<typeof reportQueueSchema>

export const communityApi = {
  feed: async (cursor?: string, category?: string, scope: 'ALL' | 'FOLLOWING' = 'ALL', query?: string) => cursorPageSchema.parse(await apiRequest(`/api/community/posts?pagination=cursor&size=10&scope=${scope}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}${category ? `&category=${category}` : ''}${query ? `&q=${encodeURIComponent(query)}` : ''}`, { auth: true })),
  userPosts: async (id: string, cursor?: string) => cursorPageSchema.parse(await apiRequest(`/api/community/users/${id}/posts?size=10${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, { auth: true })),
  bookmarks: async (cursor?: string) => cursorPageSchema.parse(await apiRequest(`/api/community/posts/bookmarked?size=10${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, { auth: true })),
  post: async (id: string) => postSchema.parse(await apiRequest(`/api/community/posts/${id}`, { auth: true })),
  relationship: async (id: string) => z.object({ following: z.boolean(), followerCount: z.number(), followingCount: z.number() }).parse(await apiRequest(`/api/community/users/${id}/relationship`, { auth: true })),
  profile: async (id: string) => profileSchema.parse(await apiRequest(`/api/users/${id}/public-profile`, { auth: true })),
  mentionSuggestions: async (query: string) => z.array(profileSchema).parse(await apiRequest(`/api/community/users/mention-suggestions?q=${encodeURIComponent(query)}`, { auth: true })),
  follows: async (id: string, direction: 'followers' | 'following', cursor?: string) => profilePageSchema.parse(await apiRequest(`/api/community/users/${id}/${direction}?size=10${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, { auth: true })),
  create: (body: { category: string; title?: string; body: string; imageUrls?: string[]; videoUrl?: string; targetBand?: number; background?: string | null }) => apiRequest<CommunityPost>('/api/community/posts', { method: 'POST', auth: true, body }),
  update: (id: string, body: { category: string; title?: string; body: string; imageUrls?: string[]; videoUrl?: string; targetBand?: number; background?: string | null }) => apiRequest<CommunityPost>(`/api/community/posts/${id}`, { method: 'PUT', auth: true, body }),
  uploadImage: async (file: File, signal?: AbortSignal): Promise<{ url: string }> => {
    try {
      validateMediaFile(file, IMAGE_TYPES, IMAGE_MAX_SIZE, 'ảnh')
      const formData = new FormData()
      formData.append('file', file)
      const result = uploadedImageSchema.parse(await apiRequest('/api/community/media/images', {
        method: 'POST', auth: true, body: formData, signal,
      }))
      return { url: result.url }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error
      throw uploadError(error)
    }
  },
  delete: (id: string) => apiRequest<void>(`/api/community/posts/${id}`, { method: 'DELETE', auth: true }),
  react: (id: string, type: string) => apiRequest<void>(`/api/community/posts/${id}/reactions/${type}`, { method: 'PUT', auth: true }),
  removeReaction: (id: string, type: string) => apiRequest<void>(`/api/community/posts/${id}/reactions/${type}`, { method: 'DELETE', auth: true }),
  bookmark: (id: string, active: boolean) => apiRequest<void>(`/api/community/posts/${id}/bookmark`, { method: active ? 'DELETE' : 'POST', auth: true }),
  comments: (id: string) => apiRequest<{ content: Comment[] }>(`/api/community/posts/${id}/comments?threaded=true&size=20`, { auth: true }),
  replies: (id: string) => apiRequest<{ content: Comment[] }>(`/api/community/comments/${id}/replies?size=20`, { auth: true }),
  comment: (id: string, body: string, parentCommentId?: string) => apiRequest(`/api/community/posts/${id}/comments`, { method: 'POST', auth: true, body: { body, parentCommentId } }),
  updateComment: (id: string, body: string) => apiRequest(`/api/community/comments/${id}`, { method: 'PUT', auth: true, body: { body } }),
  deleteComment: (id: string) => apiRequest<void>(`/api/community/comments/${id}`, { method: 'DELETE', auth: true }),
  follow: (id: string, active: boolean) => apiRequest<void>(`/api/community/users/${id}/follow`, { method: active ? 'DELETE' : 'POST', auth: true }),
  notifications: async () => z.array(notificationSchema).parse(await apiRequest('/api/notifications?size=20', { auth: true })),
  notificationPreferences: async () => z.array(notificationPreferenceSchema).parse(await apiRequest('/api/notifications/preferences', { auth: true })),
  updateNotificationPreference: (eventType: string, enabled: boolean) => apiRequest<NotificationPreference>(`/api/notifications/preferences/${encodeURIComponent(eventType)}`, { method: 'PUT', auth: true, body: { enabled } }),
  reportContent: async (contentType: 'POST' | 'COMMENT', contentId: string, reason: string) => contentReportSchema.parse(await apiRequest('/api/community/reports', { method: 'POST', auth: true, body: { contentType, contentId, reason } })),
  pendingReports: async (page = 0, size = 20) => reportQueueSchema.parse(await apiRequest(`/api/community/admin/reports?page=${page}&size=${size}`, { auth: true })),
  resolveReport: async (reportId: string, decision: 'DISMISS' | 'HIDE_CONTENT') => contentReportSchema.parse(await apiRequest(`/api/community/admin/reports/${reportId}/decision`, { method: 'PUT', auth: true, body: { decision } })),
  unread: async () => z.object({ count: z.number() }).parse(await apiRequest('/api/notifications/unread-count', { auth: true })),
  markRead: (id: string) => apiRequest<void>(`/api/notifications/${id}/read`, { method: 'PUT', auth: true }),
  markAll: () => apiRequest('/api/notifications/read-all', { method: 'PUT', auth: true }),
}

export type Comment = { id: string; authorId: string; parentCommentId: string | null; body: string; replyCount: number; author?: { displayName: string } }
