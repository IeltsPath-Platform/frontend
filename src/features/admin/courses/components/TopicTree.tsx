import { useState, type CSSProperties } from 'react'
import { ArrowDown, ArrowUp, Ban, BookOpen, ChevronRight, Pencil, RotateCcw } from 'lucide-react'
import { AdminDrawer } from '../../components/AdminLayer'
import { useAdminConfirm } from '../../lib/useAdminConfirm'
import { TopicLessonsDrawer } from '../../lessons/components/TopicLessonsDrawer'
import type { TopicOption } from '../../lessons/types'
import { reorderTopics, updateTopic } from '../api/courseApi'
import { SKILL_LABEL, type Course } from '../types'
import { TopicForm } from './TopicForm'
import { TopicRowMenu } from './TopicRowMenu'
import { bandText, swappedGroup, topicError, topicUpdate } from '../lib/topicHelpers'

export function TopicTree({ topics, allTopics, courses, courseId, onSaved, onError, loading, creating, onCreateClosed }: {
  topics: TopicOption[]; allTopics: TopicOption[]; courses: Course[]; courseId: string | null; onSaved: () => void; onError: (message: string | null) => void; loading: boolean
  /** The page asks for a new topic from its header button; the form opens here, next to the other topic forms. */
  creating: boolean; onCreateClosed: () => void
}) {
  const [editing, setEditing] = useState<{ topic?: TopicOption } | null>(null)
  const [lessonsOf, setLessonsOf] = useState<TopicOption | null>(null)
  const { confirm, confirmDialog } = useAdminConfirm()
  const [busy, setBusy] = useState(false)
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const ids = new Set(topics.map((topic) => topic.id))
  const locked = busy || loading || !!editing || creating

  /** Swaps two neighbours and sends the whole group of the parent, which the server numbers in one transaction. */
  async function move(topic: TopicOption, sibling: TopicOption) {
    if (locked) return
    setBusy(true)
    onError(null)
    try {
      await reorderTopics(topic.parentTopicId ?? null, swappedGroup(allTopics, topic, sibling))
    } catch (reason) {
      onError(`Không đổi được thứ tự. ${topicError(reason)} Kiểm tra lại thứ tự trong danh sách trước khi thử lại.`)
    } finally { setBusy(false); onSaved() }
  }

  /**
   * Topics are never deleted: a lesson goes with its topic and learners' progress points at those lessons. Stopping a
   * topic hides it from learners and keeps everything, and it can be taken up again.
   */
  async function setStatus(topic: TopicOption, status: Course['status']) {
    if (locked) return
    if (status === 'INACTIVE' && !(await confirm({
      title: 'Ngừng dùng chủ đề?',
      message: `Học viên sẽ không còn thấy “${topic.name}”. Bài học và dữ liệu vẫn được giữ, bạn có thể dùng lại sau.`,
      confirmLabel: 'Ngừng dùng',
      tone: 'danger',
    }))) return
    setBusy(true)
    onError(null)
    try {
      await updateTopic(topic.id, { ...topicUpdate(topic), status })
    } catch (reason) {
      onError(`Không đổi được trạng thái của “${topic.name}”. ${topicError(reason)}`)
    } finally { setBusy(false); onSaved() }
  }

  function toggle(id: string) {
    setCollapsed((current) => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  function list(parentId: string | null, ancestors: Set<string>, depth: number) {
    const siblings = topics.filter((topic) => parentId === null ? !topic.parentTopicId || !ids.has(topic.parentTopicId) : topic.parentTopicId === parentId)
      .filter((topic) => !ancestors.has(topic.id)).sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code))
    if (!siblings.length) return null
    return <ul className="adm-topic-tree">{siblings.map((topic) => {
      const peers = siblings.filter((item) => (item.parentTopicId ?? null) === (topic.parentTopicId ?? null))
      const index = peers.findIndex((item) => item.id === topic.id)
      const childCount = topics.filter((item) => item.parentTopicId === topic.id && !ancestors.has(item.id) && item.id !== topic.id).length
      const open = !collapsed.has(topic.id)
      const skill = topic.skill ? SKILL_LABEL[topic.skill as keyof typeof SKILL_LABEL] ?? topic.skill : null
      const active = topic.status === 'ACTIVE'
      return <li key={topic.id}>
        <article aria-label={topic.name} className={`adm-topic-node adm-topic-node--${topic.skill?.toLowerCase() ?? 'none'}`} style={{ '--depth': depth } as CSSProperties}>
          <div className="adm-topic-name">
            {childCount > 0
              ? <button aria-expanded={open} aria-label={`${open ? 'Thu gọn' : 'Mở rộng'} ${topic.name}`} className="adm-topic-toggle" onClick={() => toggle(topic.id)} type="button"><ChevronRight aria-hidden="true" size={18} /></button>
              : <span aria-hidden="true" className={`adm-topic-toggle adm-topic-toggle--leaf${depth > 0 ? ' has-elbow' : ''}`} />}
            <div className="adm-topic-title">
              <strong>{topic.name}</strong>
              <span className="adm-topic-sub"><code>{topic.code}</code>{childCount > 0 ? <span>{childCount} chủ đề con</span> : null}</span>
            </div>
          </div>
          <div className="adm-topic-meta">
            <span className={`adm-topic-skill adm-topic-skill--${topic.skill?.toLowerCase() ?? 'none'}`}>{skill ?? 'Chưa chọn kỹ năng'}</span>
            <span className="adm-topic-band">{bandText(topic.bandMin, topic.bandMax)}</span>
            <span className={`adm-badge ${active ? 'adm-badge--ok' : 'adm-badge--muted'}`}>{active ? 'Đang dùng' : 'Ngừng dùng'}</span>
          </div>
          <div className="adm-topic-actions">
            <button className="adm-btn adm-topic-open" disabled={locked} onClick={() => setLessonsOf(topic)} type="button"><BookOpen aria-hidden="true" size={16} /> Mở bài học</button>
            <TopicRowMenu label={topic.name} disabled={locked} items={[
              { key: 'edit', label: 'Sửa chủ đề', icon: <Pencil aria-hidden="true" size={16} />, onSelect: () => setEditing({ topic }) },
              { key: 'up', label: 'Đưa lên', icon: <ArrowUp aria-hidden="true" size={16} />, separated: true, disabled: index === 0, onSelect: () => void move(topic, peers[index - 1]!) },
              { key: 'down', label: 'Đưa xuống', icon: <ArrowDown aria-hidden="true" size={16} />, disabled: index === peers.length - 1, onSelect: () => void move(topic, peers[index + 1]!) },
              active
                ? { key: 'stop', label: 'Ngừng dùng', icon: <Ban aria-hidden="true" size={16} />, separated: true, danger: true, onSelect: () => void setStatus(topic, 'INACTIVE') }
                : { key: 'resume', label: 'Dùng lại', icon: <RotateCcw aria-hidden="true" size={16} />, separated: true, onSelect: () => void setStatus(topic, 'ACTIVE') },
            ]} />
          </div>
        </article>
        {open ? list(topic.id, new Set([...ancestors, topic.id]), depth + 1) : null}
      </li>
    })}</ul>
  }

  /** One drawer for the topic form, whichever row opened it. New topics are always top level; see TopicForm. */
  function drawer() {
    const form = editing ?? (creating ? {} : null)
    if (!form) return null
    return <AdminDrawer title={form.topic ? 'Sửa chủ đề' : 'Tạo chủ đề'} description={form.topic?.code} onClose={() => { if (editing) setEditing(null); else onCreateClosed() }}>
      {(close) => <TopicForm key={form.topic?.id ?? 'new'} topic={form.topic} parentId={form.topic?.parentTopicId ?? null} courseId={courseId} courses={courses} topics={allTopics} onCancel={close} onSaved={() => { onSaved(); close() }} />}
    </AdminDrawer>
  }

  return <>
    {drawer()}
    {confirmDialog}
    {lessonsOf ? <TopicLessonsDrawer topic={lessonsOf} onClose={() => setLessonsOf(null)} /> : null}
    <section aria-label="Danh sách chủ đề" className="adm-topic-section">
      {!topics.length
        ? <p className="adm-topic-empty">Khóa này chưa có chủ đề. Bấm “Thêm chủ đề” ở trên để bắt đầu.</p>
        : <div className="adm-topic-table">
          <div aria-hidden="true" className="adm-topic-head"><span>Chủ đề</span><span>Kỹ năng</span><span>Band</span><span>Trạng thái</span><span /></div>
          {list(null, new Set(), 0)}
        </div>}
    </section>
  </>
}
