import React from 'react'
import type { LearningOrbitSkill } from '@/types/overview'

interface OverviewLearningOrbitProps {
  skills: Record<string, LearningOrbitSkill>
}

export const OverviewLearningOrbit: React.FC<OverviewLearningOrbitProps> = () => {
  return (
    <section className="learning-orbit-card">
      <div className="orbit-card-header">
        <h2 className="orbit-title">My Learning Orbit</h2>
        <p className="orbit-subtitle">Cùng xem "hành tinh" của riêng bạn nhé!</p>
      </div>

      <div className="orbit-diagram-container">
        {/* Concentric Orbital Rings background */}
        <div className="orbit-ring ring-1" />
        <div className="orbit-ring ring-2" />
        <div className="orbit-ring ring-3" />

        {/* Central Planet */}
        <div className="orbit-center-planet">
          <span className="center-tag">BAND HIỆN TẠI</span>
          <span className="center-band-number">6.5</span>
          <span className="center-target-label">Mục tiêu: 7.5 IELTS</span>
        </div>

        {/* 4 Orbit Skill Cards */}
        <div className="orbit-skills-grid">
          {/* Top-Left: Listening */}
          <div className="orbit-skill-box box-listening">
            <div className="skill-box-header">
              <div className="flex items-center gap-1.5">
                <span className="skill-color-dot dot-red" />
                <h3 className="skill-name">Listening</h3>
              </div>
              <span className="skill-band-badge">5.0 <small>band</small></span>
            </div>
            <div className="skill-focus-pill pill-red">PRIORITY FOCUS</div>
            <div className="skill-progress-bar">
              <div className="bar-fill fill-red" style={{ width: '70%' }} />
            </div>
            <span className="skill-progress-percent">70%</span>
            <div className="skill-subparts-list">
              <div className="subpart-row"><span>Part 1</span><strong>5/10</strong></div>
              <div className="subpart-row"><span>Part 2</span><strong>5/10</strong></div>
              <div className="subpart-row"><span>Part 3</span><strong>5/10</strong></div>
              <div className="subpart-row"><span>Part 4</span><strong>5/10</strong></div>
            </div>
          </div>

          {/* Top-Right: Reading */}
          <div className="orbit-skill-box box-reading">
            <div className="skill-box-header">
              <div className="flex items-center gap-1.5">
                <span className="skill-color-dot dot-green" />
                <h3 className="skill-name">Reading</h3>
              </div>
              <span className="skill-band-badge">5.5 <small>band</small></span>
            </div>
            <div className="skill-focus-pill pill-green">PRIORITY FOCUS</div>
            <div className="skill-progress-bar">
              <div className="bar-fill fill-green" style={{ width: '65%' }} />
            </div>
            <span className="skill-progress-percent">65%</span>
            <div className="skill-subparts-list">
              <div className="subpart-row"><span>Part 1</span></div>
              <div className="subpart-row"><span>Part 2</span></div>
              <div className="subpart-row"><span>Part 3</span></div>
            </div>
          </div>

          {/* Bottom-Left: Writing */}
          <div className="orbit-skill-box box-writing">
            <div className="skill-box-header">
              <div className="flex items-center gap-1.5">
                <span className="skill-color-dot dot-orange" />
                <h3 className="skill-name">Writing</h3>
              </div>
              <span className="skill-band-badge">5.5 <small>band</small></span>
            </div>
            <div className="skill-focus-pill pill-orange">IMPROVE</div>
            <div className="skill-progress-bar">
              <div className="bar-fill fill-orange" style={{ width: '55%' }} />
            </div>
            <span className="skill-progress-percent">55%</span>
            <div className="skill-subparts-list">
              <div className="subpart-row"><span>Task Achievement/Response</span></div>
              <div className="subpart-row"><span>Coherence & Cohesion</span></div>
              <div className="subpart-row"><span>Lexical Resource</span></div>
              <div className="subpart-row"><span>Grammatical Range & Accuracy</span></div>
            </div>
          </div>

          {/* Bottom-Right: Speaking */}
          <div className="orbit-skill-box box-speaking">
            <div className="skill-box-header">
              <div className="flex items-center gap-1.5">
                <span className="skill-color-dot dot-blue" />
                <h3 className="skill-name">Speaking</h3>
              </div>
              <span className="skill-band-badge">5.5 <small>band</small></span>
            </div>
            <div className="skill-focus-pill pill-blue">IMPROVE</div>
            <div className="skill-progress-bar">
              <div className="bar-fill fill-blue" style={{ width: '55%' }} />
            </div>
            <span className="skill-progress-percent">55%</span>
            <div className="skill-subparts-list">
              <div className="subpart-row"><span>Fluency & Coherence</span></div>
              <div className="subpart-row"><span>Lexical Resource</span></div>
              <div className="subpart-row"><span>Grammatical Range & Accuracy</span></div>
              <div className="subpart-row"><span>Pronunciation</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
