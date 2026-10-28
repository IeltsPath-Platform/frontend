import React from 'react'
import type { LearningOrbitSkill } from '@/types/overview'
import type { BandSummary } from '../overviewViewModel'

interface OverviewLearningOrbitProps {
  skills: LearningOrbitSkill[]
  band: BandSummary
}

export const OverviewLearningOrbit: React.FC<OverviewLearningOrbitProps> = ({ skills, band }) => (
  <section className="learning-orbit-card">
    <div className="orbit-card-header">
      <h2 className="orbit-title">My Learning Orbit</h2>
      <p className="orbit-subtitle">Mức nắm vững từng kỹ năng, tính từ các bài bạn đã làm</p>
    </div>

    <div className="orbit-diagram-container">
      <div className="orbit-center-planet">
        <span className="center-tag">BAND HIỆN TẠI{band.currentIsEstimate ? ' (ƯỚC TÍNH)' : ''}</span>
        <span className="center-band-number">{band.current === null ? '—' : band.current.toFixed(1)}</span>
        <span className="center-target-label">{band.target === null ? 'Chưa đặt mục tiêu' : `Mục tiêu: ${band.target.toFixed(1)} IELTS`}</span>
      </div>

      <div className="orbit-skills-grid">
        {skills.map((skill) => {
          const color = skill.badgeType
          return (
            <div key={skill.name} className={`orbit-skill-box box-${skill.name.toLowerCase()}`}>
              <div className="skill-box-header">
                <div className="flex items-center gap-1.5">
                  <span className={`skill-color-dot dot-${color}`} />
                  <h3 className="skill-name">{skill.name}</h3>
                </div>
                <span className="skill-band-badge">{skill.band === null ? '—' : skill.band.toFixed(1)} <small>band</small></span>
              </div>
              <div className={`skill-focus-pill pill-${color}`}>{skill.badgeText}</div>
              <div className="skill-progress-bar">
                <div className={`bar-fill fill-${color}`} style={{ width: `${skill.percent}%` }} />
              </div>
              <span className="skill-progress-percent">{skill.percent}%</span>
              <div className="skill-subparts-list">
                {skill.details.map((detail) => (
                  <div key={detail.label} className="subpart-row"><span>{detail.label}</span><strong>{detail.score}</strong></div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  </section>
)
