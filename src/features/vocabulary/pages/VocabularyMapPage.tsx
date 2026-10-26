import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, RotateCcw } from 'lucide-react'
import { SiteNavbar } from '@/components/SiteNavbar'
import { notebookApi, type VocabularyMapResponse, type LearningReportResponse } from '../api/notebookApi'
import { bandToCefr } from '../lib/understanding'
import '../vocabulary.css'
import '../vocabulary-notebook.css'

export function VocabularyMapPage() {
  const [mapData, setMapData] = useState<VocabularyMapResponse | null>(null)
  const [report, setReport] = useState<LearningReportResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    notebookApi
      .getLearningReport(controller.signal)
      .then((rep) => {
        setReport(rep)
        const cefr = bandToCefr(rep.estimatedBand)
        return notebookApi.getVocabularyMap(cefr, controller.signal)
      })
      .catch(() => notebookApi.getVocabularyMap(undefined, controller.signal))
      .then((data) => {
        setMapData(data)
        setError(null)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setError('Không thể tải bản đồ từ vựng. Vui lòng thử lại.')
        }
      })
      .finally(() => {
        setLoading(false)
      })

    return () => controller.abort()
  }, [])

  const bands = mapData?.bands || []
  const currentBand = mapData?.currentBand
  const suggestedBand = mapData?.suggestedBand

  return (
    <div className="dictionary-page">
      <SiteNavbar />

      <main className="vocab-container" style={{ paddingBottom: '5rem' }}>
        {/* Hero Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #123ab5 0%, #1e40af 100%)',
            borderRadius: '1.25rem',
            color: '#ffffff',
            padding: '2.5rem 2rem',
            marginBottom: '2rem',
            boxShadow: '0 8px 24px rgba(18, 58, 181, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <span
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                fontSize: '0.75rem',
                fontWeight: 800,
                padding: '0.2rem 0.6rem',
                borderRadius: '999px',
                textTransform: 'uppercase',
              }}
            >
              VOCABULARY MATRIX
            </span>
            {report?.estimatedBand && (
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '999px',
                }}
              >
                Ước lượng IELTS Band ~{report.estimatedBand.toFixed(1)}
              </span>
            )}
          </div>

          <h1 style={{ margin: '0 0 0.75rem', fontSize: '2rem', fontWeight: 900, color: '#ffffff' }}>
            Bản đồ từ vựng 6 cấp độ (CEFR A1 – C2)
          </h1>
          <p style={{ margin: 0, fontSize: '1rem', color: '#e2e8f0', maxWidth: '640px', lineHeight: 1.5 }}>
            Theo dõi sự phân bố vốn từ vựng học thuật của bạn qua từng bậc chuẩn Châu Âu, xác định điểm mạnh và các lỗ hổng từ vựng cần bổ sung cho kỳ thi IELTS.
          </p>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748b' }}>
            <RotateCcw size={32} className="animate-spin" style={{ color: '#2563eb', margin: '0 auto 1rem' }} />
            <p style={{ fontWeight: 600 }}>Đang phân tích dữ liệu bản đồ từ vựng…</p>
          </div>
        )}

        {error && (
          <div
            style={{
              padding: '2rem',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '1rem',
              color: '#991b1b',
              textAlign: 'center',
            }}
          >
            <p style={{ fontWeight: 700, margin: '0 0 1rem' }}>{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                background: '#dc2626',
                color: 'white',
                border: 'none',
                padding: '0.6rem 1.25rem',
                borderRadius: '0.5rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Thử lại
            </button>
          </div>
        )}

        {!loading && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Color Legend & Summary Info */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '1rem',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#16a34a' }} />
                  <span style={{ fontWeight: 600, color: '#334155' }}>Đã thuộc vững</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#2563eb' }} />
                  <span style={{ fontWeight: 600, color: '#334155' }}>Đang ghi nhớ</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#ea580c' }} />
                  <span style={{ fontWeight: 600, color: '#334155' }}>Cần ôn lại</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#e2e8f0' }} />
                  <span style={{ fontWeight: 600, color: '#64748b' }}>Chưa học</span>
                </div>
              </div>

              {currentBand && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <span style={{ color: '#64748b' }}>Trình độ hiện tại:</span>
                  <span
                    style={{
                      background: '#1e40af',
                      color: 'white',
                      fontWeight: 800,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '999px',
                    }}
                  >
                    CEFR {currentBand}
                  </span>
                </div>
              )}
            </div>

            {/* Detailed Cards for Each Band A1..C2 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {bands.map((b) => {
                const isCurrent = currentBand === b.cefr || currentBand === b.band
                const isSuggested = suggestedBand === b.cefr || suggestedBand === b.band

                const total = Math.max(1, b.total)
                const percentMastered = Math.round((b.learned / total) * 100)

                return (
                  <div
                    key={b.cefr}
                    style={{
                      background: '#ffffff',
                      border: isCurrent
                        ? '2px solid #2563eb'
                        : isSuggested
                        ? '2px solid #ea580c'
                        : '1px solid #e2e8f0',
                      borderRadius: '1.25rem',
                      padding: '1.5rem',
                      boxShadow: isCurrent
                        ? '0 6px 20px rgba(37,99,235,0.12)'
                        : '0 4px 16px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                    }}
                  >
                    {/* Top tags */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>
                              {b.cefr}
                            </h2>
                            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                              ({b.total} từ)
                            </span>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {b.cefr === 'A1'
                              ? 'Sơ cấp (Beginner)'
                              : b.cefr === 'A2'
                              ? 'Tiền trung cấp (Elementary)'
                              : b.cefr === 'B1'
                              ? 'Trung cấp (Intermediate)'
                              : b.cefr === 'B2'
                              ? 'Trung cao cấp (Upper Intermediate)'
                              : b.cefr === 'C1'
                              ? 'Cao cấp (Advanced)'
                              : 'Thành thạo (Proficiency)'}
                          </span>
                        </div>

                        {isCurrent && (
                          <span
                            style={{
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              color: '#1d4ed8',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              padding: '0.2rem 0.6rem',
                              borderRadius: '999px',
                            }}
                          >
                            Trình độ hiện tại
                          </span>
                        )}

                        {!isCurrent && isSuggested && (
                          <span
                            style={{
                              background: '#fff7ed',
                              border: '1px solid #fed7aa',
                              color: '#c2410c',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              padding: '0.2rem 0.6rem',
                              borderRadius: '999px',
                            }}
                          >
                            Mục tiêu tiếp theo
                          </span>
                        )}
                      </div>

                      {/* Stacked Progress Bar */}
                      <div style={{ margin: '1rem 0 0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                          <span style={{ color: '#475569', fontWeight: 600 }}>Độ phủ: {b.learned + b.learning} / {b.total}</span>
                          <span style={{ fontWeight: 800, color: '#2563eb' }}>{percentMastered}% đã thuộc</span>
                        </div>

                        <div
                          style={{
                            height: '10px',
                            background: '#f1f5f9',
                            borderRadius: '999px',
                            overflow: 'hidden',
                            display: 'flex',
                          }}
                        >
                          <div style={{ width: `${(b.learned / total) * 100}%`, background: '#16a34a' }} />
                          <div style={{ width: `${(b.learning / total) * 100}%`, background: '#2563eb' }} />
                          <div style={{ width: `${(b.needsReview / total) * 100}%`, background: '#ea580c' }} />
                          <div style={{ width: `${(b.notLearned / total) * 100}%`, background: '#e2e8f0' }} />
                        </div>
                      </div>

                      {/* 4 Numbers Breakdown */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, 1fr)',
                          gap: '0.5rem',
                          margin: '1rem 0',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ background: '#f0fdf4', padding: '0.5rem 0.25rem', borderRadius: '0.5rem' }}>
                          <span style={{ display: 'block', fontSize: '0.95rem', fontWeight: 800, color: '#166534' }}>
                            {b.learned}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: '#15803d', fontWeight: 600 }}>Đã học</span>
                        </div>

                        <div style={{ background: '#eff6ff', padding: '0.5rem 0.25rem', borderRadius: '0.5rem' }}>
                          <span style={{ display: 'block', fontSize: '0.95rem', fontWeight: 800, color: '#1d4ed8' }}>
                            {b.learning}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: '#1e40af', fontWeight: 600 }}>Đang học</span>
                        </div>

                        <div style={{ background: '#fff7ed', padding: '0.5rem 0.25rem', borderRadius: '0.5rem' }}>
                          <span style={{ display: 'block', fontSize: '0.95rem', fontWeight: 800, color: '#c2410c' }}>
                            {b.needsReview}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: '#9a3412', fontWeight: 600 }}>Cần ôn</span>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '0.5rem 0.25rem', borderRadius: '0.5rem' }}>
                          <span style={{ display: 'block', fontSize: '0.95rem', fontWeight: 800, color: '#64748b' }}>
                            {b.notLearned}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>Chưa học</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Link */}
                    <div style={{ paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                      <Link
                        to={`/vocabulary?cefr=${b.cefr}`}
                        style={{
                          fontSize: '0.825rem',
                          fontWeight: 700,
                          color: '#2563eb',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        Khám phá từ vựng {b.cefr}
                        <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
