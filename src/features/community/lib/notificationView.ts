import type { Notification } from '../api/communityApi'

export const GRADING_OVERDUE = 'assessment.grading-overdue.v1'
export const GRADING_DUE_SOON = 'assessment.grading-due-soon.v1'
export const GRADING_REQUESTED = 'assessment.grading-requested.v1'
export const GRADING_COMPLETED = 'assessment.grading-completed.v1'

/** The learner's list of essays an examiner graded, where each one opens to the comments and the marked errors. */
export const EXAMINER_REVIEWS_PATH = '/writing-reviews'

/** The queue an examiner opens to give a job priority. */
const EXAMINER_QUEUE = '/admin/grading/writing'

const COMMUNITY_TEXT: Record<string, string> = {
  'community.user-followed.v1': 'Một học viên đã theo dõi bạn',
  'community.post-reacted.v1': 'Bài viết của bạn nhận được cảm xúc',
  'community.comment-mentioned.v1': 'Bạn được nhắc trong một bình luận',
  'community.comment-replied.v1': 'Có phản hồi mới trong cuộc trò chuyện',
}

/**
 * What a notification says and where it leads. The learner is told when the examiner they chose is late and can open the
 * job to wait or change examiner, and when the examiner finished, to read the comments; the examiner is told when a learner chose them and when a job will be late soon, and opens
 * their queue. Anything
 * else is a community notification (a post or a person).
 */
export function describeNotification(item: Pick<Notification, 'eventType' | 'postId' | 'actorId' | 'gradingJobId'>): { text: string; to: string } {
  if (item.eventType === GRADING_OVERDUE && item.gradingJobId) {
    return { text: 'Giáo viên chưa chấm bài của bạn. Bạn có thể chờ tiếp hoặc đổi giáo viên', to: `/grading-jobs/${item.gradingJobId}` }
  }
  if (item.eventType === GRADING_COMPLETED) {
    return { text: 'Giáo viên đã chấm xong bài của bạn. Xem nhận xét và các lỗi cần sửa', to: EXAMINER_REVIEWS_PATH }
  }
  if (item.eventType === GRADING_REQUESTED) {
    return { text: 'Có bài mới chờ bạn chấm (hạn 48 giờ)', to: EXAMINER_QUEUE }
  }
  if (item.eventType === GRADING_DUE_SOON) {
    return { text: 'Có bài sắp quá hạn chấm (còn khoảng 12 giờ). Hãy ưu tiên chấm', to: EXAMINER_QUEUE }
  }
  return {
    text: COMMUNITY_TEXT[item.eventType] ?? 'Có bình luận mới trên bài viết',
    to: item.postId ? `/community/posts/${item.postId}` : `/community/users/${item.actorId}`,
  }
}
