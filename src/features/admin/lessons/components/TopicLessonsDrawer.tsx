import { useState } from 'react'
import { AdminDrawer } from '../../components/AdminLayer'
import type { TopicOption } from '../types'
import { LessonEditorModal } from './LessonEditorModal'
import { NewLessonForm } from './NewLessonForm'
import { TopicLessonsPanel } from './TopicLessonsPanel'

type View = { kind: 'list' } | { kind: 'create' }

/**
 * The lessons of one topic in a panel over the course page: the list and a new lesson. The editor of one lesson opens
 * as a popup above the panel, so the list stays where it was. The back arrow steps from the new-lesson form to the list;
 * the list closes the panel.
 */
export function TopicLessonsDrawer({ topic, onClose }: { topic: TopicOption; onClose: () => void }) {
  const [view, setView] = useState<View>({ kind: 'list' })
  const [lesson, setLesson] = useState<{ id: string; title: string } | null>(null)
  // The list loads again each time it comes back into view, so a change made in the editor or the form shows in it.
  const [listVersion, setListVersion] = useState(0)
  const creating = view.kind === 'create'
  const backToList = () => { setView({ kind: 'list' }); setListVersion((version) => version + 1) }
  return (
    <>
      <AdminDrawer
        backLabel="Về danh sách bài học"
        description={creating ? topic.name : `${topic.code} · Bài học của chủ đề`}
        onBack={creating ? backToList : undefined}
        onClose={onClose}
        resetScrollKey={view.kind}
        size="xl"
        title={creating ? 'Bài học mới' : topic.name}
      >
        {creating
          ? <NewLessonForm onCancel={backToList} onCreated={backToList} topicId={topic.id} />
          : <TopicLessonsPanel key={listVersion} onCreate={() => setView({ kind: 'create' })} onOpen={setLesson} topicId={topic.id} />}
      </AdminDrawer>
      {lesson ? (
        <LessonEditorModal
          fallbackTitle={lesson.title}
          lessonId={lesson.id}
          onClose={() => { setLesson(null); setListVersion((version) => version + 1) }}
          topicName={topic.name}
        />
      ) : null}
    </>
  )
}
