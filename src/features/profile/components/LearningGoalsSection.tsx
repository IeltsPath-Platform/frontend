import React, { useState } from 'react'
import { Target, Trophy, Calendar, Clock, Plus, Pause, Play, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import type { LearningGoal } from '../api/profileApi'
import { Button } from '@/components/ui/button'

interface LearningGoalsSectionProps {
  activeGoal: LearningGoal | null
  goals: LearningGoal[]
  onCreateGoal: (targetBand: number, examDate?: string | null, minutes?: number) => Promise<unknown>
  onUpdateStatus: (goalId: string, status: 'ACTIVE' | 'PAUSED' | 'ACHIEVED' | 'ABANDONED') => Promise<unknown>
  onShowToast: (message: string, tone?: 'success' | 'error' | 'info') => void
}

function calculateDaysRemaining(examDateStr?: string | null): number | null {
  if (!examDateStr) return null
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const target = new Date(examDateStr)
    target.setHours(0, 0, 0, 0)
    const diffTime = target.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : 0
  } catch {
    return null
  }
}

function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return 'Chưa ấn định'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('vi-VN', { year: 'numeric', month: 'numeric', day: 'numeric' })
  } catch {
    return dateStr
  }
}

function getTomorrowDateString(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().split('T')[0]
}

export const LearningGoalsSection: React.FC<LearningGoalsSectionProps> = ({
  activeGoal,
  goals,
  onCreateGoal,
  onUpdateStatus,
  onShowToast,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [targetBand, setTargetBand] = useState<number>(6.5)
  const [examDate, setExamDate] = useState<string>('')
  const [minutesPerDay, setMinutesPerDay] = useState<number>(30)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [updatingGoalId, setUpdatingGoalId] = useState<string | null>(null)

  const daysRemaining = calculateDaysRemaining(activeGoal?.examDate)

  // Past goals list (excluding current active goal)
  const pastGoals = goals.filter((g) => g.id !== activeGoal?.id)

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (targetBand < 1.0 || targetBand > 9.0) {
      onShowToast('Mục tiêu band điểm phải từ 1.0 đến 9.0', 'error')
      return
    }
    if (minutesPerDay < 5) {
      onShowToast('Thời gian học mỗi ngày tối thiểu 5 phút', 'error')
      return
    }

    setIsSubmitting(true)
    try {
      await onCreateGoal(targetBand, examDate.trim() || null, minutesPerDay)
      setShowCreateForm(false)
      onShowToast('Thiết lập mục tiêu học tập thành công!', 'success')
      // Reset form
      setTargetBand(6.5)
      setExamDate('')
      setMinutesPerDay(30)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi tạo mục tiêu.'
      onShowToast(msg, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStatusChange = async (goalId: string, nextStatus: 'ACTIVE' | 'PAUSED' | 'ACHIEVED' | 'ABANDONED') => {
    setUpdatingGoalId(goalId)
    try {
      await onUpdateStatus(goalId, nextStatus)
      const labels: Record<string, string> = {
        ACTIVE: 'Đã tiếp tục mục tiêu học tập',
        PAUSED: 'Đã tạm dừng mục tiêu học tập',
        ACHIEVED: 'Chúc mừng bạn đã hoàn thành mục tiêu!',
        ABANDONED: 'Đã hủy mục tiêu học tập',
      }
      onShowToast(labels[nextStatus] || 'Đã cập nhật trạng thái mục tiêu', 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Cập nhật trạng thái thất bại.'
      onShowToast(msg, 'error')
    } finally {
      setUpdatingGoalId(null)
    }
  }

  return (
    <section className="profile-section-card" aria-labelledby="learning-goals-title">
      <div className="profile-section-header">
        <div className="profile-section-title-wrap">
          <Target className="profile-section-icon" aria-hidden="true" size={20} />
          <div>
            <h2 id="learning-goals-title" className="profile-section-title">
              Mục tiêu học tập
            </h2>
            <p className="profile-section-subtitle">
              Theo dõi lộ trình luyện thi, ngày thi dự kiến và cam kết thời gian hàng ngày
            </p>
          </div>
        </div>

        {!showCreateForm && (
          <Button
            type="button"
            variant="outline"
            className="profile-create-goal-btn"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus size={16} aria-hidden="true" />
            <span>Mục tiêu mới</span>
          </Button>
        )}
      </div>

      {/* CREATE NEW GOAL FORM */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="profile-goal-create-box"
            onSubmit={handleCreateGoal}
          >
            <h3 className="profile-create-box-title">Thiết lập mục tiêu mới</h3>
            <div className="profile-goal-form-grid">
              <div className="profile-field-group">
                <label htmlFor="goal-targetBand" className="profile-field-label">
                  Band điểm mục tiêu (1.0 - 9.0) <span className="profile-required">*</span>
                </label>
                <div className="profile-slider-with-val">
                  <input
                    id="goal-targetBand"
                    type="range"
                    min={1.0}
                    max={9.0}
                    step={0.5}
                    value={targetBand}
                    onChange={(e) => setTargetBand(Number(e.target.value))}
                    className="profile-range-slider"
                  />
                  <span className="profile-band-val-badge">Band {Number(targetBand).toFixed(1)}</span>
                </div>
              </div>

              <div className="profile-field-group">
                <label htmlFor="goal-examDate" className="profile-field-label">
                  Ngày thi dự kiến (tùy chọn)
                </label>
                <input
                  id="goal-examDate"
                  type="date"
                  min={getTomorrowDateString()}
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="profile-input"
                />
              </div>

              <div className="profile-field-group">
                <label htmlFor="goal-minutes" className="profile-field-label">
                  Thời gian học mỗi ngày (phút) <span className="profile-required">*</span>
                </label>
                <input
                  id="goal-minutes"
                  type="number"
                  min={5}
                  max={480}
                  step={5}
                  value={minutesPerDay}
                  onChange={(e) => setMinutesPerDay(Number(e.target.value))}
                  className="profile-input"
                />
              </div>
            </div>

            <div className="profile-goal-create-actions">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCreateForm(false)}
                disabled={isSubmitting}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting} className="profile-goal-submit-btn">
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="profile-spinner" aria-hidden="true" />
                    Đang thiết lập…
                  </>
                ) : (
                  'Lưu mục tiêu'
                )}
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* ACTIVE GOAL CARD */}
      {activeGoal ? (
        <div className="profile-active-goal-card">
          <div className="profile-active-goal-header">
            <div className="profile-active-goal-band-box">
              <Trophy size={28} className="profile-active-goal-icon" aria-hidden="true" />
              <div>
                <span className="profile-active-goal-tag">Mục tiêu hiện tại</span>
                <div className="profile-active-goal-number">
                  IELTS {Number(activeGoal.targetBand).toFixed(1)}
                </div>
              </div>
            </div>

            <span className={`profile-goal-status-badge status-${activeGoal.status.toLowerCase()}`}>
              {activeGoal.status === 'ACTIVE'
                ? 'Đang hoạt động'
                : activeGoal.status === 'PAUSED'
                  ? 'Đang tạm dừng'
                  : activeGoal.status === 'ACHIEVED'
                    ? 'Đã đạt'
                    : 'Đã hủy'}
            </span>
          </div>

          <div className="profile-active-goal-details">
            <div className="profile-goal-detail-item">
              <Calendar size={18} aria-hidden="true" className="profile-detail-icon" />
              <div>
                <span className="profile-detail-label">Ngày thi dự kiến</span>
                <strong className="profile-detail-val">
                  {formatDateDisplay(activeGoal.examDate)}
                </strong>
                {daysRemaining !== null && (
                  <span className="profile-days-countdown">
                    {daysRemaining === 0 ? 'Đã đến ngày thi!' : `(Còn ${daysRemaining} ngày)`}
                  </span>
                )}
              </div>
            </div>

            <div className="profile-goal-detail-item">
              <Clock size={18} aria-hidden="true" className="profile-detail-icon" />
              <div>
                <span className="profile-detail-label">Thời gian cam kết</span>
                <strong className="profile-detail-val">
                  {activeGoal.availableMinutesPerDay} phút / ngày
                </strong>
              </div>
            </div>
          </div>

          {/* Goal Action Buttons */}
          <div className="profile-active-goal-actions">
            {activeGoal.status === 'ACTIVE' ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange(activeGoal.id, 'PAUSED')}
                disabled={updatingGoalId === activeGoal.id}
                className="profile-goal-btn"
              >
                <Pause size={14} aria-hidden="true" />
                <span>Tạm dừng</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange(activeGoal.id, 'ACTIVE')}
                disabled={updatingGoalId === activeGoal.id}
                className="profile-goal-btn"
              >
                <Play size={14} aria-hidden="true" />
                <span>Tiếp tục học</span>
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange(activeGoal.id, 'ACHIEVED')}
              disabled={updatingGoalId === activeGoal.id}
              className="profile-goal-btn btn-achieved"
            >
              <CheckCircle2 size={14} aria-hidden="true" />
              <span>Đánh dấu đã đạt</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleStatusChange(activeGoal.id, 'ABANDONED')}
              disabled={updatingGoalId === activeGoal.id}
              className="profile-goal-btn btn-abandon"
            >
              <XCircle size={14} aria-hidden="true" />
              <span>Hủy mục tiêu</span>
            </Button>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="profile-empty-goal-card">
          <Target size={40} className="profile-empty-icon" aria-hidden="true" />
          <h3 className="profile-empty-title">Chưa có mục tiêu học tập đang hoạt động</h3>
          <p className="profile-empty-desc">
            Thiết lập mục tiêu band điểm và ngày thi giúp hệ thống cá nhân hóa lộ trình và nhắc nhở ôn tập hiệu quả nhất.
          </p>
          {!showCreateForm && (
            <Button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="profile-empty-cta-btn"
            >
              <Plus size={16} aria-hidden="true" />
              Thiết lập mục tiêu ngay
            </Button>
          )}
        </div>
      )}

      {/* Past Goals History */}
      {pastGoals.length > 0 && (
        <div className="profile-past-goals-wrap">
          <h4 className="profile-past-goals-title">Lịch sử mục tiêu trước đây</h4>
          <div className="profile-past-goals-list">
            {pastGoals.map((g) => (
              <div key={g.id} className="profile-past-goal-item">
                <div className="profile-past-goal-info">
                  <strong>Band {Number(g.targetBand).toFixed(1)}</strong>
                  <span>Thi ngày: {formatDateDisplay(g.examDate)}</span>
                </div>
                <span className={`profile-goal-status-badge status-${g.status.toLowerCase()}`}>
                  {g.status === 'ACHIEVED'
                    ? 'Đã đạt'
                    : g.status === 'PAUSED'
                      ? 'Tạm dừng'
                      : 'Đã hủy'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

