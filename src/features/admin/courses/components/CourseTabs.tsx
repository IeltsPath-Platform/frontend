import { useRef, type KeyboardEvent } from 'react'
import type { TopicOption } from '../../lessons/types'
import type { Course } from '../types'

export const UNASSIGNED_TAB = 'unassigned'

/**
 * One tab per course, plus one for topics that belong to no course. The tabs scroll sideways on a narrow screen, so
 * the page itself never does. Arrow keys, Home and End move between tabs and select the one they land on.
 */
export function CourseTabs({ courses, topics, selectedId, onSelect, panelId }: {
  courses: readonly Course[]
  topics: readonly TopicOption[]
  selectedId: string
  onSelect: (id: string) => void
  panelId: string
}) {
  const refs = useRef(new Map<string, HTMLButtonElement>())
  const tabs = [
    ...courses.map((course) => ({
      id: course.id,
      name: course.name,
      detail: `Band ${course.bandLevel.toFixed(1)}${course.status === 'ACTIVE' ? '' : ' · Ngừng dùng'}`,
      count: topics.filter((topic) => topic.courseId === course.id).length,
      muted: course.status !== 'ACTIVE',
    })),
    { id: UNASSIGNED_TAB, name: 'Chưa gán khóa', detail: 'Chủ đề lẻ', count: topics.filter((topic) => !topic.courseId).length, muted: false },
  ]

  function move(event: KeyboardEvent, index: number) {
    const last = tabs.length - 1
    const target = event.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : event.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
        : event.key === 'Home' ? 0
          : event.key === 'End' ? last : null
    if (target === null) return
    event.preventDefault()
    const next = tabs[target]!
    onSelect(next.id)
    refs.current.get(next.id)?.focus()
  }

  return (
    <div aria-label="Khóa học" className="adm-course-tabs" role="tablist">
      {tabs.map((tab, index) => {
        const selected = tab.id === selectedId
        return (
          <button
            aria-controls={panelId}
            aria-selected={selected}
            className={`adm-course-tab${selected ? ' is-selected' : ''}${tab.muted ? ' is-muted' : ''}`}
            id={`course-tab-${tab.id}`}
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            onKeyDown={(event) => move(event, index)}
            ref={(element) => { if (element) refs.current.set(tab.id, element); else refs.current.delete(tab.id) }}
            role="tab"
            tabIndex={selected ? 0 : -1}
            type="button"
          >
            <span className="adm-course-tab__name">{tab.name}</span>
            <span className="adm-course-tab__detail">{tab.detail}</span>
            <span aria-label={`${tab.count} chủ đề`} className="adm-course-tab__count">{tab.count}</span>
          </button>
        )
      })}
    </div>
  )
}
