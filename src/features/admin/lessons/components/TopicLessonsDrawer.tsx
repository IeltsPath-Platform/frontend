import { useState } from 'react'
import { AdminDrawer } from '../../components/AdminLayer'
import type { TopicOption } from '../types'
import { LessonEditorPanel } from './LessonEditorPanel'
import { NewLessonForm } from './NewLessonForm'
import { TopicLessonsPanel } from './TopicLessonsPanel'

type View = { kind: 'list' } | { kind: 'create' } | { kind: 'lesson'; id: string; title: string }

/**
 * Everything about the lessons of one topic in one panel over the course page: the list, a new lesson, and the editor
 * of one lesson. The back arrow steps from a lesson or the new-lesson form to the list; the list closes the panel.
 */
export function TopicLessonsDrawer({ topic, onClose }: { topic: TopicOption; onClose: () => void }) {
  const [view, setView] = useState<View>({ kind: 'list' })
  const title = view.kind === 'lesson' ? view.title : view.kind === 'create' ? 'Bài học mới' : topic.name
  const description = view.kind === 'list' ? `${topic.code} · Bài học của chủ đề` : topic.name
  const backToList = () => setView({ kind: 'list' })
  return (
    <AdminDrawer
      backLabel="Về danh sách bài học"
      description={description}
      onBack={view.kind === 'list' ? undefined : backToList}
      onClose={onClose}
      resetScrollKey={view.kind === 'lesson' ? view.id : view.kind}
      size="xl"
      title={title}
    >
      {view.kind === 'list' ? <TopicLessonsPanel onCreate={() => setView({ kind: 'create' })} onOpen={(lesson) => setView({ kind: 'lesson', ...lesson })} topicId={topic.id} /> : null}
      {view.kind === 'create' ? <NewLessonForm onCancel={backToList} onCreated={backToList} topicId={topic.id} /> : null}
      {view.kind === 'lesson' ? <LessonEditorPanel key={view.id} lessonId={view.id} /> : null}
    </AdminDrawer>
  )
}
