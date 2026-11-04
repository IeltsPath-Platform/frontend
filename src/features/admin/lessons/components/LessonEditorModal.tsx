import { useState } from 'react'
import { AdminModal } from '../../components/AdminLayer'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminResource } from '../../lib/useAdminResource'
import { STATUS_LABEL, statusBadgeClass } from '../../questions/lib/labels'
import { fetchLesson } from '../api/lessonApi'
import type { LessonEditor } from '../types'
import { LessonEditorPanel } from './LessonEditorPanel'

/**
 * The popup of one lesson. Its header carries what is true of the whole lesson: the status beside the title. Moving the
 * lesson on (publish, archive) is done from its row menu in the list; the editor of its parts is the body.
 */
export function LessonEditorModal({ lessonId, fallbackTitle, topicName, onClose }: {
  lessonId: string
  /** Shown until the lesson has loaded, and kept if it cannot be loaded. */
  fallbackTitle: string
  topicName: string
  onClose: () => void
}) {
  const lesson = useAdminResource(`lesson|${lessonId}`, (signal) => fetchLesson(lessonId, signal))
  // Keep showing the last loaded lesson while a refresh runs, so the form does not flicker after every write.
  const [shown, setShown] = useState<LessonEditor | null>(null)

  if (lesson.status === 'success' && lesson.data && lesson.data !== shown) setShown(lesson.data)
  const current = lesson.status === 'success' ? lesson.data : shown

  return (
    <AdminModal
      badge={current ? <span className={statusBadgeClass(current.status)}>{STATUS_LABEL[current.status]}</span> : null}
      description={current ? `${current.code} · ${topicName}` : topicName}
      onClose={onClose}
      size="wide"
      stacked
      title={current?.title ?? fallbackTitle}
    >
      {(close) => <>
        {!current && lesson.status === 'loading' ? <AdminLoading label="Đang tải bài học…" /> : null}
        {lesson.status === 'error' ? <AdminError message={lesson.error ?? 'Không tải được bài học.'} onRetry={lesson.reload} /> : null}
        {current ? <LessonEditorPanel key={current.id} lesson={current} onClose={close} reload={lesson.reload} /> : null}
      </>}
    </AdminModal>
  )
}
