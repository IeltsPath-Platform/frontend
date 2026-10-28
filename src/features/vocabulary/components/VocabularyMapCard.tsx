import { Link } from 'react-router-dom'
import { BarChart3, ArrowRight } from 'lucide-react'
import type { VocabularyMapResponse } from '../api/notebookApi'

interface VocabularyMapCardProps {
  mapData: VocabularyMapResponse | null
  loading?: boolean
}

export function VocabularyMapCard({ mapData }: VocabularyMapCardProps) {
  const bands = mapData?.bands || []
  const currentBand = mapData?.currentBand
  const suggestedBand = mapData?.suggestedBand

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '1.25rem',
        padding: '1.5rem',
        boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <BarChart3 size={20} style={{ color: '#2563eb' }} aria-hidden="true" />
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              Bản đồ từ vựng 6 cấp độ (A1 – C2)
            </h3>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
              Phân bố độ phủ từ vựng tiếng Anh theo khung tham chiếu Châu Âu (CEFR)
            </p>
          </div>
        </div>

        <Link
          to="/vocabulary/map"
          style={{
            fontSize: '0.825rem',
            fontWeight: 700,
            color: '#2563eb',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
          }}
        >
          Xem chi tiết bản đồ
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      {/* 4 Color Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', fontSize: '0.75rem', color: '#475569' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#16a34a' }} />
          <span>Đã học</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#2563eb' }} />
          <span>Đang ôn</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#ea580c' }} />
          <span>Cần ôn lại</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#e2e8f0' }} />
          <span>Chưa học</span>
        </div>
      </div>

      {/* 6 Stacked Columns */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '0.75rem',
          alignItems: 'end',
          minHeight: '180px',
          paddingTop: '1.5rem',
        }}
      >
        {bands.map((b) => {
          const isCurrent = currentBand === b.cefr || currentBand === b.band
          const isSuggested = suggestedBand === b.cefr || suggestedBand === b.band

          const total = Math.max(1, b.total)
          const pLearned = (b.learned / total) * 100
          const pLearning = (b.learning / total) * 100
          const pNeedsReview = (b.needsReview / total) * 100
          const pNotLearned = Math.max(0, 100 - pLearned - pLearning - pNeedsReview)

          return (
            <div
              key={b.cefr}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                position: 'relative',
              }}
            >
              {/* Badge for Current / Suggested */}
              {isCurrent && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-1.75rem',
                    background: '#1e40af',
                    color: '#ffffff',
                    fontSize: '0.625rem',
                    fontWeight: 800,
                    padding: '0.15rem 0.4rem',
                    borderRadius: '999px',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 4px rgba(30,64,175,0.2)',
                  }}
                >
                  Hiện tại
                </span>
              )}
              {!isCurrent && isSuggested && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-1.75rem',
                    background: '#ea580c',
                    color: '#ffffff',
                    fontSize: '0.625rem',
                    fontWeight: 800,
                    padding: '0.15rem 0.4rem',
                    borderRadius: '999px',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 4px rgba(234,88,12,0.2)',
                  }}
                >
                  Cần bổ sung
                </span>
              )}

              {/* Stacked bar */}
              <div
                style={{
                  width: '100%',
                  maxWidth: '44px',
                  height: '130px',
                  background: '#f1f5f9',
                  borderRadius: '0.5rem',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column-reverse',
                  border: isCurrent ? '2px solid #2563eb' : isSuggested ? '2px solid #f97316' : '1px solid #cbd5e1',
                }}
                title={`${b.cefr}: Đã học ${b.learned}, Đang ôn ${b.learning}, Cần ôn ${b.needsReview}, Chưa học ${b.notLearned} (Tổng: ${b.total})`}
              >
                <div style={{ height: `${pLearned}%`, background: '#16a34a' }} />
                <div style={{ height: `${pLearning}%`, background: '#2563eb' }} />
                <div style={{ height: `${pNeedsReview}%`, background: '#ea580c' }} />
                <div style={{ height: `${pNotLearned}%`, background: '#e2e8f0' }} />
              </div>

              {/* CEFR level label */}
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                  {b.cefr}
                </span>
                <span style={{ display: 'block', fontSize: '0.675rem', color: '#64748b' }}>
                  {b.total} từ
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
