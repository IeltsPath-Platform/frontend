import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  Headphones,
  PenTool,
  Mic,
  ChevronDown,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { SkillType } from '@/types/practice'
import { PRACTICE_SKILLS, PRACTICE_SKILL_CONFIG } from '../lib/practiceSkillConfig'
import type { PracticePart } from '../lib/practiceSkillConfig'
import { practiceFormatLabel } from '../lib/practiceFormatLabels'
import type { PracticeFormatCount } from '../reading/readingPracticeApi'

interface PracticeSidebarProps {
  currentSkill: SkillType
  selectedPart: PracticePart
  onSelectPart: (part: PracticePart) => void
  /** Question formats found in the library for the current skill. */
  formats: readonly PracticeFormatCount[]
  selectedFormats: readonly string[]
  onToggleFormat: (code: string) => void
}

const SKILL_ICONS: Record<SkillType, LucideIcon> = {
  reading: BookOpen,
  listening: Headphones,
  writing: PenTool,
  speaking: Mic,
}

/**
 * The filter column of the practice catalogue. Each skill is a row that drops down its parts (Section 1, Task 2, Full đề...):
 * choosing another skill opens its parts and folds the last one, and pressing the skill that is open folds or unfolds it.
 */
export const PracticeSidebar: React.FC<PracticeSidebarProps> = ({
  currentSkill,
  selectedPart,
  onSelectPart,
  formats,
  selectedFormats,
  onToggleFormat,
}) => {
  const [formatsOpen, setFormatsOpen] = useState(true)
  // The skill whose parts the learner folded by hand; going to another skill always opens that one.
  const [foldedSkill, setFoldedSkill] = useState<SkillType | null>(null)

  return (
    <aside className="practice-white-sidebar">
      <nav className="sidebar-skills-block" aria-label="Kỹ năng luyện đề">
        <h2 className="sidebar-section-label">Kỹ năng</h2>

        <ul className="sidebar-skill-list">
          {PRACTICE_SKILLS.map((skill) => {
            const config = PRACTICE_SKILL_CONFIG[skill]
            const Icon = SKILL_ICONS[skill]
            const active = currentSkill === skill
            const open = active && foldedSkill !== skill
            const panelId = `sidebar-parts-${skill}`
            const parts: readonly PracticePart[] = config.hasFull ? [...config.parts, 'full'] : config.parts
            const header = (
              <>
                <Icon className="sidebar-skill-icon" size={18} aria-hidden="true" />
                <span>{config.label}</span>
                <ChevronDown className="sidebar-skill-indicator sidebar-skill-chevron" size={16} aria-hidden="true" />
              </>
            )
            return (
              <li className={`sidebar-skill-item${active ? ' is-active' : ''}${open ? ' is-open' : ''}`} key={skill}>
                {active ? (
                  <button
                    type="button"
                    className="sidebar-skill-link active"
                    aria-controls={panelId}
                    aria-current="page"
                    aria-expanded={open}
                    onClick={() => setFoldedSkill(open ? skill : null)}
                  >
                    {header}
                  </button>
                ) : (
                  <Link
                    to={`/practice-tests?skill=${skill}`}
                    className="sidebar-skill-link"
                    onClick={() => setFoldedSkill(null)}
                  >
                    {header}
                  </Link>
                )}

                <div className="sidebar-skill-panel" id={panelId} role="group" aria-label={`Bài luyện ${config.label}`}>
                  <div className="sidebar-skill-panel__inner">
                    <div className="sidebar-part-options">
                      {parts.map((part) => (
                        <label className={`sidebar-part-option${part === 'full' ? ' sidebar-part-option-full' : ''}`} key={part}>
                          <input
                            type="radio"
                            name={`practice-part-${skill}`}
                            checked={active && selectedPart === part}
                            disabled={!active}
                            onChange={() => onSelectPart(part)}
                          />
                          <span>{part === 'full' ? 'Full đề' : `${config.partLabel} ${part}`}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="sidebar-resources-block">
        <button
          type="button"
          className="sidebar-resources-header-btn"
          aria-expanded={formatsOpen}
          onClick={() => setFormatsOpen(!formatsOpen)}
        >
          <span className="sidebar-section-label">Loại câu hỏi</span>
          <ChevronDown className={formatsOpen ? 'sidebar-filter-chevron is-open' : 'sidebar-filter-chevron'} size={16} aria-hidden="true" />
        </button>

        {formatsOpen && (
          formats.length === 0 ? (
            <p className="sidebar-formats-empty">Chưa có loại câu hỏi</p>
          ) : (
            <div className="resources-checkboxes-list" role="group" aria-label="Lọc theo loại câu hỏi">
              {formats.map((format) => (
                <label className="checkbox-item" key={format.code}>
                  <input
                    type="checkbox"
                    checked={selectedFormats.includes(format.code)}
                    onChange={() => onToggleFormat(format.code)}
                  />
                  <span className="checkbox-label">{practiceFormatLabel(format.code)}</span>
                </label>
              ))}
            </div>
          )
        )}
      </div>
    </aside>
  )
}
