import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  Headphones,
  PenTool,
  Mic,
  ChevronDown,
  ChevronUp,
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

export const PracticeSidebar: React.FC<PracticeSidebarProps> = ({
  currentSkill,
  selectedPart,
  onSelectPart,
  formats,
  selectedFormats,
  onToggleFormat,
}) => {
  const [formatsOpen, setFormatsOpen] = useState(true)
  const config = PRACTICE_SKILL_CONFIG[currentSkill]

  return (
    <aside className="practice-white-sidebar">
      <div className="sidebar-brand-header">
        <div className="sidebar-brand-arch">
          <span className="arch-shape" />
        </div>
        <div>
          <h2 className="sidebar-brand-title">LUYỆN ĐỀ</h2>
          <p className="sidebar-brand-sub">The IELTS Space</p>
        </div>
      </div>

      <nav className="sidebar-skills-block" aria-label="Kỹ năng luyện đề">
        <div className="sidebar-section-label">KỸ NĂNG</div>

        {PRACTICE_SKILLS.map((skill) => {
          const { label } = PRACTICE_SKILL_CONFIG[skill]
          const Icon = SKILL_ICONS[skill]
          const active = currentSkill === skill
          return (
            <React.Fragment key={skill}>
              <Link
                to={`/practice-tests?skill=${skill}`}
                className={`${active ? 'skill-btn-primary' : 'skill-btn-normal'} sidebar-skill-link ${active ? 'active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={16} />
                  <span className="font-semibold text-sm">{label}</span>
                </div>
                {active ? <ChevronUp size={15} /> : <ChevronDown size={14} />}
              </Link>

              {active && (
                <div className="sidebar-reading-tree">
                  <div className="tree-group-header">
                    <span className="bullet-dot" />
                    <span className="font-medium text-xs text-slate-600">Bài lẻ</span>
                  </div>

                  <div className="tree-radio-options" role="radiogroup" aria-label={`Chọn ${config.partLabel}`}>
                    {config.parts.map((partNo) => (
                      <label
                        key={partNo}
                        className={`tree-radio-item ${selectedPart === partNo ? 'active' : ''}`}
                      >
                        <input
                          type="radio"
                          name="practice-part"
                          className="sr-only"
                          checked={selectedPart === partNo}
                          onChange={() => onSelectPart(partNo)}
                        />
                        <span className="radio-circle">
                          {selectedPart === partNo && <span className="radio-dot" />}
                        </span>
                        <span>{config.partLabel} {partNo}</span>
                      </label>
                    ))}
                  </div>

                  {config.hasFull && (
                    <label className={`tree-full-test ${selectedPart === 'full' ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="practice-part"
                        className="sr-only"
                        checked={selectedPart === 'full'}
                        onChange={() => onSelectPart('full')}
                      />
                      <span className="radio-circle">
                        {selectedPart === 'full' && <span className="radio-dot" />}
                      </span>
                      <span>Full đề</span>
                    </label>
                  )}

                </div>
              )}
            </React.Fragment>
          )
        })}
      </nav>

      <div className="sidebar-resources-block">
        <button
          type="button"
          className="sidebar-resources-header-btn"
          aria-expanded={formatsOpen}
          onClick={() => setFormatsOpen(!formatsOpen)}
        >
          <span className="sidebar-section-label">LOẠI CÂU HỎI</span>
          {formatsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
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
