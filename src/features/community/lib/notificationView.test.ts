import { describe, expect, it } from 'vitest'
import { describeNotification } from './notificationView'

const base = { postId: null, actorId: '20000000-0000-4000-8000-000000000001', gradingJobId: null }
const job = '50000000-0000-4000-8000-000000000001'

describe('describeNotification', () => {
  it('tells the learner the examiner is late and leads to the job, where they wait or change examiner', () => {
    expect(describeNotification({ ...base, eventType: 'assessment.grading-overdue.v1', gradingJobId: job }))
      .toEqual({ text: 'Giáo viên chưa chấm bài của bạn. Bạn có thể chờ tiếp hoặc đổi giáo viên', to: `/grading-jobs/${job}` })
  })

  it('reminds the examiner that a job will be late soon and leads to the queue, without naming the learner', () => {
    const view = describeNotification({ ...base, eventType: 'assessment.grading-due-soon.v1', gradingJobId: job })
    expect(view.to).toBe('/admin/grading/writing')
    expect(view.text).toContain('sắp quá hạn')
  })

  it('tells the learner the examiner finished and leads to the list of graded essays, where each opens to the comments', () => {
    expect(describeNotification({ ...base, eventType: 'assessment.grading-completed.v1', gradingJobId: job }))
      .toEqual({ text: 'Giáo viên đã chấm xong bài của bạn. Xem nhận xét và các lỗi cần sửa', to: '/writing-reviews' })
  })

  it('tells the examiner a learner chose them and leads to the queue, without naming the learner', () => {
    expect(describeNotification({ ...base, eventType: 'assessment.grading-requested.v1', gradingJobId: job }))
      .toEqual({ text: 'Có bài mới chờ bạn chấm (hạn 48 giờ)', to: '/admin/grading/writing' })
  })

  it('keeps the community notifications as they were', () => {
    expect(describeNotification({ ...base, eventType: 'community.user-followed.v1' }))
      .toEqual({ text: 'Một học viên đã theo dõi bạn', to: `/community/users/${base.actorId}` })
    expect(describeNotification({ ...base, eventType: 'community.post-reacted.v1', postId: 'p1' }))
      .toEqual({ text: 'Bài viết của bạn nhận được cảm xúc', to: '/community/posts/p1' })
    expect(describeNotification({ ...base, eventType: 'community.comment-created.v1', postId: 'p1' }).text)
      .toBe('Có bình luận mới trên bài viết')
  })

  it('does not send a late-examiner notice without a job to a broken link', () => {
    expect(describeNotification({ ...base, eventType: 'assessment.grading-overdue.v1' }).to).toBe(`/community/users/${base.actorId}`)
  })
})
