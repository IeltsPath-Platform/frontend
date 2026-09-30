import React, { useState } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'
import type { StudyPlanItem, SpaceAutonomyNode } from '@/types/overview'

interface OverviewStudyPlanAndAutonomyProps {
  tasks: StudyPlanItem[]
  autonomyNodes: SpaceAutonomyNode[]
  onStartStudy?: () => void
}

export const OverviewStudyPlanAndAutonomy: React.FC<OverviewStudyPlanAndAutonomyProps> = ({
  tasks: initialTasks,
  autonomyNodes,
  onStartStudy,
}) => {
  const [tasks, setTasks] = useState(initialTasks)

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isCompleted: !t.isCompleted } : t))
    )
  }

  const completedCount = tasks.filter((t) => t.isCompleted).length

  return (
    <div className="plan-autonomy-grid">
      {/* Left Column: Study Plan */}
      <section className="study-plan-card">
        <div className="plan-header">
          <h3 className="plan-title">Study Plan</h3>
          <p className="plan-subtitle">Kế hoạch AI cá nhân hoá – Hôm nay, 25/08</p>
        </div>

        <div className="plan-meta-row">
          <span className="text-xs text-slate-500">
            Hôm nay: <strong className="text-slate-800">Tổng 120 phút</strong>
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-700">
              {completedCount}/{tasks.length}
            </span>
            <div className="plan-progress-mini">
              <div
                className="plan-progress-fill"
                style={{ width: `${(completedCount / tasks.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="plan-tasks-list">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`plan-task-item ${task.isCompleted ? 'completed' : ''}`}
              onClick={() => toggleTask(task.id)}
            >
              <button type="button" className="task-check-btn">
                {task.isCompleted ? (
                  <CheckCircle2 size={18} className="text-emerald-500 fill-emerald-100" />
                ) : (
                  <Circle size={18} className="text-slate-300" />
                )}
              </button>

              <span
                className="task-category-pill"
                style={{ color: task.categoryColor, borderColor: task.categoryColor }}
              >
                {task.category}
              </span>

              <span className="task-title-text">{task.title}</span>

              <span className="task-duration-badge">{task.durationMinutes} phút</span>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="plan-actions-footer">
          <button type="button" className="plan-view-all-btn">
            Xem tất cả các kế hoạch
          </button>
          <button
            type="button"
            className="plan-start-now-btn"
            onClick={onStartStudy}
          >
            Bắt đầu học ngay
          </button>
        </div>
      </section>

      {/* Right Column: SPACE Autonomy */}
      <section className="space-autonomy-card">
        <div className="autonomy-header">
          <h3 className="autonomy-title">SPACE Autonomy</h3>
          <p className="autonomy-subtitle">
            Thang 0: Dependent ➔ 3: Transfer – Cập nhật cuối module
          </p>
        </div>

        {/* Radar/Pentagon Hub */}
        <div className="autonomy-pentagon-wrapper">
          {/* Center Badge */}
          <div className="autonomy-center-badge">
            <span className="center-level-label">LEVEL</span>
            <strong className="center-level-score">2.6</strong>
            <span className="center-level-transfer">/ 3 Transfer</span>
          </div>

          {/* Pentagon Nodes */}
          <div className="pentagon-nodes-container">
            {autonomyNodes.map((n) => (
              <div key={n.letter} className={`autonomy-node-item node-${n.letter.toLowerCase()}`}>
                <div className="node-title-line">
                  <strong>{n.letter}</strong> – {n.title}
                </div>
                <div className="node-score-bars">
                  <span className="score-text">{n.scoreText} – {n.level}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendation box */}
        <div className="autonomy-recommendation-box">
          <p className="text-xs text-blue-900 leading-relaxed">
            <strong>Đề xuất:</strong> P và E đang thấp hơn các bước còn lại – hệ thống ưu
            tiên nhiệm vụ Probe và Eva-review trong 2 tuần tới.
          </p>
        </div>
      </section>
    </div>
  )
}
