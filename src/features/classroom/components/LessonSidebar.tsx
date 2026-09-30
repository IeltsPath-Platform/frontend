import { BookOpenText, ClipboardCheck, FileText, GraduationCap, MessageCircleMore, PenLine, Sparkles } from 'lucide-react'
import type { LessonWorkspaceView } from '@/types/lesson'

interface LessonSidebarProps {
  activeView: LessonWorkspaceView
  onChangeView: (view: LessonWorkspaceView) => void
}

const resourceLinks: ReadonlyArray<{ label: string; view: LessonWorkspaceView; icon: typeof FileText }> = [
  { label: 'Slide bài giảng', view: 'materials', icon: FileText },
  { label: 'Lesson Summary', view: 'materials', icon: BookOpenText },
  { label: 'Từ vựng buổi học', view: 'vocabulary', icon: Sparkles },
]

const homeworkLinks: ReadonlyArray<{ label: string; view: LessonWorkspaceView; icon: typeof PenLine; progress: string }> = [
  { label: 'Ngữ pháp', view: 'quiz', icon: PenLine, progress: '0%' },
  { label: 'Từ vựng', view: 'vocabulary', icon: BookOpenText, progress: '35%' },
  { label: 'Quick Test tổng hợp', view: 'quiz', icon: ClipboardCheck, progress: '100%' },
]

export function LessonSidebar({ activeView, onChangeView }: LessonSidebarProps) {
  return (
    <aside className="lesson-sidebar" aria-label="Tài nguyên và bài tập buổi học">
      <section className="lesson-sidebar-section" aria-labelledby="lesson-resource-heading">
        <p id="lesson-resource-heading" className="lesson-sidebar-label">LESSON RESOURCE</p>
        <nav className="lesson-sidebar-links" aria-label="Tài nguyên buổi học">
          {resourceLinks.map(({ label, view, icon: Icon }) => (
            <button key={label} type="button" className={`lesson-sidebar-link${activeView === view ? ' is-active' : ''}`} aria-current={activeView === view ? 'page' : undefined} onClick={() => onChangeView(view)}>
              <Icon aria-hidden="true" size={16} /><span>{label}</span>
            </button>
          ))}
        </nav>
      </section>

      <section className="lesson-sidebar-section" aria-labelledby="lesson-homework-heading">
        <div className="lesson-sidebar-title-row"><p id="lesson-homework-heading" className="lesson-sidebar-label">HOMEWORK HUB</p><span>2 / 4</span></div>
        <nav className="lesson-sidebar-links" aria-label="Bài tập buổi học">
          {homeworkLinks.map(({ label, view, icon: Icon, progress }) => (
            <button key={label} type="button" className={`lesson-sidebar-link lesson-homework-link${activeView === view ? ' is-active' : ''}`} aria-current={activeView === view ? 'page' : undefined} onClick={() => onChangeView(view)}>
              <Icon aria-hidden="true" size={16} /><span>{label}</span><small>{progress}</small>
            </button>
          ))}
        </nav>
      </section>

      <section className="lesson-sidebar-section lesson-sidebar-skills" aria-labelledby="lesson-skills-heading">
        <p id="lesson-skills-heading" className="lesson-sidebar-label">IELTS SKILLS</p>
        <p className="lesson-sidebar-link lesson-sidebar-note"><GraduationCap aria-hidden="true" size={16} /><span>Luyện kỹ năng được mở sau khi hoàn thành bài tập.</span></p>
      </section>

      <section className="lesson-mentor-card" aria-label="Mentor của bạn">
        <div className="lesson-mentor-avatar" aria-hidden="true">L</div>
        <div><p>Mentor của bạn</p><strong>Ms. Lan</strong><span>IELTS Instructor</span></div>
        <span className="lesson-mentor-message" aria-label="Hỗ trợ của Mentor sắp mở"><MessageCircleMore aria-hidden="true" size={17} /></span>
      </section>
    </aside>
  )
}
