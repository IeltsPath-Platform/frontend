import { SubmissionHistoryPage } from '../history/SubmissionHistoryPage'

/**
 * The old address of the list of essays a teacher graded (`/writing-reviews`), which notices still link to. It is the page
 * "Lịch sử nộp bài" with its teacher tab open; the list itself is {@link ExaminerReviewsList}.
 */
export function ExaminerReviewsPage() {
  return <SubmissionHistoryPage defaultTab="teacher" />
}
