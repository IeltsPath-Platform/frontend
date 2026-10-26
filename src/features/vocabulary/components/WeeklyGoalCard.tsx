import { useState } from 'react'
import { Target, CheckCircle2, Circle, Edit2, Check, X } from 'lucide-react'
import { notebookApi, type WeeklyGoalResponse } from '../api/notebookApi'
import { useToast } from '@/components/toast/toastContext'

interface WeeklyGoalCardProps {
  initialGoal?: WeeklyGoalResponse | null
  onGoalUpdated?: (updated: WeeklyGoalResponse) => void
}

const WEEKDAY_NAMES: Record<string, string> = {
  MONDAY: 'T2',
  TUESDAY: 'T3',
  WEDNESDAY: 'T4',
  THURSDAY: 'T5',
  FRIDAY: 'T6',
  SATURDAY: 'T7',
  SUNDAY: 'CN',
}

export function WeeklyGoalCard({ initialGoal, onGoalUpdated }: WeeklyGoalCardProps) {
  const { toast } = useToast()
  const [goal, setGoal] = useState<WeeklyGoalResponse | null>(initialGoal ?? null)
  const [isEditing, setIsEditing] = useState(false)
  const [targetInput, setTargetInput] = useState<string>(String(initialGoal?.target ?? 120))
  const [updating, setUpdating] = useState(false)

  // Sync if prop changes
  if (initialGoal && !goal) {
    setGoal(initialGoal)
  }

  const target = goal?.target ?? 120
  const progress = goal?.progress ?? 0
  const percent = target > 0 ? Math.min(100, Math.round((progress / target) * 100)) : 0
  const remaining = Math.max(0, target - progress)

  const handleSaveTarget = async () => {
    const num = parseInt(targetInput, 10)
    if (isNaN(num) || num < 10 || num > 1000) {
      toast({
        title: 'Mục tiêu không hợp lệ',
        description: 'Mục tiêu từ vựng hàng tuần phải nằm trong khoảng từ 10 đến 1000 từ.',
        tone: 'error',
      })
      return
    }

    setUpdating(true)
    try {
      const updated = await notebookApi.updateWeeklyGoal(num)
      setGoal(updated)
      setIsEditing(false)
      if (onGoalUpdated) onGoalUpdated(updated)
      toast({
        title: 'Đã cập nhật mục tiêu',
        description: `Mục tiêu mới: ${num} từ vựng mỗi tuần.`,
        tone: 'success',
      })
    } catch {
      toast({
        title: 'Cập nhật thất bại',
        description: 'Không thể cập nhật mục tiêu tuần. Vui lòng thử lại.',
        tone: 'error',
      })
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '1.25rem',
        padding: '1.25rem',
        boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Target size={20} style={{ color: '#2563eb' }} aria-hidden="true" />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
            Mục tiêu tuần
          </h3>
        </div>

        {isEditing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <input
              type="number"
              min={10}
              max={1000}
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              style={{
                width: '70px',
                padding: '0.2rem 0.4rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                border: '1px solid #94a3b8',
                borderRadius: '0.35rem',
                textAlign: 'center',
              }}
              aria-label="Nhập mục tiêu số từ"
            />
            <button
              type="button"
              onClick={handleSaveTarget}
              disabled={updating}
              style={{
                background: '#16a34a',
                color: 'white',
                border: 'none',
                borderRadius: '0.35rem',
                padding: '0.3rem',
                cursor: 'pointer',
              }}
              title="Lưu"
              aria-label="Lưu mục tiêu"
            >
              <Check size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false)
                setTargetInput(String(target))
              }}
              style={{
                background: '#e2e8f0',
                color: '#475569',
                border: 'none',
                borderRadius: '0.35rem',
                padding: '0.3rem',
                cursor: 'pointer',
              }}
              title="Hủy"
              aria-label="Hủy chỉnh sửa"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setTargetInput(String(target))
              setIsEditing(true)
            }}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.25rem 0.6rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#334155',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
            title="Bấm để chỉnh sửa mục tiêu từ vựng hàng tuần"
          >
            <Edit2 size={12} aria-hidden="true" />
            {target} từ/tuần
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', marginBottom: '0.35rem' }}>
          <span style={{ color: '#64748b' }}>
            Đã học: <strong style={{ color: '#0f172a' }}>{progress}</strong> / {target} từ
          </span>
          <span style={{ fontWeight: 800, color: '#2563eb' }}>{percent}%</span>
        </div>
        <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${percent}%`,
              background: '#2563eb',
              borderRadius: '999px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <p style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
          {remaining > 0 ? `Còn ${remaining} từ nữa để hoàn thành mục tiêu tuần này!` : '🎉 Tuyệt vời! Bạn đã đạt mục tiêu tuần!'}
        </p>
      </div>

      {/* 7 Days tracker T2..CN */}
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.35rem', textAlign: 'center' }}>
          {(goal?.days || []).map((day, idx) => {
            const shortName = WEEKDAY_NAMES[day.weekday] || day.weekday.slice(0, 2)
            return (
              <div
                key={day.date || idx}
                style={{
                  background: day.achieved ? '#f0fdf4' : '#f8fafc',
                  border: `1px solid ${day.achieved ? '#86efac' : '#e2e8f0'}`,
                  borderRadius: '0.5rem',
                  padding: '0.4rem 0.2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.2rem',
                }}
              >
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: day.achieved ? '#166534' : '#64748b',
                  }}
                >
                  {shortName}
                </span>
                {day.achieved ? (
                  <CheckCircle2 size={16} style={{ color: '#16a34a' }} aria-hidden="true" />
                ) : (
                  <Circle size={16} style={{ color: '#cbd5e1' }} aria-hidden="true" />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
