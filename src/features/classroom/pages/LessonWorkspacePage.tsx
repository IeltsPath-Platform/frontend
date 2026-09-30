import { BookOpenText } from 'lucide-react'
import { useParams, useSearchParams } from 'react-router-dom'
import { SiteNavbar } from '@/components/SiteNavbar'
import { VocabularyCollection } from '@/features/vocabulary/components/VocabularyCollection'
import { getLessonWorkspaceData } from '@/mocks/lessonData'
import type { LessonWorkspaceView } from '@/types/lesson'
import { LessonMaterials } from '../components/LessonMaterials'
import { LessonQuiz } from '../components/LessonQuiz'
import { LessonSidebar } from '../components/LessonSidebar'
import '../lesson-workspace.css'

function getWorkspaceView(value: string | null): LessonWorkspaceView {
  if (value === 'quiz' || value === 'vocabulary') return value
  return 'materials'
}

export function LessonWorkspacePage() {
  const { lessonId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeView = getWorkspaceView(searchParams.get('view'))
  const lesson = getLessonWorkspaceData(lessonId)

  function changeView(view: LessonWorkspaceView) {
    setSearchParams(view === 'materials' ? {} : { view })
  }

  return (
    <div className="lesson-workspace-page">
      <a className="skip-link" href="#lesson-main-content">Đi tới nội dung buổi học</a>
      <SiteNavbar />
      <header className="lesson-context-header">
        <div className="lesson-context-shell">
          <div className="lesson-context-copy">
            <div className="lesson-context-pills"><span>Buổi {lesson.sessionNumber}</span><span>{lesson.level}</span></div>
            <p>{lesson.title}</p>
            <small><BookOpenText aria-hidden="true" size={15} /> Cùng học tốt hơn</small>
          </div>
          <section className="lesson-context-progress" aria-label="Tiến độ khoá học">
            <div><span>Tiến độ Homework Hub</span><strong>68%</strong></div>
            <div className="lesson-context-progress-track" role="progressbar" aria-label="Đã hoàn thành 68 phần trăm" aria-valuemin={0} aria-valuemax={100} aria-valuenow={68}><i /></div>
            <small>Hoàn thành 8 / 12 bài tập</small>
          </section>
        </div>
      </header>
      <main id="lesson-main-content" className="lesson-workspace-main" tabIndex={-1}>
        <div className="lesson-workspace-layout">
          <div className="lesson-workspace-content">
            {activeView === 'materials' && <LessonMaterials title={lesson.title} materials={lesson.materials} />}
            {activeView === 'quiz' && <LessonQuiz title={lesson.title} questions={lesson.quizQuestions} />}
            {activeView === 'vocabulary' && (
              <section className="lesson-content-card lesson-vocabulary-panel">
                <VocabularyCollection
                  entries={lesson.vocabulary}
                  eyebrow="Homework Hub / Từ vựng"
                  title={lesson.title}
                  description={`Ôn từ vựng theo chủ đề ${lesson.topic} và lưu lại các từ cần nhớ.`}
                />
              </section>
            )}
          </div>
          <LessonSidebar activeView={activeView} onChangeView={changeView} />
        </div>
      </main>
    </div>
  )
}
