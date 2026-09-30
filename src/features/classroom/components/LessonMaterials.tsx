import { ChevronDown, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import type { LessonMaterialSection } from '@/types/lesson'

interface LessonMaterialsProps {
  title: string
  materials: readonly LessonMaterialSection[]
}

export function LessonMaterials({ title, materials }: LessonMaterialsProps) {
  const [openSection, setOpenSection] = useState(materials[0]?.id ?? '')

  return (
    <section className="lesson-content-card lesson-materials" aria-labelledby="lesson-materials-heading">
      <div className="lesson-content-heading"><p className="lesson-content-kicker">Tài liệu buổi học / Lesson Summary</p><h1 id="lesson-materials-heading">{title}</h1></div>
      <div className="lesson-material-list">
        {materials.map((section) => {
          const isOpen = openSection === section.id
          return (
            <section key={section.id} className={`lesson-material-section${isOpen ? ' is-open' : ''}`}>
              <button type="button" className="lesson-material-trigger" aria-expanded={isOpen} aria-controls={`lesson-section-${section.id}`} onClick={() => setOpenSection((current) => current === section.id ? '' : section.id)}>
                <span><strong>{section.title}</strong><small>{section.description}</small></span><ChevronDown aria-hidden="true" size={18} />
              </button>
              {isOpen && <div id={`lesson-section-${section.id}`} className="lesson-material-content"><ul>{section.items.map((item) => <li key={item}><CheckCircle2 aria-hidden="true" size={16} />{item}</li>)}</ul></div>}
            </section>
          )
        })}
      </div>
      <footer className="lesson-material-footer"><CheckCircle2 aria-hidden="true" size={17} /><span>Tài liệu đang được lưu trong phiên học của bạn.</span></footer>
    </section>
  )
}
