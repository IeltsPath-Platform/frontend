import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp, Pencil, Plus } from 'lucide-react'
import type { TopicOption } from '../../lessons/types'
import { updateTopic } from '../api/courseApi'
import { SKILL_LABEL, type Course } from '../types'
import { TopicForm } from './TopicForm'
import { topicError, topicUpdate } from '../lib/topicHelpers'

export function TopicTree({ topics, allTopics, courses, courseId, onSaved, onError }: {
  topics: TopicOption[]; allTopics: TopicOption[]; courses: Course[]; courseId: string | null; onSaved: () => void; onError: (message: string | null) => void
}) {
  const [editing, setEditing] = useState<{ topic?: TopicOption; parentId: string | null } | null>(null)
  const [busy, setBusy] = useState(false)
  const ids = new Set(topics.map((topic) => topic.id))

  async function move(topic: TopicOption, sibling: TopicOption) {
    if (busy) return
    setBusy(true)
    onError(null)
    try {
      await updateTopic(topic.id, { ...topicUpdate(topic), sortOrder: sibling.sortOrder })
      await updateTopic(sibling.id, { ...topicUpdate(sibling), sortOrder: topic.sortOrder })
    } catch (reason) { onError(topicError(reason)) } finally { setBusy(false); onSaved() }
  }

  function list(parentId: string | null, ancestors: Set<string>) {
    const siblings = topics.filter((topic) => parentId === null ? !topic.parentTopicId || !ids.has(topic.parentTopicId) : topic.parentTopicId === parentId)
      .filter((topic) => !ancestors.has(topic.id)).sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code))
    if (!siblings.length) return null
    return <ul className="adm-topic-tree">{siblings.map((topic, index) => <li key={topic.id}>
      <article className="adm-topic-node" aria-label={topic.name}>
        <div className="adm-author-actions"><code>{topic.code}</code><strong>{topic.name}</strong><span className={`adm-badge ${topic.status === 'ACTIVE' ? 'adm-badge--ok' : 'adm-badge--muted'}`}>{topic.status === 'ACTIVE' ? 'Đang dùng' : 'Ngừng dùng'}</span></div>
        <p className="adm-muted"><span className={`adm-topic-skill adm-topic-skill--${topic.skill?.toLowerCase() ?? 'none'}`}>{topic.skill ? SKILL_LABEL[topic.skill as keyof typeof SKILL_LABEL] ?? topic.skill : 'Chưa chọn kỹ năng'}</span> · Band {topic.bandMin ?? 'không giới hạn'} – {topic.bandMax ?? 'không giới hạn'}</p>
        <div className="adm-author-actions">
          <button className="adm-btn" type="button" disabled={busy || index === 0} aria-label={`Đưa ${topic.name} lên`} onClick={() => void move(topic, siblings[index - 1]!)}><ArrowUp aria-hidden="true" size={16} /></button>
          <button className="adm-btn" type="button" disabled={busy || index === siblings.length - 1} aria-label={`Đưa ${topic.name} xuống`} onClick={() => void move(topic, siblings[index + 1]!)}><ArrowDown aria-hidden="true" size={16} /></button>
          <button className="adm-btn" type="button" disabled={busy} aria-label={`Sửa ${topic.name}`} onClick={() => setEditing({ topic, parentId: topic.parentTopicId ?? null })}><Pencil aria-hidden="true" size={16} /> Sửa</button>
          <button className="adm-btn" type="button" disabled={busy} onClick={() => setEditing({ parentId: topic.id })}><Plus aria-hidden="true" size={16} /> Thêm chủ đề con</button>
          <Link className="adm-btn" to={`/content-author/lessons?topicId=${encodeURIComponent(topic.id)}`}>Mở bài học</Link>
        </div>
        {editing && (editing.topic?.id === topic.id || (!editing.topic && editing.parentId === topic.id)) ? form() : null}
      </article>
      {list(topic.id, new Set([...ancestors, topic.id]))}
    </li>)}</ul>
  }
  function form() {
    return editing ? <TopicForm key={editing.topic?.id ?? `new-${editing.parentId}`} topic={editing.topic} parentId={editing.parentId} courseId={courseId} courses={courses} topics={allTopics} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); onSaved() }} /> : null
  }
  return <>
    <button className="adm-btn" type="button" disabled={busy} onClick={() => setEditing({ parentId: null })}><Plus aria-hidden="true" size={16} /> Thêm chủ đề cấp đầu</button>
    {editing && !editing.topic && editing.parentId === null ? form() : null}
    {!topics.length ? <p className="adm-muted">Chưa có chủ đề. Thêm chủ đề cấp đầu để bắt đầu.</p> : list(null, new Set())}
  </>
}
