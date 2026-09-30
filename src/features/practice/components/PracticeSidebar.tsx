import React, { useState } from 'react'
import {
  BookOpen,
  Headphones,
  PenTool,
  Mic,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import type { SkillType, ReadingSubcategory } from '@/types/practice'

interface PracticeSidebarProps {
  currentSkill: SkillType
  onSelectSkill: (skill: SkillType) => void
  currentReadingSub: ReadingSubcategory
  onSelectReadingSub: (sub: ReadingSubcategory) => void
  selectedResources: string[]
  onToggleResource: (res: string) => void
}

export const PracticeSidebar: React.FC<PracticeSidebarProps> = ({
  currentSkill,
  onSelectSkill,
  currentReadingSub,
  onSelectReadingSub,
  selectedResources,
  onToggleResource,
}) => {
  const [readingOpen, setReadingOpen] = useState(true)
  const [resourcesOpen, setResourcesOpen] = useState(true)

  return (
    <aside className="practice-white-sidebar">
      {/* Header inside sidebar */}
      <div className="sidebar-brand-header">
        <div className="sidebar-brand-arch">
          <span className="arch-shape" />
        </div>
        <div>
          <h2 className="sidebar-brand-title">LUYỆN ĐỀ</h2>
          <p className="sidebar-brand-sub">The IELTS Space</p>
        </div>
      </div>

      {/* KỸ NĂNG SECTION */}
      <div className="sidebar-skills-block">
        <div className="sidebar-section-label">KỸ NĂNG</div>

        {/* Reading Button */}
        <button
          type="button"
          className={`skill-btn-primary ${currentSkill === 'reading' ? 'active' : ''}`}
          onClick={() => {
            onSelectSkill('reading')
            setReadingOpen(!readingOpen)
          }}
        >
          <div className="flex items-center gap-2.5">
            <BookOpen size={16} />
            <span className="font-semibold text-sm">Reading</span>
          </div>
          {readingOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>

        {/* Subtree when Reading is open */}
        {readingOpen && (
          <div className="sidebar-reading-tree">
            <div className="tree-group-header">
              <span className="bullet-dot" />
              <span className="font-medium text-xs text-slate-600">Bài lẻ</span>
            </div>

            <div className="tree-radio-options">
              <label
                className={`tree-radio-item ${
                  currentReadingSub === 'passage-1' ? 'active' : ''
                }`}
                onClick={() => onSelectReadingSub('passage-1')}
              >
                <span className="radio-circle">
                  {currentReadingSub === 'passage-1' && <span className="radio-dot" />}
                </span>
                <span>Passage 1</span>
              </label>

              <label
                className={`tree-radio-item ${
                  currentReadingSub === 'passage-2' ? 'active' : ''
                }`}
                onClick={() => onSelectReadingSub('passage-2')}
              >
                <span className="radio-circle">
                  {currentReadingSub === 'passage-2' && <span className="radio-dot" />}
                </span>
                <span>Passage 2</span>
              </label>

              <label
                className={`tree-radio-item ${
                  currentReadingSub === 'passage-3' ? 'active' : ''
                }`}
                onClick={() => onSelectReadingSub('passage-3')}
              >
                <span className="radio-circle">
                  {currentReadingSub === 'passage-3' && <span className="radio-dot" />}
                </span>
                <span>Passage 3</span>
              </label>
            </div>

            <div
              className={`tree-full-test ${
                currentReadingSub === 'full-test' ? 'active' : ''
              }`}
              onClick={() => onSelectReadingSub('full-test')}
            >
              <span className="radio-circle">
                {currentReadingSub === 'full-test' && <span className="radio-dot" />}
              </span>
              <span>Full đề</span>
            </div>
          </div>
        )}

        {/* Other skills: Listening, Writing, Speaking */}
        <div className="sidebar-other-skills">
          <button
            type="button"
            className={`skill-btn-normal ${currentSkill === 'listening' ? 'active' : ''}`}
            onClick={() => onSelectSkill('listening')}
          >
            <div className="flex items-center gap-2.5">
              <Headphones size={16} />
              <span>Listening</span>
            </div>
            <ChevronDown size={14} />
          </button>

          <button
            type="button"
            className={`skill-btn-normal ${currentSkill === 'writing' ? 'active' : ''}`}
            onClick={() => onSelectSkill('writing')}
          >
            <div className="flex items-center gap-2.5">
              <PenTool size={16} />
              <span>Writing</span>
            </div>
            <ChevronDown size={14} />
          </button>

          <button
            type="button"
            className={`skill-btn-normal ${currentSkill === 'speaking' ? 'active' : ''}`}
            onClick={() => onSelectSkill('speaking')}
          >
            <div className="flex items-center gap-2.5">
              <Mic size={16} />
              <span>Speaking</span>
            </div>
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* NGUỒN TÀI LIỆU SECTION */}
      <div className="sidebar-resources-block">
        <button
          type="button"
          className="sidebar-resources-header-btn"
          onClick={() => setResourcesOpen(!resourcesOpen)}
        >
          <span className="sidebar-section-label">NGUỒN TÀI LIỆU</span>
          {resourcesOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {resourcesOpen && (
          <div className="resources-checkboxes-list">
            <label className="checkbox-item">
              <input
                type="checkbox"
                checked={selectedResources.includes('ielts-space-pro')}
                onChange={() => onToggleResource('ielts-space-pro')}
              />
              <span className="checkbox-label">The IELTS Space PRO</span>
              <span className="pro-badge-pill">PRO</span>
            </label>

            <label className="checkbox-item">
              <input
                type="checkbox"
                checked={selectedResources.includes('c10-c20')}
                onChange={() => onToggleResource('c10-c20')}
              />
              <span className="checkbox-label">C10-C20</span>
            </label>

            <label className="checkbox-item">
              <input
                type="checkbox"
                checked={selectedResources.includes('actual-tests')}
                onChange={() => onToggleResource('actual-tests')}
              />
              <span className="checkbox-label">Actual Tests</span>
            </label>

            <label className="checkbox-item">
              <input
                type="checkbox"
                checked={selectedResources.includes('other')}
                onChange={() => onToggleResource('other')}
              />
              <span className="checkbox-label">Các nguồn khác</span>
            </label>
          </div>
        )}
      </div>
    </aside>
  )
}
