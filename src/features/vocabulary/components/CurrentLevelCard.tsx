import { Link, useNavigate } from 'react-router-dom'
import { Award, BookOpen, Flame, RotateCcw, ArrowRight } from 'lucide-react'
import { bandToCefr } from '../lib/understanding'
import type { NotebookSummaryResponse, LearningReportResponse } from '../api/notebookApi'

interface CurrentLevelCardProps {
  summary: NotebookSummaryResponse | null
  report: LearningReportResponse | null
  loading?: boolean
}

export function CurrentLevelCard({ summary, report, loading }: CurrentLevelCardProps) {
  const navigate = useNavigate()

  const band = report?.estimatedBand
  const cefr = bandToCefr(band)
  const isPlacementDone = report?.placementCompleted ?? false

  const handleRetest = () => {
    if (isPlacementDone) {
      navigate('/learn/progress')
    } else {
      navigate('/learn/placement')
    }
  }

  const mastered = summary?.masteredCount ?? summary?.byLevel?.MASTERED ?? 0
  const learning =
    summary?.learningCount ??
    ((summary?.byLevel?.FAMILIAR ?? 0) + (summary?.byLevel?.LEARNING ?? 0))
  const due = summary?.dueNow ?? 0

  const totalCatalog = summary?.catalogTotal ?? 3000
  const learnedTotal = summary?.learnedCount ?? (mastered + learning)
  const progressPercent = totalCatalog > 0 ? Math.min(100, Math.round((learnedTotal / totalCatalog) * 100)) : 0

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)',
        border: '1px solid #dbeafe',
        borderRadius: '1.25rem',
        padding: '1.5rem',
        boxShadow: '0 4px 20px rgba(37, 99, 235, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}
    >
      {/* Top row: Trình độ hiện tại + Nút test lại */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid #edf2f7',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '0.85rem',
              background: '#eff6ff',
              border: '2px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1d4ed8',
              fontWeight: 900,
              fontSize: '1.15rem',
            }}
          >
            {cefr}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 800 }}>
                Trình độ hiện tại
              </span>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '0.1rem 0.45rem',
                  borderRadius: '999px',
                  background: '#dbeafe',
                  color: '#1e40af',
                }}
              >
                {band ? `IELTS Band ~${band.toFixed(1)}` : 'Dự kiến'}
              </span>
            </div>
            <h3 style={{ margin: '0.15rem 0 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              CEFR {cefr} • IELTS Pathway
            </h3>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={handleRetest}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              padding: '0.45rem 0.9rem',
              borderRadius: '0.65rem',
              fontWeight: 700,
              fontSize: '0.825rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.15s ease',
            }}
            title={isPlacementDone ? 'Xem báo cáo năng lực chi tiết' : 'Làm bài kiểm tra đầu vào'}
          >
            <RotateCcw size={14} aria-hidden="true" />
            {isPlacementDone ? 'Báo cáo năng lực' : 'Test đầu vào'}
          </button>
        </div>
      </div>

      {/* Learned progress bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
          <span style={{ fontWeight: 700, color: '#1e293b' }}>
            Tiến độ học: {learnedTotal} / {totalCatalog} từ
          </span>
          <span style={{ fontWeight: 800, color: '#2563eb' }}>{progressPercent}%</span>
        </div>
        <div
          style={{
            height: '10px',
            background: '#e2e8f0',
            borderRadius: '999px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPercent}%`,
              background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
              borderRadius: '999px',
              transition: 'width 0.4s ease-out',
            }}
          />
        </div>
      </div>

      {/* 3 Stats Counters */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.75rem',
        }}
      >
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '0.85rem',
            padding: '0.85rem',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Award size={14} aria-hidden="true" /> Đã thành thạo
          </span>
          <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#166534', marginTop: '0.2rem' }}>
            {loading ? '…' : mastered}
          </span>
        </div>

        <div
          style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '0.85rem',
            padding: '0.85rem',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <BookOpen size={14} aria-hidden="true" /> Đang học
          </span>
          <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1e40af', marginTop: '0.2rem' }}>
            {loading ? '…' : learning}
          </span>
        </div>

        <div
          style={{
            background: due > 0 ? '#fff7ed' : '#f8fafc',
            border: `1px solid ${due > 0 ? '#fed7aa' : '#e2e8f0'}`,
            borderRadius: '0.85rem',
            padding: '0.85rem',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: due > 0 ? '#c2410c' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <Flame size={14} aria-hidden="true" /> Cần ôn lại
          </span>
          <span
            style={{
              fontSize: '1.4rem',
              fontWeight: 900,
              color: due > 0 ? '#9a3412' : '#334155',
              marginTop: '0.2rem',
            }}
          >
            {loading ? '…' : due}
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Link
          to="/vocabulary/notebook"
          style={{
            flex: 1,
            minWidth: '140px',
            background: '#123ab5',
            color: '#ffffff',
            padding: '0.65rem 1rem',
            borderRadius: '0.65rem',
            fontWeight: 700,
            fontSize: '0.85rem',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            boxShadow: '0 2px 8px rgba(18, 58, 181, 0.25)',
          }}
        >
          Tiếp tục học
          <ArrowRight size={16} aria-hidden="true" />
        </Link>

        {due > 0 && (
          <Link
            to="/vocabulary/notebook/review?due=true"
            style={{
              background: '#ff7624',
              color: '#ffffff',
              padding: '0.65rem 1rem',
              borderRadius: '0.65rem',
              fontWeight: 700,
              fontSize: '0.85rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 8px rgba(255, 118, 36, 0.25)',
            }}
          >
            <Flame size={16} aria-hidden="true" />
            Ôn từ cần nhớ ({due})
          </Link>
        )}
      </div>
    </div>
  )
}

