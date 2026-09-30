import React, { useState } from 'react'
import {
  MOCK_SKILL_PROGRESS,
  MOCK_MY_COURSES,
} from '@/mocks/overviewData'

export const OverviewDetailedStats: React.FC = () => {
  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | 'course'>('week')
  const [selectedForwardSkill, setSelectedForwardSkill] = useState<'Overall' | 'Listening' | 'Reading' | 'Writing' | 'Speaking'>('Overall')

  return (
    <div className="detailed-stats-root">
      {/* 1. TOP LINE CHART: Biểu đồ thời gian học */}
      <section className="detailed-chart-card">
        <div className="chart-header-row">
          <div>
            <h3 className="chart-title">Biểu đồ thời gian học</h3>
            <span className="chart-date-subtitle">Từ 01/9/2026 đến 7/9/2026</span>
          </div>

          <div className="chart-controls-right">
            <div className="chart-legend">
              <span className="legend-item"><span className="legend-line blue" /> Thực tế</span>
              <span className="legend-item"><span className="legend-line orange-dash" /> Kế hoạch</span>
            </div>

            <div className="chart-filter-pills">
              <button
                type="button"
                className={`filter-pill ${timeFilter === 'week' ? 'active' : ''}`}
                onClick={() => setTimeFilter('week')}
              >
                Tuần
              </button>
              <button
                type="button"
                className={`filter-pill ${timeFilter === 'month' ? 'active' : ''}`}
                onClick={() => setTimeFilter('month')}
              >
                Tháng
              </button>
              <button
                type="button"
                className={`filter-pill ${timeFilter === 'course' ? 'active' : ''}`}
                onClick={() => setTimeFilter('course')}
              >
                Khoá
              </button>
            </div>
          </div>
        </div>

        {/* SVG Time Chart */}
        <div className="chart-svg-wrapper">
          <svg viewBox="0 0 800 120" className="time-chart-svg">
            {/* Target dashed line */}
            <line x1="40" y1="45" x2="760" y2="45" stroke="#f97316" strokeWidth="2" strokeDasharray="6 4" />
            {/* Actual line */}
            <path
              d="M 50 60 Q 150 55, 250 50 T 450 35 T 600 55 T 750 48"
              fill="none"
              stroke="#2563eb"
              strokeWidth="3"
            />
            {/* Points */}
            <circle cx="50" cy="60" r="4.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
            <circle cx="170" cy="53" r="4.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
            <circle cx="290" cy="50" r="4.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
            <circle cx="410" cy="38" r="4.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
            <circle cx="530" cy="55" r="4.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
            <circle cx="650" cy="46" r="4.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
            <circle cx="750" cy="48" r="4.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
          </svg>
          <div className="chart-days-axis">
            <span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span>
          </div>
        </div>
      </section>

      {/* 2. ROW 2: Tiến Độ 4 Kỹ Năng & You're moving forward */}
      <div className="detailed-two-cols-row">
        {/* Left: Tiến Độ 4 Kỹ Năng */}
        <section className="detailed-skills-card">
          <div className="flex items-center justify-between mb-1">
            <h3 className="section-title-bold">Tiến Độ 4 Kỹ Năng</h3>
            <button type="button" className="text-xs text-blue-600 font-semibold hover:underline">
              Chi tiết &gt;
            </button>
          </div>
          <p className="text-xs text-slate-400 mb-3">AI đánh giá so với kế hoạch lộ trình</p>

          <div className="skills-radar-and-bars">
            {/* Radar diagram */}
            <div className="radar-diagram-box">
              <svg viewBox="0 0 160 160" className="radar-svg">
                <polygon points="80,10 150,80 80,150 10,80" fill="none" stroke="#e2e8f0" strokeWidth="1.5" />
                <polygon points="80,45 115,80 80,115 45,80" fill="none" stroke="#e2e8f0" strokeWidth="1" />
                <polygon points="80,25 130,80 80,135 60,80" fill="rgba(37, 99, 235, 0.2)" stroke="#2563eb" strokeWidth="2" />
                <text x="80" y="8" textAnchor="middle" fontSize="9" fill="#64748b">Listening</text>
                <text x="155" y="83" textAnchor="start" fontSize="9" fill="#64748b">Reading</text>
                <text x="80" y="158" textAnchor="middle" fontSize="9" fill="#64748b">Writing</text>
                <text x="5" y="83" textAnchor="end" fontSize="9" fill="#64748b">Speaking</text>
              </svg>
            </div>

            {/* Bars List */}
            <div className="skills-bars-list">
              {MOCK_SKILL_PROGRESS.map((sp) => (
                <div key={sp.skill} className="skill-bar-row">
                  <span className="skill-row-name">{sp.skill}</span>
                  <div className="skill-track-line">
                    <div
                      className={`skill-fill-line fill-${sp.statusType}`}
                      style={{ width: `${sp.percent}%` }}
                    />
                  </div>
                  <strong className="skill-percent-text">{sp.percent}%</strong>
                  <span className={`skill-status-tag tag-${sp.statusType}`}>
                    {sp.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Recommendation box */}
          <div className="ai-feedback-banner">
            <p className="text-xs text-slate-700 leading-relaxed">
              <strong>AI nhận xét:</strong> Bạn đang làm rất tốt ở Reading (80%) và giữ
              phong độ ổn định với Listening (62%). Tuy nhiên, Writing (48%) và đặc biệt là
              Speaking (20%) đang tụt lại khá xa so với lộ trình. Để tránh nguy cơ lệch
              mục tiêu chung, hãy dành ít nhất 60% thời gian học tuần tới tập trung trả lời
              câu hỏi Speaking.
            </p>
          </div>
        </section>

        {/* Right: You're moving forward (Dark Blue Card) */}
        <section className="moving-forward-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="forward-title">You're moving forward</h3>
            <span className="band-increase-pill">+1.0 BAND <small>in 8 weeks</small></span>
          </div>

          {/* Tabs: Overall, Listening, Reading, Writing, Speaking */}
          <div className="forward-tabs-row">
            {(['Overall', 'Listening', 'Reading', 'Writing', 'Speaking'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                className={`forward-tab-pill ${selectedForwardSkill === tab ? 'active' : ''}`}
                onClick={() => setSelectedForwardSkill(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Line Chart */}
          <div className="forward-chart-wrapper">
            <svg viewBox="0 0 320 120" className="forward-svg">
              <line x1="20" y1="30" x2="300" y2="30" stroke="rgba(255, 255, 255, 0.25)" strokeDasharray="4 4" />
              <path
                d="M 20 95 L 75 95 L 140 80 L 210 75 L 290 60"
                fill="none"
                stroke="#60a5fa"
                strokeWidth="3"
              />
              <circle cx="20" cy="95" r="4" fill="#60a5fa" />
              <circle cx="75" cy="95" r="4" fill="#60a5fa" />
              <circle cx="140" cy="80" r="4" fill="#60a5fa" />
              <circle cx="210" cy="75" r="4" fill="#60a5fa" />
              <circle cx="290" cy="60" r="4" fill="#60a5fa" />
            </svg>
            <div className="forward-axis-dates">
              <span>20 Jun</span><span>03</span><span>28</span><span>05 Aug</span><span>12 Aug</span>
            </div>
          </div>

          {/* Bottom On Track summary */}
          <div className="forward-bottom-summary">
            <div>
              <span className="big-band-score">5.5</span>
              <span className="text-xs text-blue-200 ml-1">Latest (from 4.5 on 20 Jun)</span>
            </div>
            <div className="on-track-badge">
              <span className="status-dot green" />
              <span>On track: At your current pace, you're moving toward IELTS 6.5.</span>
            </div>
          </div>
        </section>
      </div>

      {/* 3. ROW 3: Từ Vựng Cần Ôn & Phản Hồi Từ Mentor */}
      <div className="detailed-two-cols-row">
        {/* Left: Từ Vựng Cần Ôn */}
        <section className="vocabulary-review-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-title-bold">Từ Vựng Cần Ôn</h3>
            <button type="button" className="text-xs text-blue-600 font-semibold hover:underline">
              Chi tiết &gt;
            </button>
          </div>

          <div className="vocabulary-content-row">
            {/* Donut Chart */}
            <div className="donut-chart-box">
              <svg viewBox="0 0 100 100" className="donut-svg">
                <circle cx="50" cy="50" r="38" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="10"
                  strokeDasharray="238.7"
                  strokeDashoffset={238.7 * (1 - 0.34)}
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="donut-inner-text">
                <span className="donut-percent">34%</span>
              </div>
              <div className="donut-legend">
                <div className="text-xs"><span className="dot-green" /> Đã học: 110</div>
                <div className="text-xs"><span className="dot-gray" /> Chưa học: 142</div>
              </div>
              <button type="button" className="donut-action-btn">
                Ôn ngay ➔
              </button>
            </div>

            {/* Spaced Repetition Bubbles */}
            <div className="spaced-repetition-bubbles">
              <div className="bubble-item bubble-blue">
                <strong>12</strong>
                <small>Từ mới</small>
              </div>
              <div className="bubble-item bubble-green">
                <strong>25</strong>
                <small>Ôn lần 1</small>
              </div>
              <div className="bubble-item bubble-yellow">
                <strong>34</strong>
                <small>Ôn lần 2</small>
              </div>
              <div className="bubble-item bubble-orange">
                <strong>20</strong>
                <small>Ôn lần 3</small>
              </div>
              <div className="bubble-item bubble-purple">
                <strong>110</strong>
                <small>Đã thuộc</small>
              </div>
            </div>
          </div>
        </section>

        {/* Right: Phản Hồi Từ Mentor */}
        <section className="mentor-feedback-card">
          <h3 className="section-title-bold mb-3">Phản Hồi Từ Mentor</h3>

          <div className="mentor-feedback-item">
            <div className="flex items-center gap-2 mb-2">
              <div className="mentor-badge-circle">M</div>
              <strong className="text-sm text-slate-800">Ms. Lan</strong>
              <span className="mentor-skill-tag">Speaking</span>
            </div>

            <p className="mentor-feedback-body">
              Phát âm của em tuần này đã có sự cải thiện vô cùng rõ rệt! Điểm sáng lớn
              nhất nằm ở độ tròn và rõ của các âm cuối (ending sounds), cùng khả năng
              kiểm soát luồng hơi tốt hơn hẳn so với tuần trước. Những đoạn câu dài không
              còn bị đứt đoạn hay hụt hơi, và quan trọng nhất là ngữ điệu (intonation) đã
              bắt đầu có sự tự nhiên.
            </p>

            <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
              <span>Updated: 11 Aug 2026</span>
              <button type="button" className="text-blue-600 font-bold hover:underline">
                View Feedback &gt;
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* 4. ROW 4: Các Khoá Học Của Tôi */}
      <section className="my-courses-card">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h3 className="courses-title">Các Khoá Học Của Tôi</h3>
            <p className="courses-sub">Tất cả khoá đang theo học</p>
          </div>
          <button type="button" className="text-xs text-blue-200 hover:text-white font-semibold">
            Xem tất cả &gt;
          </button>
        </div>

        <div className="courses-cards-grid">
          {MOCK_MY_COURSES.map((course) => (
            <div key={course.id} className="course-card-item">
              <div className="flex items-center justify-between mb-1">
                <h4 className="course-title-text">{course.title}</h4>
                <span className="course-level-pill">{course.badgeText}</span>
              </div>
              <p className="course-sub-text">{course.subtitle}</p>
              <div className="course-progress-track">
                <div
                  className="course-progress-fill"
                  style={{ width: `${course.progressPercent}%` }}
                />
              </div>
              <div className="course-progress-footer">
                <span>{course.progressText}</span>
                <strong>{course.progressPercent}%</strong>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
