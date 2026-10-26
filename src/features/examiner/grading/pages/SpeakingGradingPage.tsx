import { AdminEmpty } from '@/features/admin/components/AdminState'
import { AdminPage } from '@/features/admin/pages/AdminPage'

/** Speaking grading is not open yet: learners cannot send a recording to an examiner. */
export function SpeakingGradingPage() {
  return (
    <AdminPage subtitle="Nghe bài nói của học viên và chấm theo 4 tiêu chí." title="Chấm Speaking">
      <AdminEmpty title="Chấm Speaking chưa mở">
        Học viên chưa gửi được bài nói cho giám khảo. Khi tính năng mở, bài Speaking sẽ xuất hiện ở đây.
      </AdminEmpty>
    </AdminPage>
  )
}
