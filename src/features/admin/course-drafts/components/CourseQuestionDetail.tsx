import { AdminModal } from '../../components/AdminLayer'
import { CourseQuestionContent } from './CourseQuestionContent'

/** One question of an exercise block in a dialog, with the passage that goes with it. */
export function CourseQuestionDetail({ questionId, versionId, onClose }: { questionId: string; versionId: string; onClose: () => void }) {
  return <AdminModal title="Chi tiết câu hỏi" stacked onClose={onClose}>
    <CourseQuestionContent questionId={questionId} versionId={versionId} />
  </AdminModal>
}
